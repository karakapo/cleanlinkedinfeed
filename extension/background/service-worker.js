// Background service worker
// Chrome Extension Manifest V3 için

chrome.runtime.onInstalled.addListener(() => {
  console.log('[Feed Cleaner] Extension installed');
  
  // Varsayılan ayarları kaydet
  chrome.storage.local.set({
    filterEnabled: true,
    filterLevel: 'medium',
    stats: { filtered: 0, total: 0 }
  });
});

// Mesaj dinleyicisi
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'updateStats') {
    chrome.storage.local.get(['stats'], (result) => {
      const stats = result.stats || { filtered: 0, total: 0 };
      chrome.storage.local.set({ stats: message.stats });
    });
  }
  sendResponse({ success: true });
});

