// Popup UI kontrolü
document.addEventListener('DOMContentLoaded', async () => {
  const filteredCountEl = document.getElementById('filteredCount');
  const totalCountEl = document.getElementById('totalCount');
  const filterLevelEl = document.getElementById('filterLevel');
  const toggleFilterEl = document.getElementById('toggleFilter');
  const clearStatsEl = document.getElementById('clearStats');
  const statusEl = document.getElementById('status');
  const statusIndicator = statusEl.querySelector('.status-indicator');
  const statusText = statusEl.querySelector('.status-text');

  // Storage'dan ayarları yükle
  const loadSettings = async () => {
    const result = await chrome.storage.local.get(['filterEnabled', 'filterLevel', 'stats']);
    
    // Default değerler
    const filterEnabled = result.filterEnabled !== undefined ? result.filterEnabled : true;
    const filterLevel = result.filterLevel || 'medium';
    const stats = result.stats || { filtered: 0, total: 0 };
    
    toggleFilterEl.textContent = filterEnabled ? 'Filtrelemeyi Kapat' : 'Filtrelemeyi Aç';
    statusIndicator.classList.toggle('inactive', !filterEnabled);
    statusText.textContent = filterEnabled ? 'Aktif' : 'Pasif';
    filterLevelEl.value = filterLevel;
    filteredCountEl.textContent = stats.filtered || 0;
    totalCountEl.textContent = stats.total || 0;
  };

  // Filtreleme toggle
  toggleFilterEl.addEventListener('click', async () => {
    const result = await chrome.storage.local.get(['filterEnabled']);
    const newState = result.filterEnabled !== undefined ? !result.filterEnabled : false;
    
    await chrome.storage.local.set({ filterEnabled: newState });
    toggleFilterEl.textContent = newState ? 'Filtrelemeyi Kapat' : 'Filtrelemeyi Aç';
    statusIndicator.classList.toggle('inactive', !newState);
    statusText.textContent = newState ? 'Aktif' : 'Pasif';

    // Content script'e bildir
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab.url?.includes('linkedin.com')) {
      chrome.tabs.sendMessage(tab.id, { action: 'toggleFilter', enabled: newState });
    }
  });

  // Filtre seviyesi değişimi
  filterLevelEl.addEventListener('change', async () => {
    await chrome.storage.local.set({ filterLevel: filterLevelEl.value });
    
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab.url?.includes('linkedin.com')) {
      chrome.tabs.sendMessage(tab.id, { action: 'updateFilterLevel', level: filterLevelEl.value });
    }
  });

  // İstatistikleri temizle
  clearStatsEl.addEventListener('click', async () => {
    await chrome.storage.local.set({ stats: { filtered: 0, total: 0 } });
    filteredCountEl.textContent = '0';
    totalCountEl.textContent = '0';
  });

  // İstatistikleri dinle
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.stats) {
      const stats = changes.stats.newValue;
      filteredCountEl.textContent = stats?.filtered || 0;
      totalCountEl.textContent = stats?.total || 0;
    }
  });

  await loadSettings();
});

