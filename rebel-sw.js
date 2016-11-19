const CACHE_PREFIX = 'RBL_CACHE_';

self.addEventListener("message", function(event) {
    const data = event.data;
    const id = data.id;
    const version = data.version;
    const ROUTER_CACHE_NAME = CACHE_PREFIX + id + "_v" + version;
    caches.open(ROUTER_CACHE_NAME).then(function(cache) {
        cache.addAll(data.urls.map(function(url) {
            return new Request(url, { mode: 'no-cors' });
        }));
    }).then(function(){
        //Remove any other caches for this router instance
        return purgeCaches(id, ROUTER_CACHE_NAME);
    });
});

self.addEventListener('fetch', function(event) {
    const response = new Promise((resolve, reject) => {
        caches.match(event.request).then(function(cachedResponse) {
            if (cachedResponse !== undefined) {
                resolve(cachedResponse)
            } else {
                fetch(event.request).then(function(response){
                    resolve(response);
                }).catch(function(error){
                    //This is where we could return fallback content.
                    reject(error);
                });
            }
        });
    });
    event.respondWith(response);
});

function purgeCaches(id, cacheName) {
    return caches.keys().then(function(cacheNames) {
        return Promise.all(
            cacheNames.map(function(cn) {
                if (cn.startsWith(CACHE_PREFIX + id) && cacheName !== cn) {
                    return caches.delete(cn);
                }
            })
        ).catch(function(error){
            console.error(error);
        });
    });
}