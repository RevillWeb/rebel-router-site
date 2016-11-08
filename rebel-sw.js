var CACHE_PREFIX = 'RBL_CACHE_';

const ACTION_ADD_TO_CACHE = "add-cache";

self.addEventListener("message", function(event) {
    const data = event.data;
    switch (data.action) {
        case ACTION_ADD_TO_CACHE:
            const id = data.id;
            const version = data.version;
            const newCacheName = CACHE_PREFIX + id + "_v" + version;
            caches.open(newCacheName).then(function(cache) {
                cache.addAll(data.urls.map(function(urlToPrefetch) {
                    return new Request(urlToPrefetch, { mode: 'no-cors' });
                }));
            }).then(function(){
                //Remove any other caches for this router instance
                return caches.keys().then(function(cacheNames) {
                    return Promise.all(
                        cacheNames.map(function(cacheName) {
                            if (cacheName.startsWith(CACHE_PREFIX + id) && newCacheName !== cacheName) {
                                return caches.delete(cacheName);
                            }
                        })
                    ).catch(function(error){
                        console.error(error);
                    });
                });
            });
            break;
    }
});

self.addEventListener('fetch', function(event) {
    event.respondWith(
        caches.match(event.request).then(function(cachedResponse) {
            if (cachedResponse) {
                return cachedResponse
            }
            return fetch(event.request);
        })
    );
});