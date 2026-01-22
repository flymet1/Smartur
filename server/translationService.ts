import { GoogleGenAI } from "@google/genai";
import crypto from "crypto";

let ai: GoogleGenAI | null = null;
try {
  const apiKey = process.env.AI_INTEGRATIONS_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  const baseUrl = process.env.AI_INTEGRATIONS_GEMINI_BASE_URL;
  
  if (apiKey) {
    const options: any = { apiKey };
    if (baseUrl) {
      options.httpOptions = {
        apiVersion: "",
        baseUrl: baseUrl,
      };
    }
    ai = new GoogleGenAI(options);
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
  if (!ai) return text;
  
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
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{
        role: "user",
        parts: [{
          text: `Translate the following text to ${targetLangName}. Return ONLY the translated text, no explanations or additional text. If the text contains HTML, preserve the HTML tags. If the text is already in ${targetLangName}, return it as is.

Text to translate:
${text}`
        }]
      }],
      config: {
        maxOutputTokens: 2048,
        temperature: 0.1,
      }
    });
    
    const translatedText = response.text?.trim() || text;
    
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

export async function translateObject(
  obj: Record<string, any>, 
  fields: string[], 
  targetLang: string
): Promise<Record<string, any>> {
  if (targetLang === "tr") return obj;
  
  const result = { ...obj };
  
  const translations = await Promise.all(
    fields.map(async (field) => {
      if (result[field] && typeof result[field] === "string") {
        return { field, value: await translateText(result[field], targetLang) };
      }
      return null;
    })
  );
  
  translations.forEach(t => {
    if (t) result[t.field] = t.value;
  });
  
  return result;
}

export async function translateArray<T extends Record<string, any>>(
  arr: T[], 
  fields: string[], 
  targetLang: string
): Promise<T[]> {
  if (targetLang === "tr") return arr;
  
  return Promise.all(
    arr.map(item => translateObject(item, fields, targetLang) as Promise<T>)
  );
}
