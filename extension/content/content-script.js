// Content script - LinkedIn feed'ini izler ve filtreler
// Best Practice: IIFE pattern kullan (ES6 modules Chrome Extension'da direkt çalışmayabilir)
(function() {
  'use strict';

  // Global namespace pollution önleme
  const FEED_CLEANER_NS = 'feedCleaner';
  
  // Classifier'ı yükle
  // Best Practice: Chrome Extension'da ES6 modules direkt çalışmaz
  // Production'da bundler kullanılmalı veya script tag ile yüklenmeli
  let SimpleClassifier;
  
  function loadClassifierScript() {
    // Script artık manifest'te content script olarak yükleniyor
    // Bu yüzden window.SimpleClassifier direkt erişilebilir olmalı
    console.log('[Feed Cleaner] Classifier script manifest\'ten yüklendi, kontrol ediliyor...');
    
    // Script yüklendikten sonra kontrol et
    if (window.SimpleClassifier && typeof window.SimpleClassifier === 'function') {
      SimpleClassifier = window.SimpleClassifier;
      console.log('[Feed Cleaner] ✅ ONNX Classifier yüklendi ve hazır');
      // Feed cleaner'ı yeniden başlat (eğer zaten başlatılmışsa)
      if (window[FEED_CLEANER_NS] && window[FEED_CLEANER_NS].classifier) {
        // Mevcut classifier'ı yeniden oluştur
        window[FEED_CLEANER_NS].classifier = new SimpleClassifier();
        window[FEED_CLEANER_NS].classifier.init().then(() => {
          console.log('[Feed Cleaner] ✅ ONNX Classifier ile güncellendi');
          // Mevcut postları yeniden işle
          window[FEED_CLEANER_NS].debouncedProcessPosts();
        }).catch(err => {
          console.error('[Feed Cleaner] ONNX Classifier init hatası:', err);
        });
      }
    } else {
      console.warn('[Feed Cleaner] ⚠️ window.SimpleClassifier bulunamadı');
      console.warn('[Feed Cleaner] window.SimpleClassifier tipi:', typeof window.SimpleClassifier);
      console.warn('[Feed Cleaner] Fallback classifier kullanılıyor');
    }
  }
  
  // Fallback classifier class (basit keyword-based)
  class FallbackClassifier {
    async init() {
      // Fallback için init gerekmez
      console.log('[Feed Cleaner] Fallback classifier kullanılıyor (ONNX model yüklenene kadar)');
      return Promise.resolve();
    }
    
    async classify(text) {
      const lowerText = text.toLowerCase();
      if (lowerText.includes('urgent') || lowerText.includes('click here') || 
          lowerText.includes('free money') || lowerText.includes('click now')) {
        return { category: 'spam', confidence: 0.8 };
      }
      return { category: 'genuine', confidence: 0.5 };
    }
    
    shouldFilter(result, level) {
      const thresholds = {
        'light': 0.8,
        'medium': 0.6,
        'aggressive': 0.4
      };
      const threshold = thresholds[level] || 0.6;
      return result.category === 'spam' && result.confidence >= threshold;
    }
  }

  // Önce global namespace'den kontrol et (script tag ile yüklenmiş olabilir)
  if (!window.SimpleClassifier) {
    // Fallback classifier class'ını kullan
    SimpleClassifier = FallbackClassifier;
    
    // Classifier script'ini dinamik olarak yükle
    loadClassifierScript();
  } else {
    SimpleClassifier = window.SimpleClassifier;
  }

  class FeedCleaner {
    constructor() {
      this.classifier = null;
      this.filterEnabled = true;
      this.filterLevel = 'medium';
      this.processedPosts = new WeakSet(); // WeakSet: memory leak önleme
      this.observer = null;
      this.stats = { filtered: 0, total: 0 };
      this.debounceTimer = null;
      this.processingQueue = [];
      this.isProcessing = false;
      
      this.init();
    }

    async init() {
      try {
        console.log('[Feed Cleaner] Başlatılıyor...');
        
        // Classifier'ı bekle ve yükle
        if (!SimpleClassifier) {
          console.log('[Feed Cleaner] Classifier bekleniyor...');
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // ONNX Classifier'ı oluştur ve başlat
        console.log('[Feed Cleaner] Classifier oluşturuluyor...');
        if (typeof SimpleClassifier !== 'function') {
          throw new Error('SimpleClassifier is not a constructor. Type: ' + typeof SimpleClassifier);
        }
        this.classifier = new SimpleClassifier();
        await this.classifier.init(); // ONNX modelini yükle
        console.log('[Feed Cleaner] Classifier hazır');
        
        // Ayarları yükle
        const result = await chrome.storage.local.get(['filterEnabled', 'filterLevel', 'stats']);
        this.filterEnabled = result.filterEnabled !== false;
        this.filterLevel = result.filterLevel || 'medium';
        this.stats = result.stats || { filtered: 0, total: 0 };
        console.log('[Feed Cleaner] Ayarlar yüklendi:', { filterEnabled: this.filterEnabled, filterLevel: this.filterLevel });

        // Feed'i izle
        this.observeFeed();
        console.log('[Feed Cleaner] Feed izleme başlatıldı');
        
        // Mevcut postları işle (debounced)
        this.debouncedProcessPosts();

        // Mesaj dinleyicisi
        this.setupMessageListener();
        console.log('[Feed Cleaner] ✅ Başlatma tamamlandı');
      } catch (error) {
        this.logError('Initialization error', error);
      }
    }

    setupMessageListener() {
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        // Best Practice: Message validation
        if (!message || typeof message.action !== 'string') {
          sendResponse({ success: false, error: 'Invalid message' });
          return false;
        }

        // Best Practice: Sender validation
        if (sender.origin && !sender.origin.includes('linkedin.com') && 
            sender.origin !== 'chrome-extension://' + chrome.runtime.id) {
          sendResponse({ success: false, error: 'Unauthorized origin' });
          return false;
        }

        try {
          if (message.action === 'toggleFilter') {
            this.filterEnabled = message.enabled;
            sendResponse({ success: true });
          } else if (message.action === 'updateFilterLevel') {
            this.filterLevel = message.level;
            this.debouncedProcessPosts();
            sendResponse({ success: true });
          } else {
            sendResponse({ success: false, error: 'Unknown action' });
          }
        } catch (error) {
          this.logError('Message handler error', error);
          sendResponse({ success: false, error: error.message });
        }
        
        return true; // Async response için
      });
    }

    observeFeed() {
      // Best Practice: Efficient observer
      const observer = new MutationObserver((mutations) => {
        // Sadece yeni node'lar varsa işle
        const hasNewNodes = mutations.some(mutation => 
          mutation.addedNodes.length > 0
        );
        
        if (hasNewNodes) {
          this.debouncedProcessPosts();
        }
      });

      // Feed container'ı bul (LinkedIn'in yapısına göre)
      const findFeedContainer = () => {
        const selectors = [
          '[data-testid="feed-container"]',
          '.scaffold-finite-scroll__content',
          'main[role="main"]',
          '.feed-container',
          '.scaffold-layout__main',
          '#main-content',
          'div[role="main"]'
        ];
        
        for (const selector of selectors) {
          const container = document.querySelector(selector);
          if (container) return container;
        }
        return document.body;
      };

      const feedContainer = findFeedContainer();
      
      if (feedContainer) {
        observer.observe(feedContainer, {
          childList: true,
          subtree: true
        });
        this.observer = observer;
      }
    }

    // Best Practice: Debouncing
    debouncedProcessPosts() {
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }
      
      this.debounceTimer = setTimeout(() => {
        this.processExistingPosts();
      }, 300); // 300ms debounce
    }

    processExistingPosts() {
      if (!this.filterEnabled) {
        console.log('[Feed Cleaner] Filtreleme kapalı');
        return;
      }
      
      if (!this.classifier) {
        console.log('[Feed Cleaner] Classifier henüz hazır değil');
        return;
      }

      try {
        // LinkedIn post elementlerini bul (güncel selector'lar)
        // HTML yapısına göre: .fie-impression-container ana container
        // Strateji: Önce içerik container'larını bul, sonra parent'larını al
        
        let postElements = [];
        let workingSelectors = [];
        
        // 1. Ana post container'larını direkt bul
        const containerSelectors = [
          '.fie-impression-container',  // Ana post container (yeni yapı)
          '[data-testid="feed-shared-update-v2"]',
          '.feed-shared-update-v2',
          'article[data-urn]',
          'div[data-urn*="urn:li:activity"]',
          'div[data-urn*="urn:li:share"]',
          'article[data-id]'
        ];
        
        for (const selector of containerSelectors) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            workingSelectors.push(selector);
            postElements.push(...Array.from(elements));
          }
        }
        
        // 2. İçerik container'larını bul ve parent'larını al
        const contentSelectors = [
          '.feed-shared-inline-show-more-text',
          '.feed-shared-update-v2__description',
          '.update-components-update-v2__commentary',
          '.update-components-text'
        ];
        
        for (const selector of contentSelectors) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            workingSelectors.push(selector + ' (parent)');
            elements.forEach(el => {
              // En yakın post container'ını bul
              let parent = el.closest('.fie-impression-container') || 
                          el.closest('[data-testid="feed-shared-update-v2"]') ||
                          el.closest('.feed-shared-update-v2') ||
                          el.closest('article[data-urn]') ||
                          el.closest('div[data-urn*="urn:li"]') ||
                          el.closest('article') ||
                          el.parentElement?.parentElement?.parentElement?.parentElement; // 4 seviye yukarı
              if (parent) {
                postElements.push(parent);
              }
            });
          }
        }
        
        // Duplicate'leri kaldır (aynı element birden fazla selector ile bulunmuş olabilir)
        postElements = Array.from(new Set(postElements));
        
        if (postElements.length > 0) {
          console.log(`[Feed Cleaner] Toplam ${postElements.length} post container bulundu`);
          if (workingSelectors.length > 0) {
            console.log(`[Feed Cleaner] Çalışan selector'lar:`, workingSelectors.slice(0, 3).join(', '), workingSelectors.length > 3 ? '...' : '');
          }
        }
        
        if (postElements.length === 0) {
          console.warn('[Feed Cleaner] ⚠️ Hiç post bulunamadı! LinkedIn DOM yapısı değişmiş olabilir.');
          // Debug: Tüm article ve div elementlerini say
          const allArticles = document.querySelectorAll('article');
          const allDivsWithDataUrn = document.querySelectorAll('div[data-urn]');
          const allImpressionContainers = document.querySelectorAll('.fie-impression-container');
          console.log(`[Feed Cleaner] Debug - Toplam article: ${allArticles.length}, data-urn div: ${allDivsWithDataUrn.length}, impression-container: ${allImpressionContainers.length}`);
          if (allImpressionContainers.length > 0) {
            console.log('[Feed Cleaner] ✅ .fie-impression-container bulundu! Selector güncellenmeli.');
          }
          return;
        }
        
        const newPosts = Array.from(postElements).filter(element => {
          // WeakSet ile kontrol (memory efficient)
          if (this.processedPosts.has(element)) return false;
          this.processedPosts.add(element);
          return true;
        });

        if (newPosts.length > 0) {
          console.log(`[Feed Cleaner] ✅ ${newPosts.length} yeni post bulundu ve işleniyor...`);
        }

        if (newPosts.length === 0) {
          // Sessizce devam et (çok fazla log olmasın)
          return;
        }

        // Best Practice: Batch processing
        this.addToQueue(newPosts);
        this.processQueue();
      } catch (error) {
        this.logError('Process posts error', error);
      }
    }

    addToQueue(posts) {
      this.processingQueue.push(...posts);
    }

    async processQueue() {
      if (this.isProcessing || this.processingQueue.length === 0) return;
      
      this.isProcessing = true;
      const batchSize = 5; // Batch size
      
      while (this.processingQueue.length > 0) {
        const batch = this.processingQueue.splice(0, batchSize);
        
        // Paralel işleme
        await Promise.all(batch.map(post => this.processPost(post)));
        
        // UI'ı bloklamamak için
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      
      this.isProcessing = false;
    }

    async processPost(element) {
      try {
        // Post içeriğini çıkar
        const content = this.extractPostContent(element);
        if (!content || content.length < 10) {
          // Sessizce devam et (çok fazla log olmasın)
          return;
        }

        this.stats.total++;
        
        // Sınıflandır (async - ONNX model kullanıyor)
        const result = await this.classifier.classify(content);
        
        // Filtrele
        if (this.classifier.shouldFilter(result, this.filterLevel)) {
          this.hidePost(element);
          this.stats.filtered++;
          
          // Best Practice: Batch storage updates
          this.updateStats();
          
          // Debug logging (sadece filtrelenenler için)
          console.log(`[Feed Cleaner] 🚫 Filtrelendi: ${result.category} (${(result.confidence * 100).toFixed(1)}%) - "${content.substring(0, 60)}..."`);
        } else if (this.stats.total <= 5) {
          // İlk 5 post için debug (hangi classifier kullanıldığını görmek için)
          console.log(`[Feed Cleaner] ✓ Gösteriliyor: ${result.category} (${(result.confidence * 100).toFixed(1)}%)`);
        }
      } catch (error) {
        this.logError('Process post error', error, { element });
        // Graceful degradation: Hata durumunda post'u göster
      }
    }

    // Best Practice: Debounced storage updates
    updateStats() {
      if (this.statsUpdateTimer) {
        clearTimeout(this.statsUpdateTimer);
      }
      
      this.statsUpdateTimer = setTimeout(async () => {
        try {
          await chrome.storage.local.set({ stats: this.stats });
        } catch (error) {
          this.logError('Storage update error', error);
        }
      }, 1000); // 1 saniyede bir güncelle
    }

    extractPostContent(element) {
      // Best Practice: Specific selectors (güncel LinkedIn selector'ları)
      // HTML yapısına göre: .update-components-text > .break-words > span[dir="ltr"]
      const contentSelectors = [
        // En spesifik: Gerçek metin içeriği
        '.update-components-text .break-words span[dir="ltr"]',
        '.update-components-update-v2__commentary .break-words span[dir="ltr"]',
        '.break-words span[dir="ltr"]',
        // Metin container'ları
        '.update-components-text',
        '.update-components-update-v2__commentary',
        '.feed-shared-inline-show-more-text .update-components-text',
        // Eski selector'lar (fallback)
        '.feed-shared-text__text-view',
        '.feed-shared-update-v2__description',
        '[data-testid="feed-shared-text"]',
        '.feed-shared-text-view',
        '.feed-shared-text',
        '.update-components-text__text-view',
        '.feed-shared-inline-show-more-text',
        '.feed-shared-text-view span',
        '.update-components-text__text-view span',
        'span[dir="ltr"]',
        '.feed-shared-text__text-view span'
      ];

      for (const selector of contentSelectors) {
        const contentEl = element.querySelector(selector);
        if (contentEl) {
          const text = contentEl.textContent.trim();
          // Metni temizle (gereksiz boşlukları kaldır)
          const cleanedText = text.replace(/\s+/g, ' ').trim();
          if (cleanedText.length >= 10) {
            // Best Practice: textContent kullan (XSS koruması)
            return cleanedText;
          }
        }
      }

      // Fallback: tüm metni al (dikkatli kullan)
      // Ama önce header, footer gibi gereksiz kısımları çıkar
      const tempEl = element.cloneNode(true);
      // Header ve footer elementlerini kaldır
      const toRemove = tempEl.querySelectorAll('.update-components-header, .feed-shared-social-action-bar, .update-v2-social-activity, .social-details-social-counts');
      toRemove.forEach(el => el.remove());
      
      const fallbackText = tempEl.textContent.trim().replace(/\s+/g, ' ').trim();
      if (fallbackText.length >= 10) {
        return fallbackText;
      }
      
      // Sadece uyarı ver (çok fazla log olmasın)
      if (this.stats.total % 10 === 0) { // Her 10 post'ta bir uyarı
        console.warn('[Feed Cleaner] Bazı postların içeriği çıkarılamadı');
      }
      return null;
    }

    hidePost(element) {
      try {
        // Best Practice: CSS class kullan (style direkt değiştirmek yerine)
        element.classList.add('feed-cleaner-hidden');
        element.setAttribute('data-feed-cleaner-hidden', 'true');
        
        // Smooth fade out (opsiyonel)
        element.style.transition = 'opacity 0.3s ease-out';
        element.style.opacity = '0';
        
        setTimeout(() => {
          element.style.display = 'none';
        }, 300);
      } catch (error) {
        this.logError('Hide post error', error);
      }
    }

    showPost(element) {
      try {
        element.classList.remove('feed-cleaner-hidden');
        element.removeAttribute('data-feed-cleaner-hidden');
        element.style.display = '';
        element.style.opacity = '1';
      } catch (error) {
        this.logError('Show post error', error);
      }
    }

    // Best Practice: Error logging
    logError(context, error, details = {}) {
      const errorInfo = {
        timestamp: new Date().toISOString(),
        context,
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name
        },
        details,
        extensionVersion: chrome.runtime.getManifest().version
      };
      
      console.error('[Feed Cleaner]', errorInfo);
      
      // Production'da error tracking servisine gönderilebilir
    }

    // Best Practice: Cleanup
    cleanup() {
      if (this.observer) {
        this.observer.disconnect();
        this.observer = null;
      }
      
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = null;
      }
      
      if (this.statsUpdateTimer) {
        clearTimeout(this.statsUpdateTimer);
        this.statsUpdateTimer = null;
      }
    }
  }

  // LinkedIn'de çalış
  if (window.location.hostname.includes('linkedin.com')) {
    // Sayfa yüklendiğinde başlat
    const initFeedCleaner = () => {
      window[FEED_CLEANER_NS] = new FeedCleaner();
      console.log('[Feed Cleaner] ✅ Extension yüklendi ve başlatıldı');
    };
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initFeedCleaner);
    } else {
      initFeedCleaner();
    }
    
    // Debug: Global erişim için
    window.feedCleanerDebug = {
      getStats: () => window[FEED_CLEANER_NS]?.stats || null,
      getStatus: () => ({
        enabled: window[FEED_CLEANER_NS]?.filterEnabled,
        level: window[FEED_CLEANER_NS]?.filterLevel,
        classifierReady: !!window[FEED_CLEANER_NS]?.classifier,
        processedPosts: window[FEED_CLEANER_NS]?.processedPosts?.size || 0
      }),
      testPostDetection: () => {
        const posts = document.querySelectorAll('.fie-impression-container, article[data-urn], div[data-urn*="urn:li"]');
        console.log(`[Feed Cleaner Debug] Bulunan post sayısı: ${posts.length}`);
        return posts.length;
      },
      forceProcess: () => {
        if (window[FEED_CLEANER_NS]) {
          window[FEED_CLEANER_NS].processExistingPosts();
          console.log('[Feed Cleaner Debug] Post işleme zorlandı');
        }
      }
    };
    console.log('[Feed Cleaner] Debug komutları hazır. Console\'da feedCleanerDebug yazarak kullanabilirsiniz.');
  }

  // Demo sayfası için
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.FeedCleaner = FeedCleaner;
  }

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    if (window[FEED_CLEANER_NS]) {
      window[FEED_CLEANER_NS].cleanup();
    }
  });

})();

