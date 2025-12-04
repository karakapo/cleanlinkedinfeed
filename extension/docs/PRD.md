# LinkedIn Feed Cleaner - Product Requirements Document (PRD)

## 1. Proje Özeti

LinkedIn Feed Cleaner, kullanıcıların LinkedIn feed'lerindeki düşük kaliteli içerikleri (spam, self-promo, motivational trash, reklamlar) otomatik olarak filtreleyen ve gizleyen bir Chrome eklentisidir. Eklenti, embedding tabanlı makine öğrenmesi modeli kullanarak postları sınıflandırır ve kullanıcı deneyimini iyileştirir.

## 2. Problem Tanımı

LinkedIn feed'leri genellikle şu tür içeriklerle doludur:
- **Spam**: İstenmeyen, tekrarlayan içerikler
- **Self-promotion**: Aşırı kişisel tanıtım içeren postlar
- **Motivational trash**: Yüzeysel motivasyonel içerikler
- **Advertisement**: Açık reklamlar
- **Genuine**: Değerli, gerçek içerikler

Bu durum, kullanıcıların değerli içeriklere ulaşmasını zorlaştırır ve zaman kaybına neden olur.

## 3. Çözüm Yaklaşımı

### 3.1 Teknik Mimari

1. **Embedding Model**: MiniLM veya benzeri hafif bir transformer modeli ile postları sabit boyutlu vektörlere dönüştürme
2. **Sınıflandırma Modeli**: Random Forest, Logistic Regression veya SVM gibi küçük ML modelleri ile sınıflandırma
3. **Chrome Extension**: Content script ile LinkedIn feed'ini izleme ve filtreleme
4. **Offline Çalışma**: Tüm işlemler tarayıcı içinde, internet bağlantısı olmadan çalışabilir

### 3.2 Model Eğitimi Süreci

1. **Veri Toplama**: LinkedIn postlarını manuel veya yarı-otomatik olarak toplama
2. **Etiketleme**: Postları kategorilere ayırma:
   - `spam`
   - `self-promo`
   - `motivational-trash`
   - `advertisement`
   - `genuine`
3. **Embedding Çıkarma**: Her postu embedding modeli ile vektöre dönüştürme
4. **Model Eğitimi**: Embedding'leri ML modeline besleyerek eğitim
5. **Model Optimizasyonu**: Model boyutunu ve performansını optimize etme

## 4. Özellikler

### 4.1 Temel Özellikler

- ✅ LinkedIn feed'ini otomatik tarama
- ✅ Post içeriğini embedding'e dönüştürme
- ✅ ML modeli ile sınıflandırma
- ✅ Düşük kaliteli postları otomatik gizleme
- ✅ Kullanıcı tercihlerine göre filtreleme seviyesi ayarlama
- ✅ Gizlenen postları görüntüleme/geri getirme seçeneği

### 4.2 Gelişmiş Özellikler (Gelecek)

- 📊 İstatistikler ve analitikler
- 🎯 Kullanıcı öğrenmesi (feedback loop)
- 🔄 Model güncellemeleri
- 🌐 Çoklu dil desteği
- ⚙️ Özelleştirilebilir filtre kuralları

## 5. Kullanıcı Akışı

1. Kullanıcı Chrome eklentisini yükler
2. Eklenti ilk açılışta kısa bir onboarding gösterir
3. Kullanıcı filtreleme seviyesini seçer (agresif, orta, hafif)
4. Eklenti arka planda LinkedIn feed'ini izlemeye başlar
5. Yeni postlar yüklendiğinde:
   - Content script post içeriğini yakalar
   - Embedding çıkarılır
   - ML modeli ile sınıflandırılır
   - Düşük kaliteli postlar otomatik gizlenir
6. Kullanıcı gizlenen postları görüntüleyebilir veya geri getirebilir

## 6. Teknik Gereksinimler

### 6.1 Teknolojiler

