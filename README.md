# LinkedIn Feed Cleaner

LinkedIn feed'inizdeki düşük kaliteli içerikleri (spam, self-promo, motivational trash, reklamlar) otomatik olarak filtreleyen Chrome eklentisi.

## 🚀 Demo

Demo sayfasını açmak için:

```bash
# Basit bir HTTP server başlat (Python ile)
python3 -m http.server 8000

# Veya Node.js ile
npx http-server -p 8000
```

Sonra tarayıcıda `http://localhost:8000/extension/demo/demo.html` adresine gidin.

## 📁 Proje Yapısı

```
linkedinfeedcleaner/
├── extension/                 # Chrome Extension dosyaları
│   ├── manifest.json          # Chrome Extension manifest
│   ├── popup/                 # Extension popup UI
│   │   ├── popup.html
│   │   ├── popup.css
│   │   └── popup.js
│   ├── content/               # Content script (LinkedIn'de çalışır)
│   │   ├── content-script.js
│   │   └── content-style.css
│   ├── background/            # Background service worker
│   │   └── service-worker.js
│   ├── utils/                 # Yardımcı fonksiyonlar
│   │   ├── fake-data.js      # Sahte LinkedIn post verileri
│   │   └── classifier.js     # Basit sınıflandırıcı (demo için)
│   ├── models/                # ML modelleri
│   ├── demo/                  # Demo sayfası
│   │   └── demo.html
│   └── docs/                  # Dokümantasyon
│       ├── PRD.md
│       └── BEST_PRACTICES.md
└── notebook/                  # Jupyter notebook'lar
    ├── 01_embedding_model_selection.ipynb
    └── README.md
```

## 🎯 Özellikler

- ✅ Otomatik post filtreleme
- ✅ 3 seviyeli filtreleme (Hafif, Orta, Agresif)
- ✅ Gerçek zamanlı istatistikler
- ✅ Offline çalışma (tüm işlemler lokal)
- ✅ Gizlilik odaklı (veri dışarı gönderilmez)

## 🔧 Kurulum (Geliştirme)

1. Chrome'da `chrome://extensions/` adresine gidin
2. "Developer mode"u açın
3. "Load unpacked" butonuna tıklayın
4. `extension/` klasörünü seçin

## 📝 Notlar

- Bu bir **demo versiyonudur**
- Gerçek ML modelleri henüz entegre edilmemiştir
- Şu anda basit keyword-based sınıflandırma kullanılıyor
- Gerçek LinkedIn'de test etmek için selector'ları güncellemeniz gerekebilir

## 🎨 Demo'da Test Edilebilir Kategoriler

- **Spam**: Aşırı büyük harfler, "URGENT", "CLICK HERE" gibi ifadeler
- **Self-Promo**: "my new", "check it out", "just launched" gibi ifadeler
- **Motivational Trash**: Kısa motivasyonel mesajlar, emojiler
- **Advertisement**: "50% off", "deal", "enroll now" gibi ifadeler
- **Genuine**: Uzun, analitik içerikler, gerçek paylaşımlar

## 🔮 Gelecek Geliştirmeler

- [ ] Gerçek ML model entegrasyonu (ONNX.js)
- [ ] Embedding modeli (MiniLM)
- [ ] Model eğitimi pipeline'ı
- [ ] Kullanıcı feedback mekanizması
- [ ] Model güncelleme sistemi

## 📄 Lisans

MIT

# cleanlinkedinfeed
