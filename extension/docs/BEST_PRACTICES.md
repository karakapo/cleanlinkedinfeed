# Chrome Extension Best Practices

Bu dokümantasyon, LinkedIn Feed Cleaner projesi için Chrome Extension geliştirme best practices'lerini içerir.

## 📋 İçindekiler

1. [Manifest V3](#manifest-v3)
2. [Güvenlik](#güvenlik)
3. [Performans](#performans)
4. [Kod Organizasyonu](#kod-organizasyonu)
5. [Error Handling](#error-handling)
6. [Storage Kullanımı](#storage-kullanımı)
7. [Content Scripts](#content-scripts)
8. [Background Service Workers](#background-service-workers)
9. [User Experience](#user-experience)
10. [Testing](#testing)

---

## 1. Manifest V3

### ✅ Doğru Kullanım

```json
{
  "manifest_version": 3,
  "name": "Extension Name",
  "version": "1.0.0",
  "description": "Clear description",
  "permissions": [
    "storage",
    "activeTab"
  ],
  "host_permissions": [
    "https://www.linkedin.com/*"
  ]
}
```

### ⚠️ Önemli Noktalar

- **Manifest V3 kullan**: Manifest V2 deprecated edildi
- **Minimal permissions**: Sadece gerekli izinleri iste
- **Host permissions**: Sadece gerekli domain'leri belirt
- **Version**: Semantic versioning kullan (MAJOR.MINOR.PATCH)

### ❌ Yapılmaması Gerekenler

```json
// ❌ Tüm sitelere erişim
"permissions": ["<all_urls>"]

// ❌ Gereksiz izinler
"permissions": ["tabs", "bookmarks", "history"]

// ❌ Manifest V2
"manifest_version": 2
```

---

## 2. Güvenlik

### Content Security Policy (CSP)

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  }
}
```

### Güvenli Kod Pratikleri

#### ✅ Güvenli Storage

```javascript
// ✅ Güvenli: Hassas veri saklama
await chrome.storage.local.set({ 
  settings: { filterLevel: 'medium' } 
});

// ❌ Güvenli değil: Hassas bilgileri storage'da saklama
await chrome.storage.local.set({ 
  password: userPassword 
});
```

#### ✅ XSS Koruması

```javascript
// ✅ Güvenli: textContent kullan
element.textContent = userInput;

// ❌ Güvenli değil: innerHTML kullan
element.innerHTML = userInput; // XSS riski!
```

#### ✅ Message Validation

```javascript
// ✅ Güvenli: Mesaj doğrulama
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Mesajı doğrula
  if (!message || typeof message.action !== 'string') {
    return false;
  }
  
  // Sender'ı kontrol et
  if (sender.origin !== 'https://www.linkedin.com') {
    return false;
  }
  
  // İşlemi yap
  handleMessage(message);
});
```

### Permissions Best Practices

- **Principle of Least Privilege**: Minimum gerekli izinler
- **ActiveTab**: Sadece aktif sekmede çalışıyorsa `activeTab` kullan
- **Host Permissions**: Spesifik domain'ler belirt, wildcard kullanma

---

## 3. Performans

### Lazy Loading

```javascript
// ✅ İyi: Model lazy loading
class ModelLoader {
  constructor() {
    this.model = null;
    this.loading = false;
  }

  async load() {
    if (this.model) return this.model;
    if (this.loading) return this.loading;
    
    this.loading = this._loadModel();
    this.model = await this.loading;
    return this.model;
  }

  async _loadModel() {
    // Model yükleme
    return await import('./model.js');
  }
}
```

### Debouncing & Throttling

```javascript
// ✅ İyi: Debouncing
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Scroll event için
const debouncedProcess = debounce(processPosts, 300);
window.addEventListener('scroll', debouncedProcess);
```

### Batch Processing

```javascript
// ✅ İyi: Batch processing
async function processBatch(posts, batchSize = 10) {
  for (let i = 0; i < posts.length; i += batchSize) {
    const batch = posts.slice(i, i + batchSize);
    await Promise.all(batch.map(post => processPost(post)));
    
    // UI'ı bloklamamak için
    await new Promise(resolve => setTimeout(resolve, 0));
  }
}
```

### RequestIdleCallback

```javascript
// ✅ İyi: Tarayıcı boşta iken işleme
function processWhenIdle(posts) {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      processPosts(posts);
    }, { timeout: 2000 });
  } else {
    // Fallback
    setTimeout(() => processPosts(posts), 0);
  }
}
```

### Memory Management

```javascript
// ✅ İyi: Memory leak önleme
class FeedCleaner {
  constructor() {
    this.observers = [];
    this.processedPosts = new WeakSet(); // WeakSet kullan
  }

  cleanup() {
    // Observer'ları temizle
    this.observers.forEach(obs => obs.disconnect());
    this.observers = [];
  }
}
```

---

## 4. Kod Organizasyonu

### Dosya Yapısı

```
extension/
├── manifest.json
├── background/
│   └── service-worker.js
├── content/
│   ├── content-script.js
│   └── content-style.css
├── popup/
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
├── utils/
│   ├── classifier.js
│   └── helpers.js
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

### ES6 Modules

⚠️ **Önemli**: Chrome Extension'da ES6 `import/export` direkt çalışmayabilir. Alternatifler:

1. **Bundler kullan** (Webpack, Rollup, Vite)
2. **IIFE pattern** kullan
3. **Dynamic import()** kullan (background/service worker'da)

```javascript
// ✅ İyi: Dynamic import
async function loadModule() {
  const module = await import('./utils/classifier.js');
  return module.SimpleClassifier;
}

// ✅ İyi: IIFE pattern
(function() {
  'use strict';
  
  const Classifier = {
    classify: function(text) {
      // ...
    }
  };
  
  window.Classifier = Classifier;
})();
```

---

## 5. Error Handling

### Try-Catch Blokları

```javascript
// ✅ İyi: Comprehensive error handling
async function processPost(post) {
  try {
    const result = await classifier.classify(post.content);
    return result;
  } catch (error) {
    console.error('[Feed Cleaner] Classification error:', error);
    
    // Kullanıcıya bildir (opsiyonel)
    // showNotification('Filtreleme hatası oluştu');
    
    // Fallback: Post'u göster
    return { category: 'genuine', confidence: 0 };
  }
}
```

### Error Logging

```javascript
// ✅ İyi: Structured logging
function logError(context, error, details = {}) {
  const errorInfo = {
    timestamp: new Date().toISOString(),
    context,
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name
    },
    details,
    userAgent: navigator.userAgent,
    extensionVersion: chrome.runtime.getManifest().version
  };
  
  console.error('[Feed Cleaner]', errorInfo);
  
  // Production'da error tracking servisine gönder
  // if (isProduction) sendToErrorTracking(errorInfo);
}
```

### Graceful Degradation

```javascript
// ✅ İyi: Feature detection
function initFeature() {
  if (!window.IntersectionObserver) {
    // Fallback: MutationObserver kullan
    return useMutationObserver();
  }
  return useIntersectionObserver();
}
```

---

## 6. Storage Kullanımı

### Storage Best Practices

```javascript
// ✅ İyi: Batch operations
async function saveSettings(settings) {
  await chrome.storage.local.set({ settings });
}

// ✅ İyi: Error handling
async function loadSettings() {
  try {
    const result = await chrome.storage.local.get(['settings']);
    return result.settings || getDefaultSettings();
  } catch (error) {
    console.error('Storage read error:', error);
    return getDefaultSettings();
  }
}

// ✅ İyi: Storage quota kontrolü
async function checkStorageQuota() {
  if (chrome.storage.local.QUOTA_BYTES) {
    const usage = await chrome.storage.local.getBytesInUse();
    if (usage > chrome.storage.local.QUOTA_BYTES * 0.9) {
      // Cleanup yap
      await cleanupOldData();
    }
  }
}
```

### Storage Limits

- **local**: ~10MB (sınırlı)
- **sync**: ~100KB (senkronize, sınırlı)
- **session**: Sınırsız (geçici)

---

## 7. Content Scripts

### Content Script Best Practices

```javascript
// ✅ İyi: Namespace kullan
(function() {
  'use strict';
  
  const FEED_CLEANER_NS = 'feedCleaner';
  
  // Global namespace pollution önleme
  window[FEED_CLEANER_NS] = {
    init: function() {
      // ...
    }
  };
})();
```

### DOM Manipulation

```javascript
// ✅ İyi: Efficient DOM queries
function getPosts() {
  // Specific selector kullan
  return document.querySelectorAll('[data-testid="feed-shared-update-v2"]');
}

// ❌ Kötü: Generic selector
function getPosts() {
  return document.querySelectorAll('article'); // Çok genel
}
```

### MutationObserver

```javascript
// ✅ İyi: Optimized observer
const observer = new MutationObserver((mutations) => {
  // Sadece gerekli değişiklikleri işle
  const hasNewPosts = mutations.some(mutation => 
    mutation.addedNodes.length > 0
  );
  
  if (hasNewPosts) {
    debouncedProcessPosts();
  }
});

observer.observe(container, {
  childList: true,
  subtree: true
});
```

### Message Passing

```javascript
// ✅ İyi: Message validation
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Async response için true döndür
  if (message.action === 'processPost') {
    processPost(message.data).then(result => {
      sendResponse({ success: true, result });
    });
    return true; // Async response
  }
  
  sendResponse({ success: false, error: 'Unknown action' });
});
```

---

## 8. Background Service Workers

### Service Worker Best Practices

```javascript
// ✅ İyi: Lifecycle management
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // İlk kurulum
    initializeExtension();
  } else if (details.reason === 'update') {
    // Güncelleme
    handleUpdate(details.previousVersion);
  }
});

// ✅ İyi: Keep-alive stratejisi
chrome.runtime.onConnect.addListener((port) => {
  // Connection açık tutulduğu sürece service worker aktif kalır
  port.onDisconnect.addListener(() => {
    // Cleanup
  });
});
```

### Service Worker Limitations

- ⚠️ **5 dakika idle timeout**: Service worker 5 dakika idle kalırsa terminate edilir
- ⚠️ **No DOM access**: Service worker'da DOM'a erişemezsiniz
- ⚠️ **No window object**: `window` objesi yok

---

## 9. User Experience

### Loading States

```javascript
// ✅ İyi: Loading indicator
async function processPosts() {
  showLoadingIndicator();
  try {
    await processBatch(posts);
  } finally {
    hideLoadingIndicator();
  }
}
```

### User Feedback

```javascript
// ✅ İyi: Non-intrusive notifications
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 3000);
}
```

### Accessibility

```javascript
// ✅ İyi: ARIA attributes
function createButton(text, onClick) {
  const button = document.createElement('button');
  button.textContent = text;
  button.setAttribute('aria-label', text);
  button.addEventListener('click', onClick);
  return button;
}
```

---

## 10. Testing

### Unit Testing

```javascript
// ✅ İyi: Testable code
export function classifyPost(content) {
  // Pure function - test edilebilir
  return classifier.classify(content);
}
```

### Integration Testing

- Chrome Extension test framework'leri kullan
- Puppeteer veya Playwright ile automation
- Mock API responses

### Manual Testing Checklist

- [ ] Extension yükleme
- [ ] Permissions kontrolü
- [ ] Content script injection
- [ ] Storage operations
- [ ] Message passing
- [ ] Error scenarios
- [ ] Performance (slow network, low memory)

---

## 11. Chrome Web Store Hazırlığı

### Gerekli Dosyalar

- ✅ **Icons**: 16x16, 48x48, 128x128 PNG
- ✅ **Screenshots**: 1280x800 veya 640x400
- ✅ **Privacy Policy**: Gerekli (veri topluyorsa)
- ✅ **Terms of Service**: Opsiyonel ama önerilir

### Store Listing Best Practices

- **Açıklayıcı başlık**: 45 karakter max
- **Detaylı açıklama**: Özellikleri listele
- **Screenshots**: Kullanım senaryolarını göster
- **Privacy**: Veri toplama politikası açık olmalı

---

## 12. Performans Metrikleri

### İzlenmesi Gerekenler

- **Memory usage**: < 100MB
- **CPU usage**: < 10% (peak)
- **Page load impact**: < 5%
- **Response time**: < 200ms per operation

### Performance Monitoring

```javascript
// ✅ İyi: Performance tracking
function trackPerformance(operation, fn) {
  const start = performance.now();
  const result = fn();
  const duration = performance.now() - start;
  
  console.log(`[Performance] ${operation}: ${duration.toFixed(2)}ms`);
  
  // Production'da analytics'e gönder
  // sendToAnalytics({ operation, duration });
  
  return result;
}
```

---

## 13. Yaygın Hatalar ve Çözümleri

### ❌ Hata 1: ES6 Modules

```javascript
// ❌ Çalışmaz
import { Classifier } from './classifier.js';

// ✅ Çözüm: Bundler kullan veya IIFE
const Classifier = (function() {
  // ...
})();
```

### ❌ Hata 2: Global Variables

```javascript
// ❌ Kötü: Global namespace pollution
var myVariable = 'value';

// ✅ İyi: Namespace kullan
const Extension = {
  myVariable: 'value'
};
```

### ❌ Hata 3: Memory Leaks

```javascript
// ❌ Kötü: Event listener temizlenmiyor
element.addEventListener('click', handler);

// ✅ İyi: Cleanup
const cleanup = () => {
  element.removeEventListener('click', handler);
};
```

---

## 14. Kaynaklar

- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/)
- [Manifest V3 Migration Guide](https://developer.chrome.com/docs/extensions/mv3/intro/)
- [Chrome Extension Samples](https://github.com/GoogleChrome/chrome-extensions-samples)
- [Web Store Policies](https://developer.chrome.com/docs/webstore/program-policies/)

---

**Son Güncelleme**: 2024

