# Intent Sistemi Dokümantasyonu

## Intent Tipleri ve Tetikleyiciler

### 1. GREETING (Selamlama)
```
Keywords: merhaba, selam, iyi günler, günaydın, iyi akşamlar, hey, hi, hello
Koşul: Ticari intent yoksa + mesaj < 25 karakter
```

### 2. AVAILABILITY (Müsaitlik)
```
Keywords: müsait, yer var, boş, kontenjan, doluluk, uygun, available, slot
Regex: (yarın|bugün|pazar|cumartesi|hafta sonu).*(var mı|müsait|boş)
```

### 3. PRICE (Fiyat)
```
Keywords: fiyat, ücret, kaç para, tutar, maliyet, price, cost, how much
Regex: ne\s*kadar\s*(?!sürer|sürüyor|sürecek|uzun|dakika|saat)
NOT: "ne kadar sürüyor" SÜRE olarak algılanır, fiyat değil
```

### 4. DURATION (Süre)
```
Keywords: süre, uzunluk, duration
Regex Patterns:
- ne kadar\s*(sürer|sürüyor|sürecek|uzun|dakika|saat)
- süresi?\s*(ne kadar|kaç|nedir)
- kaç\s*(dakika|saat|dk|sa)
- how\s*long
- duration
```

### 5. RESERVATION (Rezervasyon)
```
Keywords: rezervasyon, kayıt, yer ayırt, katılmak, gelmek istiyorum, book, reserve
```

### 6. RESERVATION_STATUS (Rezervasyon Durumu)
```
Keywords: siparişim, rezervasyonum, durumu, onaylandı mı, takip, my booking, my order
Özel: Sadece sipariş numarası gönderilirse + lastIntent === 'reservation_status'
```

### 7. TRANSFER (Transfer)
```
Keywords: transfer, alınış, servis, ulaşım, pickup, shuttle
Özel: "otel" kelimesi + entity değilse → transfer
Entity patterns: otelimiz, otelim, otel adı, otelinde (bunlar transfer değil)
```

### 8. PAYMENT (Ödeme)
```
Keywords: ödeme, ön ödeme, kapora, nakit, kart, havale, payment, deposit
```

### 9. CANCELLATION (İptal)
```
Keywords: iptal, değişiklik, tarih değiştir, vazgeçtim, cancel, change date
```

### 10. ACTIVITY_LIST (Aktivite Listesi)
```
Keywords: aktiviteler, turlar, neler var, ne yapabiliriz, seçenekler, activities, tours, options, what activities
```

### 11. FAQ (SSS)
```
Keywords: sss, sık sorulan, merak edilen, soru-cevap, faq
```

### 12. EXTRAS (Ekstralar)
```
Keywords: ekstra, ek hizmet, video çekim, fotoğraf çekim, sigorta, öğle yemeği, 
          extra, photo, video, kadın pilot, bayan pilot, female pilot, 
          gopro, kamera, camera, tandem, ek ücret, ek fiyat
```

### 13. PACKAGE_TOUR (Paket Tur)
```
Keywords: paket tur, tur paketi, paket program, günlük tur, kombinasyon tur, 
          kombi tur, paketler, package tour
```

---

## Intent Öncelik Sıralaması

Birden fazla intent eşleşirse, en yüksek öncelikli olan seçilir:

```
1. reservation      (Satış öncelikli)
2. price
3. availability
4. duration
5. transfer
6. payment
7. reservation_status
8. cancellation
9. extras
10. activity_list
11. package_tour
12. faq
13. activity_info
14. general
```

---

## Activity Detection - Mode Bazlı Keyword'ler

### Activity-Specific Question Indicators:
```
TR: fiyat, ücret, para, kaç lira, kaç tl, süre, dakika, saat, 
    nerede, konum, bölge, transfer, otel, yaş sınır, kilo, ağırlık,
    dahil, ekstra, iptal, değişiklik, rezervasyon

EN: price, cost, how much, duration, how long, location, where,
    transfer, hotel, age limit, weight, included, extra, cancel, change,
    booking, reservation
```

### General Info Keywords (Strict):
```
TR: iletişim, telefon numara, email, eposta, mail, ofis adres, 
    şirket adres, çalışma saat, açık saat, kapalı saat,
    ödeme yöntem, kredi kart, nakit ödeme

EN: contact info, phone number, office address, working hours, 
    payment method
```

### Greeting Keywords:
```
TR: merhaba, selam, günaydın, iyi günler
EN: hello, hi, hey
```

---

## Activity Name Matching

### Turkish Character Normalization:
```
ı → i, ğ → g, ü → u, ş → s, ö → o, ç → c
```

### Common Abbreviations/Keywords:
```javascript
{
  'parasut': ['paragliding', 'yamac'],
  'dalis': ['diving', 'scuba', 'tuplu'],
  'safari': ['jeep', 'cip'],
  'tekne': ['boat'],
  'rafting': ['rafting'],
  'quad': ['atv'],
  'balon': ['balloon']
}
```
