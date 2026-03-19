self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  if (url.includes('/api/')) {
    // Pass API requests straight to network — page fetch() already sets credentials:'include'
    event.respondWith(
      fetch(event.request)
        .catch(() => new Response(JSON.stringify({ error: 'Network error' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        }))
    );
    return;
  }

  event.respondWith(
    fetch(event.request).catch(() =>
      new Response('Offline', { status: 503 })
    )
  );
});

// Push notifications (optional - MVP scaffold)
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    vibrate: [100, 50, 100],
    data: { url: data.url || '/' },
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Salon Loyalty', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
