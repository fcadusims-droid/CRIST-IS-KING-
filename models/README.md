# models/ — modelo NSFWJS empacotado

O `offscreen.js` carrega o modelo com `nsfwjs.load(chrome.runtime.getURL('models/'))`.
Este diretório precisa conter:

- `model.json`
- os shards `.bin` referenciados dentro do `model.json` (ex.: `group1-shard1of1.bin`;
  a quantidade e os nomes variam conforme a versão do modelo).

Os arquivos do modelo **não são versionados** (ver `.gitignore`) por serem
binários grandes. Obtenha-os por uma das opções:

- **Opção A:** extrair de `node_modules/nsfwjs/` após `npm install` (algumas versões
  trazem os arquivos do modelo no pacote). O `npm run setup` tenta isso.
- **Opção B:** baixar do repositório oficial do NSFWJS (pasta de modelos / exemplo).

Depois de copiar, confira que:
1. `model.json` está aqui neste diretório.
2. Todos os shards `.bin` citados no `model.json` estão no MESMO diretório, com os
   nomes exatos.
3. `models/*` está em `web_accessible_resources` no `manifest.json` (já está).
