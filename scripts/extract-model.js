// Redemptio :: extrai model.json + shard .bin do pacote nsfwjs (4.x)
// para o formato padrão do TF.js, gravando em models/.
//
// O nsfwjs 4.x empacota o modelo como módulos .min.js (modelTopology +
// weightsManifest e os pesos em base64), não como model.json/.bin soltos.
// Este script reconstrói os arquivos padrão para que
// tf.loadLayersModel(getURL('models/model.json')) funcione no offscreen.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MODEL_NAME = 'mobilenet_v2';
const PKG = path.join(ROOT, 'node_modules/nsfwjs/dist/models', MODEL_NAME);
const OUT = path.join(ROOT, 'models');

function req(p) { const m = require(p); return m && m.default ? m.default : m; }

const modelMod = require(path.join(PKG, 'model.min.js'));           // {modelTopology, weightsManifest}
const shardStr = req(path.join(PKG, 'group1-shard1of1.min.js'));     // base64 string

const { modelTopology, weightsManifest } = modelMod;
if (!modelTopology || !weightsManifest) {
  console.error('FAIL: model.min.js não expôs modelTopology/weightsManifest');
  process.exit(1);
}

// Decodifica os pesos.
const bin = Buffer.from(shardStr, 'base64');

// Valida o tamanho contra o manifest (considerando quantização).
let expected = 0;
for (const grp of weightsManifest) {
  for (const w of grp.weights) {
    const n = w.shape.reduce((a, b) => a * b, 1);
    const dtype = (w.quantization && w.quantization.dtype) || w.dtype || 'float32';
    const bpe = dtype === 'uint8' ? 1 : dtype === 'uint16' ? 2 : 4;
    expected += n * bpe;
  }
}
if (bin.byteLength !== expected) {
  console.error(`FAIL: bytes decodificados (${bin.byteLength}) != esperado do manifest (${expected})`);
  process.exit(1);
}

// Reescreve os paths do manifest para apontar ao .bin real.
const outManifest = weightsManifest.map((grp) => ({ ...grp, paths: ['group1-shard1of1.bin'] }));
const modelJson = { format: 'layers-model', modelTopology, weightsManifest: outManifest };

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'model.json'), JSON.stringify(modelJson));
fs.writeFileSync(path.join(OUT, 'group1-shard1of1.bin'), bin);

console.log(`ok  models/model.json  (${JSON.stringify(modelJson).length} bytes)`);
console.log(`ok  models/group1-shard1of1.bin  (${bin.byteLength} bytes, validado contra o manifest)`);
