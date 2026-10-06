/* Sunny Edu Service Worker
 * Security note:
 * - Chỉ cache tài nguyên PUBLIC của website.
 * - Không cache token, form response, hồ sơ người dùng hay API private.
 * - Khi cập nhật lớn, tăng CACHE_VERSION để loại cache cũ.
 */
const CACHE_VERSION = 'sunnyedu-v2';
const STATIC_CACHE = `${CACHE_VERSION}-static`;

const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './assets/js/app.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key.startsWith('sunnyedu-') && key !== STATIC_CACHE)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

function isPrivateLikeRequest(url) {
  const path = url.pathname.toLowerCase();
  return path.includes('/api/') ||
         path.includes('/private/') ||
         path.includes('/account/') ||
         path.includes('/admin/');
}

function isPublicStaticAsset(url) {
  if (url.origin !== self.location.origin) return false;
  const path = url.pathname.toLowerCase();
  return path.includes('/assets/images/') ||
         path.includes('/assets/audio/') ||
         path.includes('/assets/videos/') ||
         path.endsWith('/assets/js/app.js') ||
         /\.(png|jpg|jpeg|webp|svg|ico|woff2?)$/.test(path);
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Không can thiệp request khác origin (ví dụ Google Apps Script API).
  if (url.origin !== self.location.origin) return;

  // Không cache bất kỳ route nào mang tính private/API.
  if (isPrivateLikeRequest(url)) {
    event.respondWith(fetch(request, { cache: 'no-store' }));
    return;
  }

  // Navigation: ưu tiên mạng để luôn nhận HTML mới, fallback cache khi offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(STATIC_CACHE).then(cache => cache.put('./index.html', copy));
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Chỉ cache-first tài nguyên tĩnh public.
  if (isPublicStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(response => {
          if (response && response.ok && response.type === 'basic') {
            const copy = response.clone();
            caches.open(STATIC_CACHE).then(cache => cache.put(request, copy));
          }
          return response;
        });
      })
    );
  }
});
