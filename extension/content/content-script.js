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
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('utils/classifier.js');
    script.onload = function() {
      if (window.SimpleClassifier) {
        SimpleClassifier = window.SimpleClassifier;
        // Feed cleaner'ı yeniden başlat
        if (window[FEED_CLEANER_NS]) {
          window[FEED_CLEANER_NS].classifier = new SimpleClassifier();
        }
      }
    };
    script.onerror = function() {
      console.warn('[Feed Cleaner] Classifier script load failed, using fallback');
    };
    (document.head || document.documentElement).appendChild(script);
  }
  
  // Önce global namespace'den kontrol et (script tag ile yüklenmiş olabilir)
  if (window.SimpleClassifier) {
    SimpleClassifier = window.SimpleClassifier;
    initFeedCleaner();
  } else {
    // Fallback classifier kullan
    SimpleClassifier = createFallbackClassifier();
    initFeedCleaner();
    
    // Classifier script'ini dinamik olarak yükle
    loadClassifierScript();
  }

  function createFallbackClassifier() {
    // Fallback classifier (basit keyword-based)
    return {
      classify: function(text) {
        const lowerText = text.toLowerCase();
        if (lowerText.includes('urgent') || lowerText.includes('click here')) {
          return { category: 'spam', confidence: 0.8 };
        }
        return { category: 'genuine', confidence: 0.5 };
      },
      shouldFilter: function(result, level) {
        return result.category === 'spam' && result.confidence > 0.6;
      }
    };
  }

  function initFeedCleaner() {
    new FeedCleaner();
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
        // Classifier'ı bekle ve yükle
        if (!SimpleClassifier) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // ONNX Classifier'ı oluştur ve başlat
        this.classifier = new SimpleClassifier();
        await this.classifier.init(); // ONNX modelini yükle
        
        // Ayarları yükle
        const result = await chrome.storage.local.get(['filterEnabled', 'filterLevel', 'stats']);
        this.filterEnabled = result.filterEnabled !== false;
        this.filterLevel = result.filterLevel || 'medium';
        this.stats = result.stats || { filtered: 0, total: 0 };

        // Feed'i izle
        this.observeFeed();
        
        // Mevcut postları işle (debounced)
        this.debouncedProcessPosts();

        // Mesaj dinleyicisi
        this.setupMessageListener();
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
      if (!this.filterEnabled || !this.classifier) return;

      try {
        // LinkedIn post elementlerini bul (güncel selector'lar)
        const postElements = document.querySelectorAll(
          '[data-testid="feed-shared-update-v2"], ' +
          '.feed-shared-update-v2, ' +
          'article[data-urn], ' +
          '.update-components-actor, ' +
          '.feed-shared-update, ' +
          'div[data-urn*="urn:li:activity"]'
        );
        
        const newPosts = Array.from(postElements).filter(element => {
          // WeakSet ile kontrol (memory efficient)
          if (this.processedPosts.has(element)) return false;
          this.processedPosts.add(element);
          return true;
        });

        if (newPosts.length === 0) return;

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
        if (!content || content.length < 10) return;

        this.stats.total++;
        
        // Sınıflandır (async - ONNX model kullanıyor)
        const result = await this.classifier.classify(content);
        
        // Filtrele
        if (this.classifier.shouldFilter(result, this.filterLevel)) {
          this.hidePost(element);
          this.stats.filtered++;
          
          // Best Practice: Batch storage updates
          this.updateStats();
          
          // Debug logging (production'da kapatılabilir)
          if (chrome.runtime.getManifest().version.includes('dev')) {
            console.log(`[Feed Cleaner] Filtrelendi: ${result.category} (${(result.confidence * 100).toFixed(1)}%)`);
          }
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
      const contentSelectors = [
        '.feed-shared-text__text-view',
        '.feed-shared-update-v2__description',
        '[data-testid="feed-shared-text"]',
        '.update-components-text',
        '.feed-shared-text-view',
        '.feed-shared-text',
        '.update-components-text__text-view',
        '.feed-shared-inline-show-more-text',
        '.break-words span[dir="ltr"]'
      ];

      for (const selector of contentSelectors) {
        const contentEl = element.querySelector(selector);
        if (contentEl) {
          // Best Practice: textContent kullan (XSS koruması)
          return contentEl.textContent.trim();
        }
      }

      // Fallback: tüm metni al (dikkatli kullan)
      return element.textContent.trim();
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
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        window[FEED_CLEANER_NS] = new FeedCleaner();
      });
    } else {
      window[FEED_CLEANER_NS] = new FeedCleaner();
    }
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

