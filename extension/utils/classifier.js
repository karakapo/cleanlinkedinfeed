// ONNX model tabanlı sınıflandırıcı
// ONNX.js ve Transformers.js kullanarak gerçek ML modeli çalıştırır
// Best Practice: IIFE pattern - Chrome Extension'da script tag ile yüklenebilir

(function() {
  'use strict';
  
  console.log('[ONNX Classifier] Script başlatılıyor...');
  
  try {

  class ONNXClassifier {
    constructor() {
      this.onnxSession = null;
      this.embeddingModel = null;
      this.metadata = null;
      this.isInitialized = false;
      this.initPromise = null;
      this.useSimpleEmbedding = false;
    }

    async init() {
      if (this.initPromise) {
        return this.initPromise;
      }

      this.initPromise = this._initialize();
      return this.initPromise;
    }

    async _initialize() {
      try {
        // Metadata'yı yükle
        const metadataUrl = chrome.runtime.getURL('models/model_metadata.json');
        const metadataResponse = await fetch(metadataUrl);
        this.metadata = await metadataResponse.json();

        // ONNX.js'i kontrol et (manifest'ten yüklenmiş olmalı)
        if (typeof ort === 'undefined') {
          // Manifest'ten yüklenmediyse, script tag ile yükle
          const onnxScriptUrl = chrome.runtime.getURL('utils/onnxruntime-web.min.js');
          await this._loadScript(onnxScriptUrl);
        } else {
          console.log('[ONNX Classifier] ONNX.js manifest\'ten yüklendi');
        }

        // ONNX modelini yükle
        // Backend belirtmeden bırak - ONNX.js otomatik olarak mevcut backend'i seçer
        // Local'de çalışıyorsa, muhtemelen WASM backend'i seçilecek
        const modelUrl = chrome.runtime.getURL('models/classifier_model.onnx');
        
        // Execution providers belirtmeden bırak - ONNX.js otomatik seçim yapar
        // Eğer hiç backend yoksa, hata fırlatılır ve fallback classifier kullanılır
        this.onnxSession = await ort.InferenceSession.create(modelUrl);
        console.log('[ONNX Classifier] Model yüklendi (otomatik backend seçimi)');

        // Transformers.js'i yükle (embedding için)
        // Transformers.js ES module olarak yüklenir, bu yüzden dynamic import kullanıyoruz
        try {
          // Transformers.js'i dynamic import ile yükle
          // Chrome Extension'da CDN'den import yapmak için CSP ayarları gerekli
          const transformersModule = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.6.0/dist/transformers.min.js');
          const { pipeline } = transformersModule;
          
          // Embedding modelini yükle
          this.embeddingModel = await pipeline(
            'feature-extraction',
            'Xenova/all-MiniLM-L6-v2', // sentence-transformers/all-MiniLM-L6-v2'ın Transformers.js versiyonu
            { quantized: true } // Daha küçük model boyutu için
          );
        } catch (transformersError) {
          console.warn('[ONNX Classifier] Transformers.js yüklenemedi, basit embedding kullanılacak:', transformersError);
          // Fallback: Basit embedding kullan (TF-IDF benzeri)
          this.embeddingModel = null;
          this.useSimpleEmbedding = true;
        }

        this.isInitialized = true;
        console.log('[ONNX Classifier] Model yüklendi ve hazır');
      } catch (error) {
        console.error('[ONNX Classifier] İlk yükleme hatası:', error);
        throw error;
      }
    }

    _loadScript(src) {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }

    async _ensureInitialized() {
      if (!this.isInitialized) {
        await this.init();
      }
    }

    async _generateEmbedding(text) {
      await this._ensureInitialized();
      
      try {
        let embedding;

        if (this.useSimpleEmbedding || !this.embeddingModel) {
          // Basit embedding (fallback)
          embedding = this._simpleEmbedding(text);
        } else {
          // Transformers.js ile embedding oluştur
          const output = await this.embeddingModel(text, {
            pooling: 'mean',
            normalize: true,
          });

          // Tensor'dan array'e dönüştür
          if (output.data) {
            embedding = Array.from(output.data);
          } else if (Array.isArray(output)) {
            embedding = output;
          } else if (output instanceof Float32Array || output instanceof Float64Array) {
            embedding = Array.from(output);
          } else {
            // Tensor objesi ise
            embedding = Array.from(output);
          }
        }

        // 384 boyutlu embedding olduğundan emin ol
        if (embedding.length !== this.metadata.embedding_dim) {
          console.warn(`[ONNX Classifier] Embedding boyutu beklenenden farklı: ${embedding.length} vs ${this.metadata.embedding_dim}`);
          // Boyutu ayarla (kırp veya pad)
          if (embedding.length > this.metadata.embedding_dim) {
            embedding = embedding.slice(0, this.metadata.embedding_dim);
          } else {
            while (embedding.length < this.metadata.embedding_dim) {
              embedding.push(0);
            }
          }
        }

        return new Float32Array(embedding);
      } catch (error) {
        console.error('[ONNX Classifier] Embedding oluşturma hatası:', error);
        // Fallback to simple embedding
        return new Float32Array(this._simpleEmbedding(text));
      }
    }

    _simpleEmbedding(text) {
      // Basit embedding (TF-IDF benzeri, 384 boyutlu)
      // Bu, Transformers.js yüklenemediğinde fallback olarak kullanılır
      const embeddingDim = this.metadata?.embedding_dim || 384;
      const words = text.toLowerCase().split(/\s+/);
      const embedding = new Array(embeddingDim).fill(0);
      
      // Basit hash-based embedding
      words.forEach((word, wordIndex) => {
        let hash = 0;
        for (let i = 0; i < word.length; i++) {
          hash = ((hash << 5) - hash) + word.charCodeAt(i);
          hash = hash & hash; // Convert to 32bit integer
        }
        const index = Math.abs(hash) % embeddingDim;
        embedding[index] += 1.0 / (wordIndex + 1); // TF benzeri
      });

      // Normalize
      const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
      if (norm > 0) {
        return embedding.map(val => val / norm);
      }
      return embedding;
    }

    async classify(text) {
      await this._ensureInitialized();

      try {
        // Embedding oluştur
        const embedding = await this._generateEmbedding(text);

        // ONNX model input'u hazırla
        const inputTensor = new ort.Tensor('float32', embedding, [1, this.metadata.embedding_dim]);
        const feeds = { [this.metadata.input_name]: inputTensor };

        // Model çalıştır
        const results = await this.onnxSession.run(feeds);
        const output = results[this.onnxSession.outputNames[0]];

        // Output'u array'e dönüştür
        const probabilities = Array.from(output.data);
        
        // En yüksek olasılıklı sınıfı bul
        const maxIndex = probabilities.indexOf(Math.max(...probabilities));
        const predictedCategory = this.metadata.classes[maxIndex];
        const confidence = probabilities[maxIndex];

        // Tüm sınıflar için skorları oluştur
        const scores = {};
        this.metadata.classes.forEach((className, index) => {
          scores[className] = probabilities[index];
        });

        return {
          category: predictedCategory,
          confidence: confidence,
          scores: scores
        };
      } catch (error) {
        console.error('[ONNX Classifier] Sınıflandırma hatası:', error);
        // Fallback: basit keyword-based sınıflandırma
        return this._fallbackClassify(text);
      }
    }

    _fallbackClassify(text) {
      // Basit fallback classifier (hata durumunda)
      const lowerText = text.toLowerCase();
      if (lowerText.includes('urgent') || lowerText.includes('click here')) {
        return { category: 'spam', confidence: 0.7, scores: { spam: 0.7, genuine: 0.3 } };
      }
      return { category: 'genuine', confidence: 0.5, scores: { genuine: 0.5 } };
    }

    // Filtreleme seviyesine göre eşik değeri
    shouldFilter(result, filterLevel = 'medium') {
      const thresholds = {
        'light': 0.8,
        'medium': 0.6,
        'aggressive': 0.4
      };

      const threshold = thresholds[filterLevel] || 0.6;
      const unwantedCategories = ['spam', 'self-promo', 'motivational-trash', 'advertisement'];
      
      return unwantedCategories.includes(result.category) && result.confidence >= threshold;
    }
  }

    // Global namespace'e export et (script tag ile yükleme için)
    window.SimpleClassifier = ONNXClassifier;
    console.log('[ONNX Classifier] ✅ SimpleClassifier window\'a eklendi:', typeof window.SimpleClassifier);
    
    // ES6 module export (eğer bundler kullanılıyorsa)
    if (typeof module !== 'undefined' && module.exports) {
      module.exports = { SimpleClassifier: ONNXClassifier };
    }
    
    console.log('[ONNX Classifier] ✅ Script başarıyla yüklendi');
  } catch (error) {
    console.error('[ONNX Classifier] ❌ Script hatası:', error);
    console.error('[ONNX Classifier] Hata detayı:', error.message, error.stack);
    // Hata durumunda bile window.SimpleClassifier'ı tanımlamaya çalış
    // Böylece fallback kullanılabilir
  }
})();

