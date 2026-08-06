// ============================================
// SE7VEN ENERGIA - SERVICE WORKER
// ============================================
// Guarda os arquivos do app (e as bibliotecas externas) num "cache" do
// navegador, pra dar pra abrir o app mesmo sem internet. Os DADOS (clientes,
// produtos, orçamentos...) são cuidados à parte, pelo script.js, usando o
// localStorage — este arquivo só cuida da CASCA do app (HTML/CSS/JS/ícones).

const CACHE_VERSAO = 'se7ven-cache-v6';

const ARQUIVOS_ESSENCIAIS = [
    './',
    './index.html',
    './config.js',
    './script.js',
    './style.css',
    './manifest.json',
    './logo.png',
    './icone-192.png',
    './icone-512.png'
];

const BIBLIOTECAS_EXTERNAS = [
    'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js',
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
    'https://accounts.google.com/gsi/client'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_VERSAO).then((cache) => {
            // Cada arquivo é buscado separado: se um faltar (ex: style.css não existir
            // nesse projeto), os outros continuam sendo guardados normalmente.
            return Promise.all(
                [...ARQUIVOS_ESSENCIAIS, ...BIBLIOTECAS_EXTERNAS].map((url) =>
                    cache.add(url).catch(() => {})
                )
            );
        }).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((chaves) =>
            Promise.all(chaves.filter((k) => k !== CACHE_VERSAO).map((k) => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return; // nunca cacheia POST/PUT (dados do Supabase)

    // Nunca guardar em cache chamadas de API (Supabase, Google) — essas
    // precisam sempre ser dados atuais da rede, não uma cópia antiga.
    if (req.url.includes('supabase.co') || req.url.includes('googleapis.com') || req.url.includes('accounts.google.com/o/oauth2')) {
        event.respondWith(fetch(req).catch(() => new Response('', { status: 503 })));
        return;
    }

    event.respondWith(
        caches.match(req).then((respostaCache) => {
            const buscaRede = fetch(req).then((respostaRede) => {
                if (respostaRede && respostaRede.status === 200) {
                    const clone = respostaRede.clone();
                    caches.open(CACHE_VERSAO).then((cache) => cache.put(req, clone));
                }
                return respostaRede;
            }).catch(() => respostaCache);
            // Mostra o que já está em cache na hora (rápido), e atualiza o cache
            // por baixo dos panos quando a rede responder.
            return respostaCache || buscaRede;
        })
    );
});
