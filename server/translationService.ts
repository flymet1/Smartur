import OpenAI from "openai";
import crypto from "crypto";

let openai: OpenAI | null = null;
try {
  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey) {
    openai = new OpenAI({ apiKey });
  }
} catch (err) {
  console.error("Translation service initialization error:", err);
}

interface CacheEntry {
  text: string;
  timestamp: number;
}

const translationCache = new Map<string, CacheEntry>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const MAX_CACHE_SIZE = 5000;

function getCacheKey(text: string, targetLang: string): string {
  const hash = crypto.createHash("sha256").update(text).digest("hex").substring(0, 16);
  return `${targetLang}:${hash}`;
}

function cleanExpiredCache() {
  const now = Date.now();
  const keysToDelete: string[] = [];
  translationCache.forEach((entry, key) => {
    if (now - entry.timestamp > CACHE_TTL) {
      keysToDelete.push(key);
    }
  });
  keysToDelete.forEach(key => translationCache.delete(key));
}

export async function translateText(text: string, targetLang: string): Promise<string> {
  if (!text || !text.trim()) return text;
  if (!openai) return text;
  
  const cacheKey = getCacheKey(text, targetLang);
  const cached = translationCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.text;
  }
  
  const langNames: Record<string, string> = {
    tr: "Turkish",
    en: "English",
    de: "German",
    ru: "Russian",
  };
  
  const targetLangName = langNames[targetLang] || "English";
  
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{
        role: 'user',
        content: `Translate the following text to ${targetLangName}. Return ONLY the translated text, no explanations or additional text. If the text contains HTML, preserve the HTML tags. If the text is already in ${targetLangName}, return it as is.

Text to translate:
${text}`
      }],
      temperature: 0.1,
      max_tokens: 2048
    });
    
    const translatedText = completion.choices[0]?.message?.content?.trim() || text;
    
    if (translationCache.size >= MAX_CACHE_SIZE) {
      cleanExpiredCache();
      if (translationCache.size >= MAX_CACHE_SIZE) {
        const firstKey = translationCache.keys().next().value;
        if (firstKey) translationCache.delete(firstKey);
      }
    }
    
    translationCache.set(cacheKey, { text: translatedText, timestamp: Date.now() });
    
    return translatedText;
  } catch (err) {
    console.error("Translation error:", err);
    return text;
  }
}

export async function translateField(value: any, targetLang: string): Promise<any> {
  if (typeof value === "string") {
    return translateText(value, targetLang);
  }
  if (Array.isArray(value)) {
    return Promise.all(value.map(v => translateField(v, targetLang)));
  }
  if (typeof value === "object" && value !== null) {
    const result: any = {};
    for (const key of Object.keys(value)) {
      result[key] = await translateField(value[key], targetLang);
    }
    return result;
  }
  return value;
}

export async function translateObject(obj: any, fields: string[], targetLang: string): Promise<any> {
  if (!obj || typeof obj !== 'object') return obj;
  
  const result = { ...obj };
  for (const field of fields) {
    if (result[field] && typeof result[field] === 'string') {
      result[field] = await translateText(result[field], targetLang);
    }
  }
  return result;
}

export async function translateArray(arr: any[], fields: string[], targetLang: string): Promise<any[]> {
  if (!Array.isArray(arr)) return arr;
  
  return Promise.all(arr.map(item => translateObject(item, fields, targetLang)));
}

export async function translateActivityToEnglish(activity: any): Promise<any> {
  if (!openai) return activity;
  
  const fieldsToTranslate = ['name', 'description', 'confirmationMessage', 'tourProgram'];
  const translated = { ...activity };
  
  for (const field of fieldsToTranslate) {
    if (translated[field]) {
      translated[field] = await translateText(translated[field], 'en');
    }
  }
  
  if (translated.faq && Array.isArray(translated.faq)) {
    translated.faq = await Promise.all(
      translated.faq.map(async (item: { question: string; answer: string }) => ({
        question: await translateText(item.question, 'en'),
        answer: await translateText(item.answer, 'en')
      }))
    );
  }
  
  return translated;
}

export function clearTranslationCache() {
  translationCache.clear();
}

export function getTranslationCacheStats() {
  cleanExpiredCache();
  return {
    size: translationCache.size,
    maxSize: MAX_CACHE_SIZE,
    ttlHours: CACHE_TTL / (60 * 60 * 1000)
  };
}
