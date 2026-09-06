const CACHE_NOME = "conta-calorias-v2";

const ARQUIVOS_PARA_CACHE = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./alimentos.js",
  "./auth.js",
  "./firebase-config.js",
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

// Estratégia: rede primeiro (garante versão mais nova quando online),
// com fallback para o cache quando não há internet.
self.addEventListener("fetch", (evento) => {
  if (evento.request.method !== "GET") return;

  evento.respondWith(
    fetch(evento.request)
      .then((respostaRede) => {
        const copia = respostaRede.clone();
        caches.open(CACHE_NOME).then((cache) => cache.put(evento.request, copia));
        return respostaRede;
      })
      .catch(() => caches.match(evento.request))
  );
});
