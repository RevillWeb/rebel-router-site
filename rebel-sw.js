var CACHE_PREFIX = 'RBL_CACHE_';

const ACTION_ADD_TO_CACHE = "add-cache";
const ACTION_ADD_OFFLINE_CONTENT = "add-offline-content";

self.addEventListener("message", function(event) {
    console.log("CACHE!");
    const data = event.data;
    const id = data.id;
    const version = data.version;
    const ROUTER_CACHE_NAME = CACHE_PREFIX + id + "_v" + version;
    caches.open(ROUTER_CACHE_NAME).then(function(cache) {
        cache.addAll(data.urls.map(function(url) {
            return new Request(url, { mode: 'no-cors' });
        }));
        //Add offline fallback if specified
        if (data.offlineFallback !== null) {
            fetch(data.offlineFallback, {mode: 'no-cors'}).then(function (response) {
                cache.put("rbl-fallback", response);
            });
        }


        // switch (data.action) {
        //     case ACTION_ADD_TO_CACHE:
        //
        //         break;
        //     case ACTION_DEFAULT_OFFLINE_CONTENT:
        //
        //         break;
        //     case ACTION_ROUTE_OFFLINE_CONTENT:
        //         // return fetch(data.url, { mode: 'no-cors' }).then(function(response) {
        //         //     return cache.put("rbl-fallback-" + data., response);
        //         // });
        //         break;
        // }


    }).then(function(){
        //Remove any other caches for this router instance
        return purgeCaches(id, ROUTER_CACHE_NAME);
    });


});

self.addEventListener('fetch', function(event) {
    // console.log("FETCH EVENT:", event.request);
    const response = new Promise((resolve, reject) => {
        caches.match(event.request).then(function(cachedResponse) {
            //console.log("MATCHED:", cachedResponse);
            if (cachedResponse !== undefined) {
                //console.log("CACHE");
                resolve(cachedResponse)
            } else {
                fetch(event.request).then(function(response){
                    //console.log("FETCHED:", response.url);
                    resolve(response);
                }).catch(function(){
                    console.log("COULD NOT FETCH:", event.request);
                    if (event.request.url == "http://localhost:8081/pages/home.html") {
                        console.log("FALLBACK");
                        const fallback = caches.match('rbl-fallback');
                        resolve(fallback);
                    }
                    //console.log("FALLBACK:", fallback);
                    //resolve(fallback);
                    reject();
                });
            }
        }).catch(function(error){
            console.log("NO MATCH:", error);
        });
    });
    event.respondWith(response);
    //event.respondWith(

        // fetch(event.request).catch(function() {
        //     console.log("FAIL");
        //     // if it fails, try to return request from the cache
        //     return caches.match(event.request).then(function(response) {
        //         if (response) {
        //             return response;
        //         }
        //         // if not found in cache, return default offline content
        //         // (only if this is a navigation request. In older browsers we check if this is a text/html request. Thanks @jeffposnick)
        //         if (event.request.mode === 'navigate' || (event.request.method === 'GET' && event.request.headers.get('accept').includes('text/html'))) {
        //             return caches.match('rbl-fallback');
        //         }
        //     })
        // })
        // caches.match(event.request).then(function(cachedResponse) {
        //     console.log("CACHED?");
        //     if (cachedResponse) {
        //         console.log("FROM CACHE:", event.request.url);
        //         return cachedResponse
        //     } else {
        //         if (event.request.mode === 'navigate' || (event.request.method === 'GET' && event.request.headers.get('accept').includes('text/html'))) {
        //             console.log("FALLBACK!");
        //             const res = caches.match("rbl-fallback");
        //             console.log("RES:", res);
        //             return res;
        //         }
        //         // console.log("TRY AND FETCH IT:", event.request.url);
        //         // return fetch(event.request).then(function(response){
        //         //     console.log("FETCHED");
        //         //     return response;
        //         // }).catch(function(){
        //         //     console.log("COULD NOT FETCH");
        //         //
        //         // });
        //     }
        // })
    //);
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