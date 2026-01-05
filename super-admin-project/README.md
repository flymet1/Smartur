# Smartur Super Admin Panel

Bu proje, Smartur uygulamasinin Super Admin ve Developer panellerini iceren bagimsiz yonetim uygulamasidir.

## Ozellikler

- **Super Admin Paneli** (`/super-admin`)
  - Abonelik plani yonetimi
  - Abone (acenta) yonetimi
  - Plan ozellikleri yonetimi
  - Sistem izleme (uptime, log'lar)
  - Uygulama guncelleme ve surum yonetimi
  - Destek talepleri

- **Developer Paneli** (`/developer`)
  - Sistem durumu izleme
  - Log goruntuleme
  - Veritabani yonetimi

## Kurulum

1. Yeni bir Replit projesi olusturun (Node.js template)
2. Bu klasordeki tum dosyalari yeni projeye kopyalayin
3. `npm install` calistirin
4. Asagidaki ortam degiskenlerini ayarlayin:
   - `DATABASE_URL` - PostgreSQL baglanti dizesi (ana Smartur veritabanina baglanmak icin)
   - `SESSION_SECRET` - Oturum sifresi
   - `SUPER_ADMIN_PASSWORD` - Super Admin sifresi (varsayilan: Netim1905)

## Dosya Yapisi

```
super-admin-project/
├── client/src/
│   ├── pages/
│   │   ├── SuperAdmin.tsx    # Super Admin paneli
│   │   └── Developer.tsx     # Developer paneli
│   ├── components/ui/        # UI bileşenleri
│   ├── hooks/                # React hook'ları
│   └── lib/                  # Yardımcı fonksiyonlar
├── server/
│   ├── storage.ts            # Veritabani islemleri
│   └── db.ts                 # Veritabani baglantisi
├── shared/
│   └── schema.ts             # Veritabani sema tanimlari
└── package.json
```

## Notlar

- Bu proje ana Smartur veritabaniyla ayni veritabanini kullanir
- Super Admin sifresi guvenlik icin ortam degiskeninden alinmalidir
- Uretim ortaminda HTTPS kullanilmalidir
