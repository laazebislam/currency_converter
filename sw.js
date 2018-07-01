let state_cache = "offline";
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register("./sw.js")
        .catch(err => {
            console.log("service worker registration failed", err);
        })
}
self.addEventListener("install", e => {
    e.waitUntil(
        caches.open(state_cache).then(cache => {
            return cache.addAll([
                'src/font/exchange.woff?69455303',
                'src/style.css',
                'src/main.js',
                './',
                'https://cdn.jsdelivr.net/npm/idb@2.1.3/lib/idb.min.js'
            ]);
        })
    );
});
self.addEventListener("fetch", e => {
    let requestUrl = new URL(e.request.url);
    if (requestUrl.origin === location.origin || requestUrl.origin === "https://cdn.jsdelivr.net") {
        e.respondWith(
            caches.open(state_cache).then(cache => {
                return cache.match(e.request).then(resp => {
                    return resp || fetch(e.request).then(x => {
                        cache.put(e.request, x.clone());
                        return x;
                    })
                });

            })
        );
    }
})
