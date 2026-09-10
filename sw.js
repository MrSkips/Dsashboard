// Cache only this app's public shell. Never cache weather or authenticated API responses.
const CACHE_NAME = 'wit-dashboard-v2';
const CORE_ASSETS = ['./', './index.html', './styles.css', './app.js', './manifest.json', './icon.svg'];
const CORE_URLS = new Set(CORE_ASSETS.map(path => new URL(path, self.registration.scope).href));
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS)));
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('wit-dashboard-') && key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if(request.method !== 'GET' || request.headers.has('Authorization') || !CORE_URLS.has(request.url)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      const response = await fetch(request);
      if(response.ok) await cache.put(request, response.clone());
      return response;
    } catch {
      return await cache.match(request) || new Response('Offline. Connect once to download the dashboard.', {status:503,headers:{'Content-Type':'text/plain'}});
    }
  })());
});
