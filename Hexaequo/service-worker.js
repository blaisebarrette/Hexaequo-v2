const CACHE_NAME = 'hexaequo-cache-v1';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './css/styles.css',
    './js/app.js',
    './js/core/HexGrid.js',
    './js/core/GameState.js',
    './js/core/GameRules.js',
    './js/rendering/Renderer.js',
    './js/rendering/ModelLoader.js',
    './js/ui/UserInterface.js',
    './js/ui/InputHandler.js',
    './manifest.json',
    // 3D model files
    './assets/models/tile_black.glb',
    './assets/models/tile_white.glb',
    './assets/models/disc_black.glb',
    './assets/models/disc_white.glb',
    './assets/models/ring_black.glb',
    './assets/models/ring_white.glb'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll(ASSETS_TO_CACHE);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Fetch event - serve from cache if available, otherwise fetch from network
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Cache hit - return the response
                if (response) {
                    return response;
                }
                
                // Clone the request
                const fetchRequest = event.request.clone();
                
                return fetch(fetchRequest)
                    .then((response) => {
                        // Check if we received a valid response
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }
                        
                        // Clone the response
                        const responseToCache = response.clone();
                        
                        // Open the cache and store the new response
                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseToCache);
                            });
                        
                        return response;
                    });
            })
    );
}); 