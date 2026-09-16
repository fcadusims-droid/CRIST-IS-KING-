// ===== Redemptio :: content script =====
// wordlist.js e verses.js já foram injetados antes (viram window.RED_WORDLIST e window.RED_VERSES)

(() => {
  // Lista explícita de arquivos de substituição em assets/jesus/.
  // Ao adicionar imagens reais, inclua o nome aqui (aceita .jpg/.webp/.svg).
  const JESUS_IMAGES = window.RED_JESUS_IMAGES || [
    'placeholder-01.svg',
    'placeholder-02.svg',
    'placeholder-03.svg'
  ];

  let settings = null;
  let initialized = false; // trava de idempotência (evita duplo init / duplo observer)

  const processedImgs = new WeakSet();
  const processedText = new WeakSet();

  function jesusUrl() {
    const name = JESUS_IMAGES[Math.floor(Math.random() * JESUS_IMAGES.length)];
    return chrome.runtime.getURL(`assets/jesus/${name}`);
  }

  function randomVerse() {
    const arr = window.RED_VERSES || ['"Tudo posso naquele que me fortalece." — Fp 4:13'];
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // ---------- IMAGENS ----------
  function candidateImages(root) {
    const imgs = root.matches?.('img') ? [root] : [];
    return imgs
      .concat(Array.from(root.querySelectorAll?.('img') || []))
      .filter((img) => !processedImgs.has(img) && img.src && img.src.startsWith('http'));
  }

  function replaceImage(img) {
    img.src = jesusUrl();
    img.srcset = '';
    img.style.filter = 'none';
    img.setAttribute('data-red', 'blocked');
  }

  function unblur(img) {
    img.style.filter = 'none';
    img.removeAttribute('data-red-pending');
  }

  async function handleImage(img) {
    if (processedImgs.has(img)) return;
    processedImgs.add(img);

    // esconde até ter veredito (evita "flash" do conteúdo)
    img.style.filter = 'blur(24px)';
    img.setAttribute('data-red-pending', '1');

    try {
      const res = await chrome.runtime.sendMessage({ type: 'CLASSIFY_IMAGE', url: img.src });
      if (res && res.ok && res.block) replaceImage(img);
      else unblur(img);
    } catch (e) {
      unblur(img); // em erro, não bloqueia (fail-open). Troque p/ replaceImage se preferir fail-closed.
    }
  }

  function scanImages(root) {
    if (!settings?.enabled || !settings?.blockImages) return;
    candidateImages(root).forEach(handleImage);
  }

  // ---------- VÍDEOS (v1: bloqueia inteiro) ----------
  function scanVideos(root) {
    if (!settings?.enabled || !settings?.blockVideos) return;
    const vids = root.matches?.('video:not([data-red])') ? [root] : [];
    vids.concat(Array.from(root.querySelectorAll?.('video:not([data-red])') || [])).forEach((v) => {
      v.setAttribute('data-red', 'blocked');
      v.pause?.();
      const cover = document.createElement('div');
      cover.className = 'red-video-cover';
      cover.style.backgroundImage = `url("${jesusUrl()}")`;
      const rect = v.getBoundingClientRect();
      cover.style.width = (rect.width || 320) + 'px';
      cover.style.height = (rect.height || 180) + 'px';
      v.replaceWith(cover);
    });
  }

  // ---------- TEXTO ----------
  function textIsExplicit(text) {
    const list = window.RED_WORDLIST || [];
    let hits = 0;
    const lower = text.toLowerCase();
    for (const w of list) {
      // \b para palavra inteira; escape básico
      const re = new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (re.test(lower)) hits++;
      if (hits >= 2) return true; // limiar: 2+ termos no mesmo bloco
    }
    return false;
  }

  function scanText(root) {
    if (!settings?.enabled || !settings?.blockText) return;
    // percorre blocos de texto (parágrafos, spans, divs folha)
    const blocks = root.querySelectorAll?.('p, span, div, li, h1, h2, h3, article') || [];
    blocks.forEach((el) => {
      if (processedText.has(el)) return;
      if (el.children.length > 0) return;        // só folhas de texto
      const txt = el.textContent?.trim();
      if (!txt || txt.length < 20) return;       // ignora textos curtos (menos falso positivo)
      processedText.add(el);
      if (textIsExplicit(txt)) {
        el.textContent = randomVerse();
        el.setAttribute('data-red', 'text');
        el.style.fontStyle = 'italic';
      }
    });
  }

  // ---------- observador de mudanças (conteúdo dinâmico) ----------
  const scanAll = (root) => { scanImages(root); scanVideos(root); scanText(root); };

  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType === 1) scanAll(node);
      }
    }
  });

  async function init() {
    if (initialized) return; // idempotente: seguro chamar cedo E no DOMContentLoaded
    initialized = true;

    const cur = await chrome.storage.local.get('settings');
    settings = cur.settings || { enabled: true, blockImages: true, blockVideos: true, blockText: true };

    scanAll(document.documentElement);
    observer.observe(document.documentElement, { childList: true, subtree: true });

    // reage a mudança de config em tempo real
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.settings) settings = changes.settings.newValue;
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
    init(); // também tenta cedo p/ pegar imagens no document_start (init é idempotente)
  } else {
    init();
  }
})();
