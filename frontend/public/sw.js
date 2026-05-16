self.addEventListener('push', (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title ?? '新しいメッセージ', {
      body: data.body ?? '',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'talk-message',
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('/admin') && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow('/admin/talk');
    })
  );
});
