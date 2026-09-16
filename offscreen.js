// ===== Redemptio :: offscreen (roda o modelo) =====

let modelPromise = null;

async function getModel() {
  if (!modelPromise) {
    // backend WebGL: simples, não exige arquivos .wasm nem wasm-unsafe-eval
    await tf.setBackend('webgl');
    await tf.ready();
    const base = chrome.runtime.getURL('models/'); // precisa da barra final
    // se o offscreen expõe o global como NSFWJS_BUNDLE.default, ajuste aqui:
    const lib = window.nsfwjs || (window.NSFWJS_BUNDLE && window.NSFWJS_BUNDLE.default) || window.NSFWJS_BUNDLE;
    if (!lib) throw new Error('NSFWJS não encontrado no escopo global — verifique vendor/nsfwjs.min.js');
    modelPromise = lib.load(base); // carrega model.json local
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
