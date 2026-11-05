// Aviso de pedido novo do painel. Só cuida da notificação: não guarda nem intercepta nada do site.
// O aviso chega vazio de propósito (dados da cliente não passam pelos servidores do Google e da Apple).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

const paineisAbertos = async () => (await self.clients.matchAll({ type: 'window', includeUncontrolled: true }))
  .filter((c) => new URL(c.url).pathname.endsWith('/admin.html'));

self.addEventListener('push', (e) => {
  e.waitUntil((async () => {
    (await paineisAbertos()).forEach((c) => c.postMessage({ tipo: 'pedido-novo' }));
    await self.registration.showNotification('Pedido novo na loja', {
      body: 'Toque para ver no painel.',
      icon: 'img/painel-192.png',
      badge: 'img/aviso-badge.png',
      tag: 'pedido-novo',
      renotify: true,
      vibrate: [200, 100, 200],
    });
  })());
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil((async () => {
    const [painel] = await paineisAbertos();
    if (!painel) return self.clients.openWindow(new URL('admin.html#pedidos', self.location.href).href);
    painel.postMessage({ tipo: 'abrir-pedidos' });
    return painel.focus();
  })());
});
