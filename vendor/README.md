# vendor/ — bibliotecas locais (MV3 proíbe CDN)

O Manifest V3 **não** permite carregar JS de CDN. O `offscreen.html` carrega,
nesta ordem:

1. `vendor/tf.min.js`     — TensorFlow.js (build UMD)
2. `vendor/nsfwjs.min.js` — NSFWJS (build UMD que expõe o global `nsfwjs`)

Estes arquivos **não são versionados** (ver `.gitignore`) porque são binários
grandes de terceiros. Gere-os com o script de setup:

```bash
npm install
npm run setup            # roda scripts/setup-vendor.sh
```

O script:
- copia `node_modules/@tensorflow/tfjs/dist/tf.min.js` → `vendor/tf.min.js`
- gera `vendor/nsfwjs.min.js` via esbuild (IIFE) se o dist do NSFWJS não trouxer
  um UMD pronto que exponha o global.

Se o bundle expuser outro nome de global, ajuste a linha `const lib = ...` em
`offscreen.js`.
