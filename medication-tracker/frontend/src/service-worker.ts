/// <reference lib="webworker" />

import { clientsClaim } from 'workbox-core';
import { ExpirationPlugin } from 'workbox-expiration';
import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate, CacheFirst, NetworkFirst } from 'workbox-strategies';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { EncryptionService, NotificationData } from './utils/encryption';

declare const self: ServiceWorkerGlobalScope;

clientsClaim();

// Precache all of the assets generated by your build process
precacheAndRoute(self.__WB_MANIFEST);

// Cache the index.html file
const fileExtensionRegexp = new RegExp('/[^/?]+\\.[^/]+$');
registerRoute(
  // Return false to exempt requests from being fulfilled by index.html.
  ({ request, url }: { request: Request; url: URL }) => {
    if (request.mode !== 'navigate') {
      return false;
    }

    if (url.pathname.startsWith('/_')) {
      return false;
    }

    if (url.pathname.match(fileExtensionRegexp)) {
      return false;
    }

    return true;
  },
  createHandlerBoundToURL(process.env.PUBLIC_URL + '/index.html')
);

// Cache API responses
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 5 * 60, // 5 minutes
      }),
    ],
  })
);

// Cache static assets
registerRoute(
  ({ request }) =>
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'font',
  new StaleWhileRevalidate({
    cacheName: 'static-resources',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 24 * 60 * 60, // 24 hours
      }),
    ],
  })
);

// Cache images
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 7 * 24 * 60 * 60, // 1 week
      }),
    ],
  })
);

// This allows the web app to trigger skipWaiting via
// registration.waiting.postMessage({type: 'SKIP_WAITING'})
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Handle offline fallback
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/offline.html');
      })
    );
  }
});

// Handle push notifications
self.addEventListener('push', async (event) => {
  try {
    const data = event.data?.json();
    if (!data) return;

    // Decrypt the notification data if it's encrypted
    const notificationData = isEncryptedData(data) 
      ? await EncryptionService.decryptNotification(data)
      : data as NotificationData;

    event.waitUntil(
      self.registration.showNotification(notificationData.title, {
        body: notificationData.body,
        tag: notificationData.id,
        data: { notificationId: notificationData.id },
        timestamp: new Date(notificationData.timestamp).getTime(),
      })
    );
  } catch (error) {
    console.error('Error handling push notification:', error);
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', async (event) => {
  event.notification.close();

  try {
    const notificationId = event.notification.data?.notificationId;
    if (!notificationId) return;

    // Get the encrypted notification data
    const db = await openDB('notifications', 1);
    const encryptedData = await db.get('notifications', notificationId);
    
    if (!encryptedData) return;

    // Decrypt the notification data
    const notificationData = isEncryptedData(encryptedData)
      ? await EncryptionService.decryptNotification(encryptedData)
      : encryptedData as NotificationData;

    // Handle the notification click based on the type
    const url = getUrlForNotification(notificationData);
    
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((windowClients) => {
        // Try to focus an existing window
        for (const client of windowClients) {
          if (client.url === url && 'focus' in client) {
            return client.focus();
          }
        }
        // If no window exists, open a new one
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
    );
  } catch (error) {
    console.error('Error handling notification click:', error);
  }
});

function getUrlForNotification(notification: NotificationData): string {
  switch (notification.type) {
    case 'medication':
      return `/medications/${notification.metadata?.medicationId}`;
    case 'appointment':
      return `/appointments/${notification.metadata?.appointmentId}`;
    case 'refill':
      return '/medications';
    default:
      return '/';
  }
}