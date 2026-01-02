# My Smartur - WhatsApp Rezervasyon & Operasyon Sistemi

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
- **Dinamik Tarih Algılama**: "yarın", "5 şubat", "hafta sonu", "15.01" gibi Türkçe tarih ifadelerini anlar
- **Tatil/Bayram Tanıma**: "bayramda müsait misiniz?", "kurban bayramı" gibi tatil sorularını algılar ve ilgili tarihlerin kapasitesini çeker
- **Onay Mesajları**: Her aktivite/paket tur için tanımlı onay mesajlarını müşteriye iletir
- **Eskalasyon Sistemi**: Karmaşık sorunlarda destek talebi oluşturur, personel dashboard'dan takip eder
- **SSS Desteği**: Aktivite ve paket turlara tanımlı SSS'leri yanıtlarda kullanır

## Son Değişiklikler
- 02.01.2026: Gmail Ayarları UI - Ayarlar sayfasına Gmail yapılandırma kartı eklendi (bağlantı durumu, test butonu, bağlantı kaldırma).
- 02.01.2026: Gmail Şifreli Depolama - Gmail kimlik bilgileri AES-256-GCM şifreleme ile veritabanında güvenli saklanıyor (server/encryption.ts).
- 02.01.2026: Destek Talebi Oluştur - Kullanım Kılavuzu sayfasına destek talebi formu eklendi, talepler veritabanına kaydediliyor.
- 02.01.2026: Geliştirici Girişi - 'Bot Kurallarını Düzenle' sayfası 'Geliştirici Girişi' olarak yeniden adlandırıldı, sidebar'a taşındı.
- 02.01.2026: Geliştirici E-posta Ayarı - Destek taleplerinin gönderileceği e-posta adresi geliştirici panelinden ayarlanabiliyor.
- 02.01.2026: Türkçe karakter düzeltmeleri - Tüm admin panelinde ş, ç, ö, ü, ğ, ı, İ karakterleri düzeltildi.
- 02.01.2026: Bot dinamik tarih algilama - "yarin", "5 subat", "15.01", "hafta sonu" gibi Turkce tarih ifadelerini anlar ve o tarihin kapasitesini ceker.
- 02.01.2026: Sanal kapasite slotları artık rezervasyonları sayıyor - varsayılan kapasiteye karşı yapılan rezervasyonlar doğru hesaplanıyor (örn: 5 kişilik varsayılan, 4 kişilik rezervasyon = 1 kişi müsait).
- 02.01.2026: Bot artık sanal slot müsaitliğini görebiliyor - 7 günlük kapasite verisi (hem DB hem varsayılan) AI'a aktarılıyor.
- 02.01.2026: Takvim filtresi üst kısma taşındı, Rezervasyon takviminde gün özeti eklendi.
- 02.01.2026: Takvimde otomatik varsayılan slotlar - aktivitelerin defaultTimes ve defaultCapacity değerleri takvimde sanal slot olarak görüntüleniyor (kesikli kenarlık, "Varsayilan" etiketi ile).
- 02.01.2026: AI Bot iyileştirmeleri - onay mesajları, kapasite erişimi, eskalasyon kuralları eklendi.
- 02.01.2026: SSS (FAQ) yönetimi eklendi (aktiviteler ve paket turlar için).
- 31.12.2025: Finans & Acenta Yönetimi modülü eklendi (maliyet takibi, KDV hesaplaması, hesaplaşma sistemi).
- 31.12.2025: Proje başlatıldı, temel altyapı kuruldu.
