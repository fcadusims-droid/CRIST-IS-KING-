# models/ — modelo NSFWJS (formato TF.js)

O `offscreen.js` carrega o modelo com
`nsfwjs.load(chrome.runtime.getURL('models/model.json'))`. Este diretório
precisa conter, em produção:

- `model.json` — topologia + weightsManifest (LayersModel).
- `group1-shard1of1.bin` — pesos (uint8 quantizado), referenciado pelo manifest.

Estes arquivos **não são versionados** (ver `.gitignore`) e são **gerados
automaticamente** pelo setup:

```bash
npm install
npm run setup        # roda scripts/extract-model.js
```

## Por que "extrair"

O `nsfwjs` 4.x **não distribui** `model.json`/`.bin` soltos. Ele empacota o
modelo como módulos `.min.js` (`dist/models/mobilenet_v2/model.min.js` +
`group1-shard1of1.min.js`, com os pesos em base64). O
`scripts/extract-model.js` lê esses módulos e reconstrói o par
`model.json` + `group1-shard1of1.bin` no formato padrão do TF.js, validando o
tamanho dos bytes contra o `weightsManifest`.

Modelo usado: **MobileNetV2** (o padrão do nsfwjs). Para trocar por
`mobilenet_v2_mid` ou `inception_v3`, ajuste `MODEL_NAME` em
`scripts/extract-model.js` (o inception tem 6 shards — a extração precisaria
concatenar os bundles; o mobilenet_v2 tem 1 shard).
