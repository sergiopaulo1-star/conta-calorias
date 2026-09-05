const CACHE_NOME = "conta-calorias-v1";

const ARQUIVOS_PARA_CACHE = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./alimentos.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches.open(CACHE_NOME).then((cache) => cache.addAll(ARQUIVOS_PARA_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches.keys().then((chaves) =>
      Promise.all(
        chaves
          .filter((chave) => chave !== CACHE_NOME)
          .map((chave) => caches.delete(chave))
      )
    )
  );
  self.clients.claim();
});

// Estratégia: cache primeiro, com atualização em segundo plano (stale-while-revalidate)
self.addEventListener("fetch", (evento) => {
  if (evento.request.method !== "GET") return;

  evento.respondWith(
    caches.open(CACHE_NOME).then((cache) =>
      cache.match(evento.request).then((respostaCache) => {
        const buscaRede = fetch(evento.request)
          .then((respostaRede) => {
            cache.put(evento.request, respostaRede.clone());
            return respostaRede;
          })
          .catch(() => respostaCache);

        return respostaCache || buscaRede;
      })
    )
  );
});
