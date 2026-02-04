/**
 * ORCHESTRATOR CODE - WhatsApp AI Bot
 * 
 * Bu dosya server/routes.ts'den çıkarılmış kritik fonksiyonları içerir.
 * Tam kaynak kod için: server/routes.ts
 */

// =============================================================================
// 1. ACTIVITY MODE TYPES
// =============================================================================

type ActivityMode = 'SINGLE_ACTIVITY' | 'ACTIVITY_SPECIFIED' | 'ACTIVITY_UNSPECIFIED' | 'GENERAL_INFO_ONLY';

interface ActivityModeContext {
  mode: ActivityMode;
  activityCount: number;
  activitySpecified: boolean;
  specifiedActivityName?: string;
}

// =============================================================================
// 2. MODE DETECTION FUNCTION
// =============================================================================

function detectActivityMode(
  userMessage: string,
  activities: Array<{ name: string; nameEn?: string }>,
  conversationHistory?: Array<{ role: string; content: string }>
): ActivityModeContext {
  const activityCount = activities.length;
  
  // Normalize Turkish characters for matching
  const normalize = (str: string) => str.toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c');
  
  const messageLower = normalize(userMessage);
  
  // Check if user mentioned any activity name in CURRENT message
  let specifiedActivityName: string | undefined;
  for (const activity of activities) {
    const nameLower = normalize(activity.name);
    
    if (messageLower.includes(nameLower)) {
      specifiedActivityName = activity.name;
      break;
    }
    
    if (activity.nameEn) {
      const nameEnLower = activity.nameEn.toLowerCase();
      if (messageLower.includes(nameEnLower)) {
        specifiedActivityName = activity.name;
        break;
      }
    }
    
    // Common abbreviations
    const keywords: Record<string, string[]> = {
      'parasut': ['paragliding', 'yamac'],
      'dalis': ['diving', 'scuba', 'tuplu'],
      'safari': ['jeep', 'cip'],
      'tekne': ['boat'],
      'rafting': ['rafting'],
      'quad': ['atv'],
      'balon': ['balloon'],
    };
    
    for (const [activityKeyword, variations] of Object.entries(keywords)) {
      if (nameLower.includes(activityKeyword)) {
        for (const variation of variations) {
          if (messageLower.includes(variation)) {
            specifiedActivityName = activity.name;
            break;
          }
        }
        if (specifiedActivityName) break;
      }
    }
    if (specifiedActivityName) break;
  }
  
  // Check conversation history (USER messages only)
  if (!specifiedActivityName && conversationHistory && conversationHistory.length > 0) {
    const userMessages = conversationHistory
      .filter(msg => msg.role === 'user')
      .slice(-4);
    
    const mentionedActivities = new Set<string>();
    
    for (const msg of userMessages.reverse()) {
      const msgNormalized = normalize(msg.content);
      for (const activity of activities) {
        const nameLower = normalize(activity.name);
        if (msgNormalized.includes(nameLower)) {
          mentionedActivities.add(activity.name);
        }
        if (activity.nameEn && msgNormalized.includes(activity.nameEn.toLowerCase())) {
          mentionedActivities.add(activity.name);
        }
      }
    }
    
    // Only set if EXACTLY ONE activity mentioned
    if (mentionedActivities.size === 1) {
      specifiedActivityName = Array.from(mentionedActivities)[0];
    }
  }
  
  // General info keywords (strict)
  const strictGeneralInfoKeywords = [
    'iletisim', 'telefon numara', 'email', 'eposta', 'mail', 
    'ofis adres', 'sirket adres', 'calisma saat', 'acik saat', 'kapali saat',
    'odeme yontem', 'kredi kart', 'nakit odeme',
    'contact info', 'phone number', 'office address', 'working hours', 'payment method'
  ];
  
  const greetingKeywords = ['merhaba', 'selam', 'gunaydin', 'iyi gunler', 'hello', 'hi', 'hey'];
  
  const isStrictGeneralInfo = strictGeneralInfoKeywords.some(kw => messageLower.includes(normalize(kw)));
  const isGreeting = greetingKeywords.some(kw => messageLower.includes(normalize(kw)));
  
  // Activity-specific indicators
  const activitySpecificKeywords = [
    'fiyat', 'ucret', 'para', 'kac lira', 'kac tl', 'price', 'cost', 'how much',
    'sure', 'dakika', 'saat', 'duration', 'how long',
    'nerede', 'konum', 'bolge', 'location', 'where',
    'transfer', 'otel', 'hotel',
    'yas sinir', 'kilo', 'agirlik', 'age limit', 'weight',
    'dahil', 'included', 'ekstra', 'extra',
    'iptal', 'cancel', 'degisiklik', 'change',
    'rezervasyon', 'booking', 'reservation'
  ];
  
  const isActivitySpecificQuestion = activitySpecificKeywords.some(kw => messageLower.includes(normalize(kw)));
  
  // Determine mode (priority order)
  let mode: ActivityMode;
  
  if (isStrictGeneralInfo && !isActivitySpecificQuestion) {
    mode = 'GENERAL_INFO_ONLY';
  } else if (isGreeting && !isActivitySpecificQuestion && messageLower.length < 50) {
    mode = 'GENERAL_INFO_ONLY';
  } else if (specifiedActivityName) {
    mode = 'ACTIVITY_SPECIFIED';
  } else if (activityCount === 1) {
    mode = 'SINGLE_ACTIVITY';
  } else {
    mode = 'ACTIVITY_UNSPECIFIED';
  }
  
  return {
    mode,
    activityCount,
    activitySpecified: !!specifiedActivityName,
    specifiedActivityName
  };
}

