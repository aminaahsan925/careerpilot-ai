// CareerPilot AI — Service Worker
//
// NOTE (2026-11-20 rebuild): CareerPilot has NO push notification system —
// no VAPID key, no push subscription storage, no server send path. The old
// `push` handler and the `notificationclick` handler were removed because
// they implied a push system that does not exist. In-app notifications are
// served from the database (roadmap_notifications + NotificationBell) and
// need no service worker. This file now only claims clients so a previously
// installed worker does not go stale; it sends nothing.

const CACHE_NAME = 'careerpilot-sw-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
