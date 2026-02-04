# WhatsApp AI Bot - Orchestrator Overview

## 1. Webhook'tan Mesaj Geldiğinde İzlenen Adımlar

### Ana Akış (Tenant Slug ile)
```
POST /api/webhooks/whatsapp/:tenantSlug
```

1. **Tenant Tanımlama**
   - URL'deki slug ile tenant bulunur
   - Bulunamazsa boş response döner

2. **Mesaj Kayıt**
   - Mesaj veritabanına kaydedilir (`storage.addMessage`)

3. **Ön Kontroller** (sırayla)
   - Blacklist kontrolü
   - Pure greeting shortcut (AI çağırmadan "Merhaba!")
   - Daily message limit kontrolü
   - Open support request kontrolü
   - Auto-response match kontrolü
   - Order confirmation request kontrolü

4. **Partner/Viewer Kontrolü**
   - Telefon numarası partner agency mi?
   - Telefon numarası viewer user mı?

5. **Veri Toplama**
   - Conversation history (son 20 mesaj)
   - Activities & Package Tours
   - Capacity data (7 günlük + mesajdaki tarihler)
   - Bot settings (botAccess)
   - General FAQ

6. **Bot Mode Belirleme**
   - `botAccess.aiFirstMode === true` → AI-First Mode
   - Aksi halde → Template-based Mode (kaldırıldı, artık sadece AI-First)

7. **AI-First Mode İşleme**
   - Conversation state yönetimi (5 dakika TTL)
   - Escalation state kontrolü
   - Context building (`buildCleanContext`)
   - Mode detection (`detectActivityMode`)
   - AI response generation (`generateAIFirstResponse`)
   - Escalation trigger kontrolü

## 2. Activity Context Nasıl Tespit Ediliyor?

### detectActivityMode Fonksiyonu
```typescript
detectActivityMode(userMessage, activities, conversationHistory)
```

**Tespit Mantığı:**

1. **Current Message Scan**
   - Mesajda aktivite adı var mı? (Türkçe normalizasyonlu)
   - İngilizce aktivite adı var mı?
   - Kısaltmalar/anahtar kelimeler (parasut, dalis, safari vb.)

2. **Conversation History Scan** (aktivite bulunamazsa)
   - Son 4 USER mesajına bakılır (assistant mesajları atlanır)
   - Kaç farklı aktivite mention edilmiş sayılır
   - Tek aktivite → ACTIVITY_SPECIFIED
   - Birden fazla → ACTIVITY_UNSPECIFIED (force clarification)

3. **General Info Detection**
   - Strict keywords: iletişim, telefon, email, ofis adres, çalışma saatleri
   - Greeting keywords: merhaba, selam, hello, hi

4. **Activity-Specific Question Detection**
   - fiyat, süre, nerede, transfer, yaş sınırı, iptal, rezervasyon vb.

## 3. Mode Mantığı

### 4 Mode Tanımı:
```typescript
type ActivityMode = 
  'SINGLE_ACTIVITY' |      // Sistemde tek aktivite var
  'ACTIVITY_SPECIFIED' |   // Kullanıcı aktivite adı belirtti
  'ACTIVITY_UNSPECIFIED' | // Birden fazla aktivite, kullanıcı belirtmedi
  'GENERAL_INFO_ONLY';     // Aktiviteden bağımsız soru (iletişim, selamlama)
```

### Mode Belirleme Öncelik Sırası:
1. **GENERAL_INFO_ONLY**: Strict general info + aktivite sorusu değilse
2. **GENERAL_INFO_ONLY**: Greeting + aktivite sorusu değilse + kısa mesaj
3. **ACTIVITY_SPECIFIED**: Aktivite adı belirtildiyse (current veya history'den)
4. **SINGLE_ACTIVITY**: Tek aktivite varsa
5. **ACTIVITY_UNSPECIFIED**: Diğer tüm durumlar

### Mode'a Göre Davranış:
| Mode | Davranış |
|------|----------|
| SINGLE_ACTIVITY | Direkt cevapla |
| ACTIVITY_SPECIFIED | Sadece o aktivite için cevapla |
| ACTIVITY_UNSPECIFIED | Tüm aktiviteleri listele + "Hangisi?" sor |
| GENERAL_INFO_ONLY | Aktivite bağlamı olmadan cevapla |

## 4. Aktivite Adı Belirtilmezse Sistem Ne Yapıyor?

### ACTIVITY_UNSPECIFIED Mode'da:
1. Prompt'a mod bilgisi JSON olarak eklenir
2. Prompt'ta şu kurallar var:
   - TÜM aktiviteleri kısaca listele
   - İstenen bilgiyi her aktivite için ver
   - "Hangi aktivite hakkında detay almak istersiniz?" sor
   - ASLA varsayılan aktivite seçme
   - ASLA tek aktivite için cevap verme

## 5. Intent Tespiti: Kod mu, AI mı, Hibrit mi?

### **HİBRİT YAKLAŞIM**

#### Kod Tarafı (detectIntent fonksiyonu):
- Regex kuralları (süre, fiyat, müsaitlik)
- Keyword matching (intentPatterns)
- Öncelik sıralaması (intentPriority)
- Conversation state kullanımı

#### AI Tarafı:
- Mode detection sonucu prompt'a eklenir
- AI bu mode'a göre davranış belirler
- AI karar vermez, uygular

### Intent Tipleri:
```typescript
type IntentType = 
  'greeting' | 'availability' | 'price' | 'duration' | 
  'reservation' | 'reservation_status' | 'transfer' | 
  'payment' | 'cancellation' | 'activity_list' | 
  'faq' | 'extras' | 'package_tour' | 'activity_info' | 
  'general' | 'unknown';
```

## 6. AI Hangi Durumda Çağrılıyor?

### AI Çağrılmayan Durumlar:
1. Pure greeting (saf selamlama) → Hardcoded response
2. Blacklisted number → Boş response
3. Daily limit exceeded → Limit mesajı
4. Open support request → Boş response
5. Auto-response match → Template response
6. Order confirmation request + reservation exists → Template response

### AI Çağrılan Durumlar:
- Yukarıdaki kontrollerin hiçbiri match etmediyse
- `botAccess.aiFirstMode === true` ise
- `generateAIFirstResponse` fonksiyonu çağrılır

### AI Response Flow:
1. Language detection (TR/EN)
2. Mode detection (`detectActivityMode`)
3. Context building (`buildAIFirstPrompt`)
4. OpenAI GPT-4o API call
5. Escalation trigger check
6. Response formatting