// =============================================================================
// 3. INTENT DETECTION FUNCTION
// =============================================================================

type IntentType = 
  'greeting' | 'availability' | 'price' | 'duration' | 
  'reservation' | 'reservation_status' | 'transfer' | 
  'payment' | 'cancellation' | 'activity_list' | 
  'faq' | 'extras' | 'package_tour' | 'activity_info' | 
  'general' | 'unknown';

interface RAGIntent {
  type: IntentType;
  activityId?: number;
  activityName?: string;
  confidence: number;
}

function detectIntent(
  message: string, 
  activities: any[], 
  packageTours: any[], 
  history: any[],
  conversationState?: any
): RAGIntent {
  const msgLower = message.toLowerCase();
  
  // Pure greeting check
  const greetings = ['merhaba', 'selam', 'iyi günler', 'günaydın', 'iyi akşamlar', 'hey', 'hi', 'hello'];
  const hasGreeting = greetings.some(g => msgLower.includes(g));
  const commercialKeywords = ['fiyat', 'ücret', 'kaç', 'müsait', 'rezervasyon', 'bilgi', 'price', 'available', 'booking'];
  const hasCommercialIntent = commercialKeywords.some(k => msgLower.includes(k));
  
  if (hasGreeting && !hasCommercialIntent && message.length < 25) {
    return { type: 'greeting', confidence: 0.95 };
  }
  
  // Regex rules (priority)
  const specialRegexRules = [
    { pattern: /ne kadar\s*(sürer|sürüyor|sürecek|uzun|dakika|saat)/i, intent: 'duration' as IntentType },
    { pattern: /süresi?\s*(ne kadar|kaç|nedir)/i, intent: 'duration' as IntentType },
    { pattern: /kaç\s*(dakika|saat|dk|sa)/i, intent: 'duration' as IntentType },
    { pattern: /how\s*long/i, intent: 'duration' as IntentType },
    { pattern: /ne\s*kadar\s*(?!sürer|sürüyor|sürecek|uzun|dakika|saat)/i, intent: 'price' as IntentType },
    { pattern: /(yarın|bugün|pazar|cumartesi|hafta sonu).*(var mı|müsait|boş)/i, intent: 'availability' as IntentType },
  ];
  
  for (const rule of specialRegexRules) {
    if (rule.pattern.test(msgLower)) {
      return { type: rule.intent, confidence: 0.95 };
    }
  }
  
  // Keyword patterns
  const intentPatterns: Record<IntentType, string[]> = {
    'availability': ['müsait', 'yer var', 'boş', 'kontenjan', 'available'],
    'price': ['fiyat', 'ücret', 'kaç para', 'tutar', 'price', 'cost', 'how much'],
    'duration': ['süre', 'uzunluk', 'duration'],
    'reservation': ['rezervasyon', 'kayıt', 'yer ayırt', 'book', 'reserve'],
    'reservation_status': ['siparişim', 'rezervasyonum', 'durumu', 'onaylandı mı', 'takip'],
    'transfer': ['transfer', 'alınış', 'servis', 'ulaşım', 'pickup'],
    'payment': ['ödeme', 'ön ödeme', 'kapora', 'nakit', 'kart', 'payment'],
    'cancellation': ['iptal', 'değişiklik', 'tarih değiştir', 'cancel'],
    'activity_list': ['aktiviteler', 'turlar', 'neler var', 'activities'],
    'faq': ['sss', 'sık sorulan', 'faq'],
    'extras': ['ekstra', 'video', 'fotoğraf', 'kadın pilot', 'gopro'],
    'package_tour': ['paket tur', 'tur paketi', 'package tour'],
    'activity_info': [],
    'general': [],
    'greeting': [],
    'unknown': []
  };
  
  // Priority order
  const intentPriority: IntentType[] = [
    'reservation', 'price', 'availability', 'duration', 'transfer',
    'payment', 'reservation_status', 'cancellation', 'extras',
    'activity_list', 'package_tour', 'faq', 'activity_info', 'general'
  ];
  
  const matchedIntents: IntentType[] = [];
  for (const [intentType, patterns] of Object.entries(intentPatterns)) {
    for (const pattern of patterns) {
      if (msgLower.includes(pattern)) {
        matchedIntents.push(intentType as IntentType);
        break;
      }
    }
  }
  
  // Select highest priority
  for (const priorityIntent of intentPriority) {
    if (matchedIntents.includes(priorityIntent)) {
      return { type: priorityIntent, confidence: 0.85 };
    }
  }
  
  return { type: 'general', confidence: 0.5 };
}

