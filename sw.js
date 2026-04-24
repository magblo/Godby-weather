const SHELL = 'godby-shell-v1';
const DATA  = 'godby-data-v1';

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(SHELL).then(c => c.addAll(['index.html', 'manifest.webmanifest', 'icon.svg']))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks =>
      Promise.all(ks.filter(k => k !== SHELL && k !== DATA).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const { hostname } = new URL(e.request.url);
  if (hostname === 'opendata.fmi.fi') {
    e.respondWith(staleWhileRevalidate(e.request));
  } else {
    e.respondWith(cacheFirst(e.request));
  }
});

async function cacheFirst(req) {
  const cached = await caches.match(req);
  if (cached) return cached;
  const res = await fetch(req);
  if (res.ok) (await caches.open(SHELL)).put(req, res.clone());
  return res;
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(DATA);
  const cached = await cache.match(req);
  const fresh = fetch(req)
    .then(res => { if (res.ok) cache.put(req, res.clone()); return res; })
    .catch(() => null);
  return cached ?? await fresh ?? new Response('', { status: 503 });
}
