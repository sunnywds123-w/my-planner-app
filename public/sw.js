// Service Worker：淨係做版本偵測 + 提示更新，唔做任何離線快取（冇 fetch handler，
// 唔攔截 network request，唔碰 localStorage / IndexedDB）。

self.addEventListener('install', () => {
  // 特登唔喺度 skipWaiting —— 要留喺 waiting 狀態，等使用者喺 App 入面
  // 撳「立即更新」先至由頁面 postMessage 觸發 skipWaiting。如果喺呢度自動
  // skipWaiting，新版本會即刻生效，變相強制中斷緊用緊嘅使用者。
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