// =============================================================================
// 4. AI RESPONSE GENERATION (Simplified)
// =============================================================================

async function generateAIFirstResponse(
  userMessage: string,
  conversationHistory: Array<{ role: string; content: string }>,
  context: any,
  customBotPrompt?: string
): Promise<string> {
  // 1. Detect language
  const isEnglish = detectLanguage(userMessage) === 'en';
  
  // 2. Detect activity mode
  const modeContext = detectActivityMode(
    userMessage, 
    context.activities.map((a: any) => ({ name: a.name, nameEn: a.nameEn })),
    conversationHistory
  );
  
  // 3. Build prompt with mode context
  const systemPrompt = buildAIFirstPrompt(context, customBotPrompt, isEnglish, modeContext);
  
  // 4. Call OpenAI
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      })),
      { role: 'user', content: userMessage }
    ],
    temperature: 0.7,
    max_tokens: 500
  });
  
  return completion.choices[0]?.message?.content || 'Bir hata oluştu.';
}

// =============================================================================
// 5. WEBHOOK FLOW (Simplified)
// =============================================================================

/*
POST /api/webhooks/whatsapp/:tenantSlug

1. Tenant identification (by slug)
2. Message logging
3. Pre-checks:
   - Blacklist
   - Pure greeting shortcut
   - Daily limit
   - Open support request
   - Auto-response match
   - Order confirmation
4. Data gathering:
   - Conversation history (20 messages)
   - Activities & Package Tours
   - Capacity data
   - Bot settings
5. Mode determination:
   - botAccess.aiFirstMode === true → AI-First
6. AI-First processing:
   - detectActivityMode()
   - buildCleanContext()
   - generateAIFirstResponse()
   - Escalation check
*/
