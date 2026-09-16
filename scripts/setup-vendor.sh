#!/usr/bin/env bash
# Redemptio :: prepara vendor/ e models/ a partir de node_modules.
# Uso:  npm install && npm run setup
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [ ! -d node_modules ]; then
  echo "!! node_modules ausente. Rode 'npm install' primeiro." >&2
  exit 1
fi

mkdir -p vendor models

# --- 1. TensorFlow.js (UMD) ---------------------------------------------------
TF_SRC="node_modules/@tensorflow/tfjs/dist/tf.min.js"
if [ -f "$TF_SRC" ]; then
  cp "$TF_SRC" vendor/tf.min.js
  echo "ok  vendor/tf.min.js"
else
  echo "!! não achei $TF_SRC — verifique a instalação do @tensorflow/tfjs" >&2
fi

# --- 2. NSFWJS (UMD que exponha o global) ------------------------------------
# Procura um dist pronto; se não houver, gera um bundle IIFE com esbuild.
NSFW_UMD=""
for cand in \
  node_modules/nsfwjs/dist/nsfwjs.min.js \
  node_modules/nsfwjs/dist/nsfwjs.js ; do
  if [ -f "$cand" ]; then NSFW_UMD="$cand"; break; fi
done

if [ -n "$NSFW_UMD" ] && grep -qi "nsfwjs" "$NSFW_UMD" 2>/dev/null; then
  cp "$NSFW_UMD" vendor/nsfwjs.min.js
  echo "ok  vendor/nsfwjs.min.js (copiado de $NSFW_UMD)"
else
  echo "..  gerando vendor/nsfwjs.min.js com esbuild"
  echo "window.nsfwjs = require('nsfwjs');" > vendor/nsfwjs-entry.js
  npx --yes esbuild vendor/nsfwjs-entry.js \
    --bundle --format=iife --global-name=NSFWJS_BUNDLE \
    --outfile=vendor/nsfwjs.min.js
  echo "ok  vendor/nsfwjs.min.js (esbuild)"
fi

# --- 3. Modelo NSFWJS (model.json + shard .bin) ------------------------------
# O nsfwjs 4.x empacota o modelo como módulos .min.js (não model.json/.bin
# soltos). extract-model.js reconstrói o formato padrão do TF.js em models/.
if node scripts/extract-model.js; then
  :
else
  echo "!! extração do modelo falhou — ver scripts/extract-model.js e models/README.md" >&2
fi

echo "Setup concluído. Recarregue a extensão em chrome://extensions."
