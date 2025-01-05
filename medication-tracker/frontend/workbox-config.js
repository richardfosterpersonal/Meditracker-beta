module.exports = {
  globDirectory: 'build/',
  globPatterns: [
    '**/*.{html,js,css,png,jpg,jpeg,svg,ico,json}'
  ],
  swDest: 'build/service-worker.js',
  ignoreURLParametersMatching: [
    /^utm_/,
    /^fbclid$/
  ],
  skipWaiting: true,
  clientsClaim: true,
  runtimeCaching: [
    {
      // Cache API responses
      urlPattern: new RegExp(process.env.REACT_APP_API_URL),
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 24 * 60 * 60 // 24 hours
        },
        cacheableResponse: {
          statuses: [0, 200]
        }
      }
    },
    {
      // Cache static assets from CDN
      urlPattern: new RegExp(process.env.REACT_APP_CDN_URL),
      handler: 'CacheFirst',
      options: {
        cacheName: 'cdn-cache',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 7 * 24 * 60 * 60 // 7 days
        },
        cacheableResponse: {
          statuses: [0, 200]
        }
      }
    },
    {
      // Cache Google Fonts stylesheets
      urlPattern: /^https:\/\/fonts\.googleapis\.com/,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'google-fonts-stylesheets'
      }
    },
    {
      // Cache Google Fonts webfont files
      urlPattern: /^https:\/\/fonts\.gstatic\.com/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts-webfonts',
        expiration: {
          maxEntries: 30,
          maxAgeSeconds: 365 * 24 * 60 * 60 // 1 year
        },
        cacheableResponse: {
          statuses: [0, 200]
        }
      }
    }
  ],
  navigateFallback: '/index.html',
  navigateFallbackDenylist: [
    // Exclude URLs starting with /api
    new RegExp('^/api'),
    // Exclude URLs containing a dot, as they're likely a resource in public/
    new RegExp('/[^/]+\\.[^/]+$'),
  ]
};
