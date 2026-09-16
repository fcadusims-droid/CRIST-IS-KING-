// ===== Redemptio :: service worker =====

const OFFSCREEN_PATH = 'offscreen.html';
let creatingOffscreen = null; // trava anti-corrida

// Cache de veredito por URL (evita reclassificar a mesma imagem)
const verdictCache = new Map(); // url -> {block: boolean, scores}
const MAX_CACHE = 500;

// Limite de tamanho para não baixar imagens gigantes
const MAX_BYTES = 8 * 1024 * 1024; // 8MB

// Limiares em memória, sincronizados com storage (calibrados na tela de opções).
let thresholds = { porn: 0.55, hentai: 0.55, sexy: 0.75 };

async function loadThresholds() {
  const { settings } = await chrome.storage.local.get('settings');
  if (settings?.thresholds) thresholds = settings.thresholds;
}
loadThresholds();
chrome.storage.onChanged.addListener((changes) => {
  if (changes.settings?.newValue?.thresholds) {
    thresholds = changes.settings.newValue.thresholds;
  }
});

async function ensureOffscreen() {
  // Já existe?
  const existing = await chrome.runtime.getContexts?.({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [chrome.runtime.getURL(OFFSCREEN_PATH)]
  });
  if (existing && existing.length > 0) return;

  if (creatingOffscreen) {
    await creatingOffscreen;
    return;
  }
  creatingOffscreen = chrome.offscreen.createDocument({
    url: OFFSCREEN_PATH,
    reasons: ['DOM_SCRAPING'], // razão válida p/ processar conteúdo com DOM
    justification: 'Classificar imagens localmente com um modelo de ML.'
  });
  try {
    await creatingOffscreen;
  } finally {
    creatingOffscreen = null;
  }
}

async function fetchImageBytes(url) {
  // O service worker tem host_permissions → sem taint de CORS.
  const resp = await fetch(url, { credentials: 'omit' });
  if (!resp.ok) throw new Error('fetch falhou: ' + resp.status);
  const type = resp.headers.get('content-type') || '';
  if (!type.startsWith('image/')) throw new Error('não é imagem: ' + type);
  const buf = await resp.arrayBuffer();
  if (buf.byteLength > MAX_BYTES) throw new Error('imagem grande demais');
  return { buffer: buf, mime: type };
}

async function classifyUrl(url) {
  if (verdictCache.has(url)) return verdictCache.get(url);

  const { buffer, mime } = await fetchImageBytes(url);
  await ensureOffscreen();

  // Envia os bytes para o offscreen classificar.
  const scores = await chrome.runtime.sendMessage({
    target: 'offscreen',
    type: 'CLASSIFY',
    buffer,          // ArrayBuffer é clonado na mensagem (structured clone)
    mime
  });

  const verdict = decideVerdict(scores);
  // guarda no cache (com poda simples)
  if (verdictCache.size >= MAX_CACHE) {
    verdictCache.delete(verdictCache.keys().next().value);
  }
  verdictCache.set(url, verdict);
  return verdict;
}

function decideVerdict(scores) {
  if (!scores) return { block: false, scores: null };
  // scores: {Porn, Hentai, Sexy, Neutral, Drawing}
  const porn = scores.Porn ?? 0;
  const hentai = scores.Hentai ?? 0;
  const sexy = scores.Sexy ?? 0;

  const block =
    porn > (thresholds.porn ?? 0.55) ||
    hentai > (thresholds.hentai ?? 0.55) ||
    sexy > (thresholds.sexy ?? 0.75);
  return { block, scores };
}

// ===== roteamento de mensagens vindas do content script =====
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === 'CLASSIFY_IMAGE' && msg.url) {
    classifyUrl(msg.url)
      .then((v) => {
        if (v.block) bumpBlockedCount();
        sendResponse({ ok: true, ...v });
      })
      .catch((e) => sendResponse({ ok: false, error: String(e) }));
    return true; // resposta assíncrona
  }
  // CLASSIFY (target 'offscreen') NÃO é tratado aqui — cai no listener do offscreen.
});

// Contador de bloqueios (persistente). Serializado por uma fila simples
// para não perder incrementos concorrentes.
let countQueue = Promise.resolve();
function bumpBlockedCount(n = 1) {
  countQueue = countQueue.then(async () => {
    const { settings } = await chrome.storage.local.get('settings');
    if (!settings) return;
    settings.blockedCount = (settings.blockedCount ?? 0) + n;
    await chrome.storage.local.set({ settings });
  }).catch(() => {});
  return countQueue;
}

// Instalação: valores padrão
chrome.runtime.onInstalled.addListener(async () => {
  const cur = await chrome.storage.local.get('settings');
  if (!cur.settings) {
    await chrome.storage.local.set({
      settings: {
        enabled: true,
        blockImages: true,
        blockVideos: true,
        blockText: true,
        thresholds: { porn: 0.55, hentai: 0.55, sexy: 0.75 },
        passwordHash: null, // definido na tela de opções
        blockedCount: 0
      }
    });
  }
});
