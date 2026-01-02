# WhatsApp Rezervasyon & Operasyon Sistemi

## Genel Bakış
Bu proje, Python yerine Node.js/TypeScript ile geliştirilmiş modern bir rezervasyon ve operasyon yönetim sistemidir. 
SQLite yerine, Replit'in yerleşik PostgreSQL veritabanı kullanılmıştır (daha güvenilir ve ölçeklenebilir).
Google Gemini AI entegrasyonu ile akıllı yanıt sistemi eklenmiştir.

## Özellikler
- **Aktivite Yönetimi**: Tur/aktivite tanımlama, fiyat ve süre belirleme.
- **Kapasite/Takvim**: Tarih ve saat bazlı kontenjan takibi.
- **Rezervasyonlar**: Web ve WhatsApp üzerinden gelen rezervasyonların yönetimi.
- **WhatsApp Entegrasyonu**: Twilio Webhook yapısı ile (mock) mesajlaşma ve AI yanıtları.
- **Raporlama**: Basit istatistikler.
- **Finans & Acenta Yönetimi**: Aktivite maliyetleri, KDV hesaplaması, acenta ödemeleri ve hesaplaşma takibi.

## Teknoloji Yığını
- **Frontend**: React, Shadcn/UI, Tailwind CSS, Recharts.
- **Backend**: Node.js, Express, Drizzle ORM, PostgreSQL.
- **AI**: Google Gemini 1.5 Flash (Replit AI Integration).

## AI Bot Özellikleri
- **Takvim/Kapasite Erişimi**: Bot, müsaitlik bilgilerini takvimden okur
- **Onay Mesajları**: Her aktivite/paket tur için tanımlı onay mesajlarını müşteriye iletir
- **Eskalasyon Sistemi**: Karmaşık sorunlarda destek talebi oluşturur, personel dashboard'dan takip eder
- **SSS Desteği**: Aktivite ve paket turlara tanımlı SSS'leri yanıtlarda kullanır

## Son Değişiklikler
- 02.01.2026: Takvimde otomatik varsayılan slotlar - aktivitelerin defaultTimes ve defaultCapacity değerleri takvimde sanal slot olarak görüntüleniyor (kesikli kenarlık, "Varsayilan" etiketi ile).
- 02.01.2026: AI Bot iyileştirmeleri - onay mesajları, kapasite erişimi, eskalasyon kuralları eklendi.
- 02.01.2026: SSS (FAQ) yönetimi eklendi (aktiviteler ve paket turlar için).
- 31.12.2025: Finans & Acenta Yönetimi modülü eklendi (maliyet takibi, KDV hesaplaması, hesaplaşma sistemi).
- 31.12.2025: Proje başlatıldı, temel altyapı kuruldu.
