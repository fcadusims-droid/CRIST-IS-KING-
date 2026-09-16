// ===== Redemptio :: offscreen (roda o modelo) =====

let modelPromise = null;

// WebGL é o padrão (rápido); cai p/ CPU se o ambiente não tiver WebGL,
// senão a classificação morreria em silêncio e nada seria filtrado.
async function initBackend() {
  for (const b of ['webgl', 'cpu']) {
    try {
      await tf.setBackend(b);
      await tf.ready();
      if (tf.getBackend() === b) return b;
    } catch (e) {
      console.warn('[offscreen] backend', b, 'indisponível:', e);
    }
  }
  throw new Error('nenhum backend TF.js disponível');
}

async function getModel() {
  if (!modelPromise) {
    const backend = await initBackend();
    console.info('[offscreen] backend:', backend);
    // se o offscreen expõe o global como NSFWJS_BUNDLE.default, ajuste aqui:
    const lib = window.nsfwjs || (window.NSFWJS_BUNDLE && window.NSFWJS_BUNDLE.default) || window.NSFWJS_BUNDLE;
    if (!lib) throw new Error('NSFWJS não encontrado no escopo global — verifique vendor/nsfwjs.min.js');
    // nsfwjs 4.x: load() recebe a URL do model.json (LayersModel), não o diretório.
    // O modelo é extraído p/ models/ pelo setup (scripts/extract-model.js).
    const modelUrl = chrome.runtime.getURL('models/model.json');
    modelPromise = lib.load(modelUrl);
  }
  return modelPromise;
}

async function classify(buffer, mime) {
  const model = await getModel();
  const blob = new Blob([buffer], { type: mime || 'image/jpeg' });
  const bitmap = await createImageBitmap(blob);

  // desenha no canvas p/ virar tensor
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close?.();

  const preds = await model.classify(canvas); // [{className, probability}, ...]
  const scores = {};
  for (const p of preds) scores[p.className] = p.probability;
  return scores; // {Porn, Hentai, Sexy, Neutral, Drawing}
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.target !== 'offscreen') return; // ignora o que não é p/ mim
  if (msg.type === 'CLASSIFY') {
    classify(msg.buffer, msg.mime)
      .then((scores) => sendResponse(scores))
      .catch((e) => { console.error('[offscreen] erro:', e); sendResponse(null); });
    return true; // assíncrono
  }
});
