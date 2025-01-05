/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

const CACHE_NAME = 'medication-tracker-v2';
const OFFLINE_URL = '/offline.html';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/static/js/main.js',
  '/static/css/main.css',
  '/manifest.json',
  '/logo.png',
  '/favicon.ico'
];

const API_CACHE_NAME = 'medication-tracker-api-v2';
const API_ROUTES = [
  '/api/medications',
  '/api/schedules',
  '/api/doses',
  '/api/emergency',
  '/api/sync'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then((cache) => {
        return cache.addAll(STATIC_ASSETS);
      }),
      caches.open(API_CACHE_NAME),
    ])
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== API_CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Helper function to determine if a request is for an API route
const isApiRoute = (url: string) => {
  return API_ROUTES.some(route => url.includes(route));
};

// Helper function to determine if we should cache the response
const shouldCacheResponse = (response: Response) => {
  return response.status === 200 && response.type === 'basic';
};

// Network-first strategy for API requests with offline fallback
const handleApiRequest = async (request: Request) => {
  try {
    const response = await fetch(request);
    if (shouldCacheResponse(response)) {
      const cache = await caches.open(API_CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    // Return a custom offline response for API requests
    return new Response(
      JSON.stringify({
        error: 'You are offline',
        offline: true,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 503,
        statusText: 'Service Unavailable',
      }
    );
  }
};

// Cache-first strategy for static assets
const handleStaticRequest = async (request: Request) => {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  try {
    const response = await fetch(request);
    if (shouldCacheResponse(response)) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    if (request.mode === 'navigate') {
      const offlineCache = await caches.match(OFFLINE_URL);
      if (offlineCache) {
        return offlineCache;
      }
    }
    throw error;
  }
};

// Fetch event - handle requests
self.addEventListener('fetch', (event) => {
  const request = event.request;
  
  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Handle API requests
  if (isApiRoute(request.url)) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle static assets
  event.respondWith(handleStaticRequest(request));
});

// Sync event - handle background sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-changes') {
    event.waitUntil(syncOfflineChanges());
  }
});

// Function to sync offline changes
async function syncOfflineChanges() {
  try {
    const db = await openIndexedDB();
    const changes = await getAllOfflineChanges(db);
    
    for (const change of changes) {
      try {
        let endpoint = '';
        let method = 'POST';
        
        switch (change.type) {
          case 'medication':
            endpoint = '/api/medications';
            break;
          case 'schedule':
            endpoint = `/api/medications/${change.data.medicationId}/schedule`;
            method = 'PUT';
            break;
          case 'adherence':
            endpoint = `/api/medications/${change.data.medicationId}/adherence`;
            break;
          case 'emergency':
            endpoint = '/api/emergency/notify';
            break;
        }

        const response = await fetch(endpoint, {
          method,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(change.data),
        });
        
        if (response.ok) {
          await deleteOfflineChange(db, change.id);
        } else {
          console.error('Failed to sync change:', change.id, await response.text());
        }
      } catch (error) {
        console.error('Error syncing change:', change.id, error);
      }
    }
  } catch (error) {
    console.error('Error in sync process:', error);
  }
}

// IndexedDB functions
function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('MediTracker', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('offlineChanges')) {
        const store = db.createObjectStore('offlineChanges', { keyPath: 'id' });
        store.createIndex('by-type', 'type');
        store.createIndex('by-sync', 'synced');
      }
      if (!db.objectStoreNames.contains('medications')) {
        db.createObjectStore('medications', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('emergencyContacts')) {
        db.createObjectStore('emergencyContacts', { keyPath: 'id' });
      }
    };
  });
}

function getAllOfflineChanges(db: IDBDatabase): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['offlineChanges'], 'readonly');
    const store = transaction.objectStore('offlineChanges');
    const request = store.index('by-sync').getAll(false);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function deleteOfflineChange(db: IDBDatabase, id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['offlineChanges'], 'readwrite');
    const store = transaction.objectStore('offlineChanges');
    const request = store.delete(id);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// Periodic sync for emergency contacts
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'sync-emergency') {
    event.waitUntil(syncEmergencyContacts());
  }
});

async function syncEmergencyContacts() {
  try {
    const response = await fetch('/api/emergency/contacts');
    if (response.ok) {
      const contacts = await response.json();
      const db = await openIndexedDB();
      const transaction = db.transaction(['emergencyContacts'], 'readwrite');
      const store = transaction.objectStore('emergencyContacts');
      
      // Clear existing contacts
      await store.clear();
      
      // Add new contacts
      for (const contact of contacts) {
        await store.add(contact);
      }
    }
  } catch (error) {
    console.error('Error syncing emergency contacts:', error);
  }
}
