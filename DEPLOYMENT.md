# Smartur Deployment Guide

## En Kolay Yontem: Docker Compose

### Gereksinimler
- Docker ve Docker Compose yuklu bir sunucu

### Kurulum Adimlari

1. Projeyi sunucuya kopyalayin:
```bash
git clone <repo-url> smartur
cd smartur
```

2. Environment degiskenlerini duzenleyin (docker-compose.yml icinde):
- SUPER_ADMIN_EMAIL
- SUPER_ADMIN_PASSWORD
- SESSION_SECRET

3. Uygulamayi baslatin:
```bash
docker-compose up -d
```

4. Tarayicidan erisim:
```
http://sunucu-ip:5000
```

---

## Manuel Kurulum (Docker olmadan)

### Gereksinimler
- Node.js 20+
- PostgreSQL 16+

### Adimlar

1. Bagimliliklari yukleyin:
```bash
npm install
```

2. Build alin:
```bash
npm run build
```

3. .env dosyasi olusturun:
```bash
cp .env.example .env
nano .env  # Degerleri duzenleyin
```

4. Veritabani yedeğini yukleyin:
```bash
psql $DATABASE_URL < smartur_backup.sql
```

5. Uygulamayi baslatin:
```bash
npm start
```

---

## Onemli Notlar

- Build almadan calistirmaya calismak HATA verir
- Veritabani baglantisi zorunludur
- Super admin ilk calistirmada otomatik olusturulur (eger veritabaninda yoksa)

## Port Ayarlari

- Uygulama varsayilan olarak port 5000'de calisir
- Nginx/Apache ile reverse proxy yapabilirsiniz

## Coolify/aaPanel Icin

Eger Docker kullanmak istemiyorsaniz:

1. Node.js 20 yukleyin
2. PostgreSQL veritabani olusturun
3. Environment variables ekleyin
4. Su komutlari sirayla calistirin:
```bash
npm install
npm run build
npm start
```

ONEMLI: "npm run build" olmadan "npm start" CALISMAZ!
