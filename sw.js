const CACHE='examprep-v1';
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(['/','/manifest.webmanifest']))));
self.addEventListener('fetch',e=>{if(e.request.method==='GET' && new URL(e.request.url).origin===location.origin){e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(x=>{const copy=x.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return x}).catch(()=>caches.match('/'))))}});
