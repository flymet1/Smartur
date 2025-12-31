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

## Teknoloji Yığını
- **Frontend**: React, Shadcn/UI, Tailwind CSS, Recharts.
- **Backend**: Node.js, Express, Drizzle ORM, PostgreSQL.
- **AI**: Google Gemini 1.5 Flash (Replit AI Integration).

## Son Değişiklikler
- 31.12.2025: Proje başlatıldı, temel altyapı kuruldu.
