# Bilinen Sorunlar ve Edge Cases

## 1. Mode Detection Sorunları

### 1.1 Conversation History Context
**Sorun:** Mode detection mevcut conversation state'i (lastActivity, lastIntent) kullanmıyor. Sadece raw text matching yapıyor.

**Etki:** Daha önce bir aktivite seçilmişse ve kullanıcı kısa takip sorusu sorduğunda ("kaç para?"), state'ten aktivite alınamıyor, ACTIVITY_UNSPECIFIED olarak işaretleniyor.

**Örnek:**
```
User: "Yamaç paraşütü hakkında bilgi ver"
Bot: [Yamaç paraşütü bilgileri]
User: "kaç para?"
Bot: "Hangi aktivite için?" ← HATALI, önceki context'ten bilmeli
```

### 1.2 Assistant Response İçinden Aktivite Algılama
**Sorun (DÜZELTILDI):** Eski implementasyon assistant mesajlarını da tarıyordu. Bot birden fazla aktivite listelerse, ilkini "specified" olarak algılıyordu.

**Mevcut Durum:** Sadece user mesajları taranıyor.

### 1.3 Birden Fazla Aktivite Mention
**Durum (DÜZELTILDI):** User geçmişte birden fazla aktivite mention ettiyse, sistem ACTIVITY_UNSPECIFIED kalıyor ve clarification istiyor.

---

## 2. Intent Detection Sorunları

### 2.1 "Ne kadar" Belirsizliği
**Durum (DÜZELTILDI):** Regex kuralları ile çözüldü:
- "ne kadar sürüyor" → DURATION
- "ne kadar" (tek başına) → PRICE

### 2.2 Otel Kelimesi Belirsizliği
**Durum (DÜZELTILDI):** Entity-intent separation yapıldı:
- "otelimiz Hilton" → entity (otel ismi)
- "otel transferi" → intent (transfer sorusu)

---

## 3. Veri Erişim Sorunları

### 3.1 İletişim Bilgileri
**Eski Sorun (DÜZELTILDI):** Bot "[company.phone]" yazıyordu.

**Neden:** `getSetting()` yerine `getTenant()` kullanılması gerekiyordu. Düzeltildi.

**İletişim Alanları:**
- websiteContactPhone → tenants tablosundan
- websiteContactEmail → tenants tablosundan
- websiteContactAddress → tenants tablosundan
- websiteContactMapLink → tenants tablosundan

### 3.2 Eksik Alanlar
Bazı alanlar null olabilir ve bot "Bu bilgi şu an mevcut değil" demeli:
- meetingPointMapLink
- transferInfo
- extras (boş array olabilir)
- faqs (boş array olabilir)

---

## 4. Tutarsız Davranışlar

### 4.1 Süre vs Bölge Tutarsızlığı
**Önceki Sorun:** "kaç dakika sürüyor?" sorusunda her iki aktivite için süre verdi, ama "hangi bölgede?" sorusunda sadece bir aktivite için cevap verdi.

**Neden:** Mode detection tutarlı uygulanmıyordu.

**Mevcut Durum:** Mode-based rules eklendi. ACTIVITY_UNSPECIFIED modda tüm aktiviteleri listele + clarification iste.

### 4.2 Transfer Sorusu
**Önceki Sorun:** "otel transferi var mı?" sorusunda sadece bir aktivite için cevap verildi.

**Mevcut Durum:** Mode kuralları ile düzeltilmeli.

---

## 5. Edge Cases

### 5.1 Tek Aktivite + Genel Soru
**Senaryo:** Sistemde tek aktivite var, kullanıcı "telefon numaranız?" soruyor.

**Beklenen:** GENERAL_INFO_ONLY mode, aktivite context'i olmadan cevap
**Mevcut:** Doğru çalışıyor (priority order düzeltildi)

### 5.2 Birden Fazla Intent
**Senaryo:** "fiyat ve süre nedir?"

**Mevcut:** Öncelik sırasına göre sadece fiyat cevaplanıyor (reservation > price > duration)

**Potansiyel İyileştirme:** Her iki intent için de cevap verilebilir.

### 5.3 Karşılaştırma Soruları
**Senaryo:** "hangisi daha iyi?"

**Beklenen:** Tarafsız açıklama, subjektif yorum yapma
**Mevcut:** Prompt'ta kural var ama kesin şablon yok

### 5.4 Pazarlık Soruları
**Senaryo:** "indirim olur mu?"

**Mevcut:** Prompt'ta kural var ama kesin şablon yok

---

## 6. Performans Sorunları

### 6.1 AI Call Count
- Her kompleks soru için OpenAI API çağrısı
- Greeting shortcut token tasarrufu sağlıyor
- Auto-response match AI call'ı bypass ediyor

### 6.2 Context Size
- Tüm aktiviteler + tüm FAQs + tüm extras JSON olarak gönderiliyor
- Büyük tenant'larda token limiti aşılabilir

---

## 7. Güvenlik Notları

### 7.1 PII Masking
- Sistem loglarında PII maskeleniyor
- WhatsApp mesaj logları veritabanında tam kaydediliyor

### 7.2 Blacklist
- Blacklisted numaralar için boş response dönüyor
- AI çağrılmıyor, mesaj loglanıyor

### 7.3 Daily Limit
- Tenant başına günlük mesaj limiti var
- Limit aşılınca AI çağrılmıyor
