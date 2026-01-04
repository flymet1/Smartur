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
- **Takip Sayfası Yönlendirme**: Rezervasyon sonrası takip linki bilgisi, değişiklik/iptal için takip sayfasına yönlendirme
- **Eskalasyon Sistemi**: Karmaşık sorunlarda destek talebi oluşturur, personel dashboard'dan takip eder
- **SSS Desteği**: Aktivite ve paket turlara tanımlı SSS'leri yanıtlarda kullanır
- **Retry Mekanizması**: AI hata verdiğinde otomatik yeniden deneme (3 deneme, exponential backoff)
- **Akıllı Fallback**: AI erişilemezse kullanıcı niyetine göre akıllı yanıt (fiyat, müsaitlik, rezervasyon, iptal)

## Son Değişiklikler
- 04.01.2026: Paket Tur Gruplama - Aynı paket tura ait rezervasyonlar haftalık/günlük görünümde ve liste tablosunda gruplandı. Mor kenarlıklı konteyner içinde Package ikonu ve müşteri adı başlığı ile gösteriliyor. Gruplama anahtarı: packageTourId + orderNumber/customerName.
- 04.01.2026: Mini Takvim Görünümü - Rezervasyonlar sayfasına üçüncü görünüm modu eklendi (CalendarDays ikonu). Kompakt aylık takvim + Aktiviteler/Paket Turlar sekmeli liste. Rezervasyonu olan günler vurgulanıyor. Seçili güne ait rezervasyonlar renk kodlu kartlarla gösteriliyor. Tıklayarak detay dialogu açılıyor.
- 04.01.2026: Paket Tur Filtresi ve Görsel İyileştirme - Takvime paket tur filtresi eklendi (Tüm Paketler / Paket Yok / belirli paket seçimi). Aktivite ve paket tur filtreleri birlikte çalışıyor. Gün ve hafta görünümünde rezervasyon kartlarında paket tur bilgisi mor Package ikonu ile gösteriliyor. Genişletilmiş kartlarda paket tur adı açıkça görüntüleniyor.
- 04.01.2026: Takvim Filtreleme ve Tarih Seçici - Takvim başlığına tarih seçici (popover calendar) eklendi, tarih başlığına tıklayarak hızlı tarih seçimi. Aktivite filtreleme dropdown'ı eklendi. Doluluk tooltip'leri geliştirildi: "Toplam X kişi rezervasyon" başlığı, aktivite bazlı detay ve renk kodlu yüzdeler (kırmızı %80+, turuncu %50-79, yeşil <%50).
- 04.01.2026: Ana Sayfa Yeniden Tasarımı - Rezervasyonlar artık ana sayfa ("/"). Büyük takvim bileşeni eklendi: günlük/haftalık/aylık görünüm geçişi, takvim navigasyonu, tarih tıklayarak yeni rezervasyon oluşturma, aktivite doluluk oranları (tooltip ile detay), renk kodlu aktiviteler, hızlı durum değiştirme dropdown'ları. Dashboard sadeleştirildi - sadece bildirimler ve Rezervasyonlar sayfasına yönlendirme CTA'sı gösteriyor. Sidebar navigasyonu güncellendi.
- 03.01.2026: Takip Linki Şablon Desteği - Onay mesajı şablonlarında {takip_linki} yer tutucusu kullanılabilir. Manuel rezervasyon oluşturulup WhatsApp bildirimi gönderildiğinde takip tokeni otomatik oluşturulur ve mesaja eklenir.
- 03.01.2026: Müşteri Takip Dinamik Saat Seçimi - Saat değişikliği talebinde artık sadece ilgili aktivitenin varsayılan saatleri gösteriliyor. Backend'den defaultTimes çekiliyor, aktivite/paket tur bazında dinamik seçenekler sunuluyor.
- 02.01.2026: Profesyonel Satış Sunumu - /sales-presentation sayfası oluşturuldu. 14 bölümlü kapsamlı satış dökümanı: Kapak, Yönetici Özeti, Karşılaşılan Zorluklar, Değer Önerisi, Dashboard, Rezervasyon, Takvim, WhatsApp Bot, Müşteri Takip, Finans, Entegrasyonlar, Sektörel Çözümler, Fiyatlandırma ve İletişim. PDF export butonu ile yazdırılabilir A4 format. Lucide-react ikonları, print-optimized CSS styling.
- 02.01.2026: Kapsamlı Kullanım Kılavuzu - UserGuide.tsx tamamen yeniden yazıldı. 10 ana bölüm, tüm sayfa fonksiyonları, WhatsApp bot sistemi, rezervasyon yönetimi, müşteri takip, finans, ayarlar ve lisans sistemi detaylı açıklandı. Sayfa içi navigasyon linkleri eklendi.
- 02.01.2026: Kapsamlı Türkçe Karakter Düzeltmeleri - Settings.tsx, CustomerRequests.tsx, BotRules.tsx, Dashboard.tsx, CustomerTracking.tsx sayfalarında tüm Türkçe karakterler düzeltildi. Toast mesajları, dialog başlıkları, açıklama metinleri ve yorumlar Unicode karakterlerle güncellendi (ş, ç, ö, ü, ğ, ı, İ).
- 02.01.2026: Sidebar Üyelik Durumu - WooCommerce bilgisi kaldırıldı, yerine lisans durumu eklendi. Aktif lisanslarda kalan gün sayısı, süresi dolmuş lisanslarda "Yenileme Gerekli" gösterilir. Renk kodlaması: yeşil (>14 gün), sarı (7-14 gün), kırmızı (<7 gün veya süre dolmuş).
- 02.01.2026: Dinamik Doluluk Orani - Dashboard'daki doluluk orani artik secilen tarihe gore gercek verilerden hesaplaniyor. Tarih degistirme, aktivite bazli detay goruntusu ve bugun/yarin hizli gecis butonlari eklendi.
- 02.01.2026: Bot Takip Sayfası Entegrasyonu - Rezervasyon sonrası müşteriye takip sayfası bilgisi verilmesi, değişiklik/iptal taleplerinde takip sayfasına yönlendirme. Sistem prompt güncellendi.
- 02.01.2026: Lisans/Üyelik Sistemi - 4 plan tipi (trial/basic/professional/enterprise) ile lisans yönetimi eklendi. Dashboard'da üyelik durumu kartı, API endpoint'leri ve otomatik yenileme sistemi. Aktivite ve rezervasyon limitleri plan bazında kontrol ediliyor.
- 02.01.2026: Menü Düzenlemesi - Tatiller ayarlar sayfasına yeni sekme olarak taşındı. Bot Test sidebar alt kısmına taşındı. Hızlı erişim sadece Müşteri Talepleri ve Destek gösteriyor.
- 02.01.2026: Acenta Bildirim Özelliği - Müşteri talepleri sayfasında "Acentayı Bilgilendir" butonu eklendi. Acenta seçimi dropdown ile yapılabilir. Düzenlenebilir mesaj içeriği. Telefon numarası olan acentalar listelenir.
- 02.01.2026: Dinamik Onay Mesajı - WhatsApp bildirimi artık aktivite/paket tur'daki "Rezervasyon Onay Mesajı" alanından çekiliyor. {isim}, {tarih}, {saat}, {aktivite} yer tutucuları otomatik değiştiriliyor.
- 02.01.2026: Müşteri Talepleri Bildirim - Müşteri talepleri sayfasında her talepte "Bilgilendir" butonu eklendi. Onay/red sonrası otomatik WhatsApp bildirim dialogu açılır. Dinamik mesaj şablonu (talep tipi, durum, tercih edilen saat) ile özelleştirilebilir metin. Twilio API ile gönderim.
- 02.01.2026: WhatsApp Bildirim Özelliği - Manuel rezervasyon oluştururken "Müşteriyi WhatsApp ile bilgilendir" checkbox'ı eklendi. Twilio API entegrasyonu ile müşteriye otomatik rezervasyon onay mesajı gönderilir. Hata durumunda kullanıcıya bilgi verilir.
- 02.01.2026: Müşteri Talepleri Admin Paneli - Geliştirici panelinde müşteri taleplerini görüntüleme ve yönetme eklendi. Saat değişikliği, iptal ve diğer talepleri onaylama/reddetme. Yeni talep sayısı badge ile gösterilir. Otomatik yenileme (30 saniye).
- 02.01.2026: Müşteri Rezervasyon Takip Sistemi - Müşterilere benzersiz takip linki gönderilerek rezervasyon durumlarını görmeleri sağlanır. Token tabanlı güvenlik, aktivite tarihinden 1 gün sonra otomatik temizleme. Mobil uyumlu takip sayfası (/takip/:token). Günlük otomatik temizleme job'ı.
- 02.01.2026: Şifre Değiştirme Güvenliği - Ayarlar sayfasında şifre değiştirirken onay alanı eklendi. Şifreler eşleşmezse kaydetmeye izin verilmez.
- 02.01.2026: Hata Ayıklama (Debug Snapshot) - Ayarlar sayfasına "Hata Ayıklama" kartı eklendi. Tek tıkla tüm sistem verilerini toplayan rapor oluşturulur (aktiviteler, rezervasyonlar, loglar, ayarlar). Sistem sağlığı otomatik kontrol edilir (AI hataları, webhook sorunları). İndirilebilir JSON rapor ile geliştirici destek alınabilir. Müşteri bilgileri otomatik gizlenir.
- 02.01.2026: Sistem Logları - Geliştirici paneline sistem logları görüntüleme eklendi. AI hataları, webhook hataları ve sistem olayları kaydedilir. Destek taleplerine son 20 log otomatik eklenir. PII verileri (telefon, e-posta, API anahtarları) maskelenir.
- 02.01.2026: İki Dilli Otomatik Yanıtlar - Her kural için ayrı Türkçe ve İngilizce anahtar kelimeler ve yanıtlar destekleniyor. Türkçe soru gelirse Türkçe, İngilizce soru gelirse İngilizce yanıt verilir. Ayarlar sayfasında TR/EN sekmeleri ile yönetim. İngilizce yanıt boşsa Türkçe yanıt kullanılır.
- 02.01.2026: Otomatik Yanıtlar - Anahtar kelime eşleşmesiyle AI çağırısı yapmadan hızlı yanıt sistemi eklendi. Maliyet tasarrufu ve daha hızlı yanıt süreleri. Ayarlar sayfasından yönetilebilir. Türkçe karakter normalleştirme (ı/i, ö/o, ü/u, ş/s, ç/c, ğ/g) desteklenir.
- 02.01.2026: AI Bot Kararlılığı - Retry mekanizması (3 deneme, exponential backoff) ve akıllı fallback yanıtları eklendi. AI erişilemezse fiyat, müsaitlik, rezervasyon, iptal niyetlerine göre Türkçe yanıt verilir.
- 02.01.2026: Sidebar Hızlı Erişim - "Bot Test" ve "Tatiller" menüden kaldırılıp, sidebar üstüne yan yana küçük kutucuklar olarak taşındı.
- 02.01.2026: Güncellemeler Paneli - Ayarlara "Güncellemeler" kartı eklendi. Sistem sürümü, Git commit, çalışma süresi, Node.js versiyonu görüntülenir. "Güncelleme Kontrol Et" butonu ile GitHub'dan yeni güncelleme olup olmadığı kontrol edilir. VPS güncelleme talimatları gösterilir.
- 02.01.2026: Sipariş Numarası Alanı - Rezervasyonlara orderNumber alanı eklendi. Manuel girişte opsiyonel, WooCommerce'den otomatik alınır, paket tur aktivitelerinde ortak sipariş numarası kullanılır. Arama fonksiyonunda sipariş numarası ile aranabilir.
- 02.01.2026: Takvim-Rezervasyon Entegrasyonu - Takvim sayfasından "Bu Günün Rezervasyonları" butonu ile seçili tarihin rezervasyonlarına hızlı erişim. Rezervasyonlar sayfasında tarih filtresi ve görsel gösterge.
- 02.01.2026: Profesyonel Bot Kuralları - 6 ana bölüm altında organize edilmiş kapsamlı bot kuralları eklendi (İletişim, Müsaitlik, Rezervasyon, Bilgi Sorguları, Sipariş Yönetimi, Eskalasyon).
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
