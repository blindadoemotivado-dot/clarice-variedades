const CACHE_NAME = 'clarice-achadinhos-pwa-v7';

const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
  '/manifest.webmanifest',
  '/offline.html',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/icon-maskable-512x512.png',
  '/apple-touch-icon.png',
  '/favicon-32x32.png',
  '/favicon.ico',
];

// Instalação do Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(PRECACHE_ASSETS).catch((err) => {
          console.warn('[PWA] Pré-cacheamento parcial:', err);
        });
      })
      .then(() => self.skipWaiting())
  );
});

// Ativação e limpeza de caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

// Interceptação de requisições com estratégia Network-First para rotas dinâmicas
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Ignora chamadas não GET e esquemas não http/https (ex: chrome-extension)
  if (request.method !== 'GET' || !request.url.startsWith('http')) {
    return;
  }

  const url = new URL(request.url);

  // 1. Network-Only para endpoints administrativos, server functions, Supabase e APIs
  // NUNCA cacheia dados de produtos, autenticação ou APIs
  if (
    url.pathname.startsWith('/admin') ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/_server') ||
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('mercadolivre') ||
    url.hostname.includes('shopee')
  ) {
    event.respondWith(fetch(request));
    return;
  }

  // 2. Requisições de Navegação (Páginas HTML): Network-First com fallback para cache/offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const offlinePage = await caches.match('/offline.html');
          return (
            offlinePage ||
            new Response('Você está offline. Verifique sua conexão com a internet.', {
              status: 503,
              headers: { 'Content-Type': 'text/plain; charset=utf-8' },
            })
          );
        })
    );
    return;
  }

  // 3. Recursos estáticos leves (CSS, JS, Fontes, Ícones): Stale-While-Revalidate
  const isStatic =
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/brand/') ||
    url.pathname.startsWith('/assets/') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.webp') ||
    url.pathname.endsWith('.svg');

  if (isStatic) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const clone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // Default: Network com fallback para Cache
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});