- **Frontend**: JavaScript/TypeScript, Chrome Extension API
- **ML Framework**: 
  - Transformers.js veya ONNX.js (embedding modeli için)
  - scikit-learn (model eğitimi için, Python)
- **Embedding Model**: sentence-transformers/all-MiniLM-L6-v2 veya benzeri
- **Sınıflandırma Modeli**: Random Forest / Logistic Regression / SVM
- **Model Format**: ONNX veya TensorFlow.js formatında

### 6.2 Chrome Extension Yapısı

```
linkedinfeedcleaner/
├── manifest.json
├── background/
│   └── service-worker.js
├── content/
│   └── content-script.js
├── popup/
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
├── models/
│   ├── embedding-model.onnx (veya .tflite)
│   └── classifier-model.onnx (veya .tflite)
├── utils/
│   ├── embedding.js
│   ├── classifier.js
│   └── dom-manipulator.js
└── docs/
    └── PRD.md
```

### 6.3 Model Gereksinimleri

- **Embedding Model**: 
  - Boyut: < 25MB
  - Çıktı boyutu: 384 veya 512 boyutlu vektör
  - Inference süresi: < 100ms (CPU'da)
  
- **Sınıflandırma Modeli**:
  - Boyut: < 5MB
  - Inference süresi: < 5ms
  - Doğruluk: > %85

## 7. Güvenlik ve Gizlilik

- ✅ Tüm işlemler tarayıcı içinde, lokal olarak yapılır
- ✅ Veri dışarı gönderilmez
- ✅ LinkedIn API kullanılmaz (sadece DOM manipülasyonu)
- ✅ Kullanıcı verileri saklanmaz
- ✅ Açık kaynak kod

## 8. Performans Analizi ve Donanım Kullanımı

### 8.1 Kullanıcı Deneyimi: Yavaşlık Hissi

**Kısa Cevap**: Hayır, kullanıcı yavaşlık hissetmez. İşlemler arka planda, asenkron olarak yapılır.

#### Senaryo 1: İlk Sayfa Yüklemesi
- **Model Yükleme**: İlk açılışta embedding modeli (~25MB) yüklenir
  - Süre: 1-2 saniye (model indirme + parse)
  - **Kullanıcı Etkisi**: Minimal - model arka planda yüklenir, sayfa normal hızda açılır
  - **Optimizasyon**: Model lazy loading ile sadece gerektiğinde yüklenir

#### Senaryo 2: Feed Scroll (Normal Kullanım)
- **Post İşleme**: Her yeni post görünür olduğunda işlenir
  - Embedding çıkarma: ~80-100ms per post
  - Sınıflandırma: ~3-5ms per post
  - **Toplam**: ~100ms per post
  - **Kullanıcı Etkisi**: **HİSSEDİLMEZ** - işlemler arka planda, post zaten görünür durumda
  - **Optimizasyon**: 
    - Batch processing (5-10 post birlikte işlenir)
    - Debouncing (scroll durduğunda işleme)
    - RequestIdleCallback kullanımı (tarayıcı boşta iken işleme)

#### Senaryo 3: Hızlı Scroll
- **Durum**: Kullanıcı hızlıca scroll yapıyor
- **Strateji**: 
  - Görünür alandaki postlar öncelikli işlenir
  - Görünmeyen postlar daha sonra işlenir
  - İşlem kuyruğu yönetimi ile CPU yükü kontrol edilir
- **Kullanıcı Etkisi**: Yok - scroll akıcı kalır

### 8.2 Donanım Kullanımı

#### RAM (Bellek) Kullanımı

| Bileşen | Boyut | Açıklama |
|---------|-------|----------|
| Embedding Model | ~25MB | Model ağırlıkları (ONNX formatında) |
| Classifier Model | ~5MB | Sınıflandırma modeli |
| JavaScript Runtime | ~30-50MB | Chrome V8 engine, extension kodları |
| Geçici Veriler | ~10-20MB | İşlenen post embedding'leri (cache) |
| **TOPLAM** | **~70-100MB** | Normal kullanımda |

**Not**: 
- Model ağırlıkları memory-mapped olarak yüklenebilir (disk'ten okuma)
- Cache temizleme mekanizması ile eski embedding'ler silinir
- **Gerçekçi kullanım**: 50-80MB (optimize edilmiş)

#### CPU Kullanımı

**Normal Durum (İdle)**:
- CPU kullanımı: ~0-1%
- Eklenti sadece DOM değişikliklerini dinler

**Aktif İşleme (Post işlenirken)**:
- **Embedding çıkarma**: 
  - CPU: %5-15 (tek çekirdek)
  - Süre: 80-100ms per post
  - **Optimizasyon**: Web Workers ile ana thread'i bloklamaz
  
- **Sınıflandırma**:
  - CPU: %1-3 (tek çekirdek)
  - Süre: 3-5ms per post
  - Ana thread'i bloklamaz

**Toplam CPU Etkisi**:
- **Ortalama**: %2-5 (işlem sırasında)
- **Peak**: %10-15 (ilk yükleme, batch processing)
- **Kullanıcı Etkisi**: Minimal - işlemler kısa süreli ve arka planda

#### GPU Kullanımı (Opsiyonel)

- **WebGL/WebGPU**: ONNX.js GPU acceleration desteği
- **Avantaj**: CPU yükünü %50-70 azaltır
- **Dezavantaj**: Daha fazla RAM kullanımı (~50MB ek)
- **Tavsiye**: Opsiyonel, varsayılan olarak CPU kullanımı

### 8.3 Performans Optimizasyon Stratejileri

#### 1. Lazy Loading
```javascript
// Model sadece gerektiğinde yüklenir
if (postVisible && !modelLoaded) {
  await loadEmbeddingModel(); // Async, non-blocking
}
```

#### 2. Batch Processing
```javascript
// 5-10 post birlikte işlenir
const posts = getVisiblePosts().slice(0, 10);
await processBatch(posts); // Paralel işleme
```

#### 3. Debouncing & Throttling
```javascript
// Scroll durduğunda işleme
const debouncedProcess = debounce(processPosts, 300ms);
window.addEventListener('scroll', debouncedProcess);
```

#### 4. RequestIdleCallback
```javascript
// Tarayıcı boşta iken işleme
requestIdleCallback(() => {
  processPendingPosts();
}, { timeout: 2000 });
```

#### 5. Web Workers
```javascript
// Ana thread'i bloklamadan işleme
const worker = new Worker('embedding-worker.js');
worker.postMessage({ post: postText });
```

#### 6. Caching
```javascript
// Aynı post tekrar işlenmez
const cache = new Map();
if (cache.has(postId)) {
  return cache.get(postId);
}
```

### 8.4 Gerçekçi Performans Senaryoları

#### Senaryo A: Orta Seviye Laptop (Intel i5, 8GB RAM)
- **Sayfa yükleme**: +0.5-1 saniye (ilk açılış, model yükleme)
- **Scroll performansı**: Etkilenmez, akıcı
- **RAM kullanımı**: +60-80MB
- **CPU kullanımı**: +3-7% (işlem sırasında)
- **Kullanıcı Deneyimi**: ✅ **Yavaşlık hissedilmez**

#### Senaryo B: Düşük Seviye Laptop (Intel i3, 4GB RAM)
- **Sayfa yükleme**: +1-2 saniye (ilk açılış)
- **Scroll performansı**: Minimal etki (debouncing ile optimize)
- **RAM kullanımı**: +50-70MB (daha agresif cache temizleme)
- **CPU kullanımı**: +5-10% (işlem sırasında)
- **Kullanıcı Deneyimi**: ✅ **Kabul edilebilir**, hafif gecikme olabilir

#### Senaryo C: Yüksek Seviye Desktop (Intel i7/i9, 16GB+ RAM)
- **Sayfa yükleme**: +0.2-0.5 saniye
- **Scroll performansı**: Hiç etkilenmez
- **RAM kullanımı**: +70-100MB
- **CPU kullanımı**: +1-3% (işlem sırasında)
- **Kullanıcı Deneyimi**: ✅✅ **Mükemmel**, hiçbir etki yok

### 8.5 Performans Hedefleri (Güncellenmiş)

- **Sayfa yükleme etkisi**: 
  - İlk açılış: < 2 saniye (model yükleme)
  - Sonraki açılışlar: < 0.5 saniye (cache'den)
- **Post işleme süresi**: < 100ms per post (embedding + classification)
- **Bellek kullanımı**: < 100MB (normal kullanımda)
- **CPU kullanımı**: 
  - İdle: < 1%
  - Aktif işleme: < 10% (peak)
  - Ortalama: < 5%
- **Kullanıcı deneyimi**: 
  - Scroll akıcılığı: %100 korunur
  - Sayfa yanıt süresi: Etkilenmez
  - Görsel gecikme: Yok

### 8.6 Performans İzleme

- **Metrics toplama**:
  - Model yükleme süresi
  - Post işleme süresi (ortalama, median, p95, p99)
  - CPU kullanımı
  - RAM kullanımı
  - Cache hit rate
- **Kullanıcı feedback**: Performans sorunları bildirimi
- **Otomatik optimizasyon**: Düşük performanslı cihazlarda daha agresif optimizasyon

## 9. Geliştirme Aşamaları

### Faz 1: MVP (Minimum Viable Product)
- [ ] Veri toplama ve etiketleme aracı
- [ ] Embedding model entegrasyonu
- [ ] Basit sınıflandırma modeli eğitimi
- [ ] Chrome Extension temel yapısı
- [ ] Content script ile post yakalama
- [ ] Temel filtreleme

### Faz 2: İyileştirmeler
- [ ] Model optimizasyonu
- [ ] Kullanıcı arayüzü geliştirme
- [ ] Filtreleme seviyesi ayarları
- [ ] Gizlenen postları görüntüleme
- [ ] Performans optimizasyonu

### Faz 3: Gelişmiş Özellikler
- [ ] Kullanıcı feedback mekanizması
- [ ] Model güncelleme sistemi
- [ ] İstatistikler ve analitikler
- [ ] Çoklu dil desteği

## 10. Başarı Metrikleri

- **Kullanıcı memnuniyeti**: > 4/5
- **Filtreleme doğruluğu**: > %85
- **Yanlış pozitif oranı**: < %5
- **Performans**: Hedeflere ulaşma
- **Kullanıcı sayısı**: İlk 3 ay içinde 1000+ aktif kullanıcı

## 11. Riskler ve Çözümler

### Risk 1: LinkedIn DOM yapısı değişiklikleri
**Çözüm**: Robust selector'lar kullanma, düzenli güncellemeler

### Risk 2: Model performansı
**Çözüm**: Sürekli model iyileştirme, kullanıcı feedback'i

### Risk 3: Performans sorunları
**Çözüm**: Model optimizasyonu, lazy loading, caching

### Risk 4: Chrome Extension politikaları
**Çözüm**: Chrome Web Store kurallarına uyum, şeffaflık

## 12. Gelecek Geliştirmeler

- 🤖 Daha gelişmiş ML modelleri (fine-tuned transformer)
- 📱 Firefox ve Edge desteği
- 🔗 Diğer sosyal medya platformları (Twitter, Facebook)
- 👥 Topluluk etiketleme sistemi
- 🎨 Özelleştirilebilir UI temaları
- 📈 Gelişmiş analitikler ve raporlama

## 13. Kaynaklar ve Referanslar

- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/)
- [Transformers.js](https://huggingface.co/docs/transformers.js)
- [Sentence Transformers](https://www.sbert.net/)
- [ONNX.js](https://onnxruntime.ai/docs/tutorials/web/)
- [scikit-learn](https://scikit-learn.org/)

---

**Versiyon**: 1.0  
**Son Güncelleme**: 2024  
**Durum**: Planlama Aşaması

