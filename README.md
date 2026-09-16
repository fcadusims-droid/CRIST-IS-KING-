# Redemptio — Filtro de Conteúdo (extensão Chrome/Edge, MV3)

Extensão de navegador que substitui conteúdo explícito por imagens e mensagens
de fé. É uma **barreira de fricção** para quem quer ajuda — não uma jaula. Um
usuário determinado desinstala em 2 cliques; isso é limite estrutural de
qualquer extensão, não um bug a resolver aqui.

## O que faz (v1)

- **Imagens explícitas** → trocadas por uma imagem de um pool local.
- **Vídeos** → o elemento é bloqueado/coberto (v1 não classifica frames).
- **Texto pornográfico detectável** → o bloco vira um versículo/frase.
- **Trava por senha** nas configurações (SHA-256), contra desativação casual.

Alvo da v1: **Chrome/Edge (Manifest V3)**. Firefox exige adaptações (fallback
sem `chrome.offscreen`).

## Arquitetura (3 peças, imposta pelo MV3)

- `content.js` — roda no DOM: acha `<img>`/`<video>`/texto, aplica blur, pede
  veredito, faz a troca. O filtro de **texto** roda aqui (síncrono, sem modelo).
- `background.js` — service worker (sem DOM): tem `host_permissions`, busca os
  bytes da imagem sem taint de CORS, garante o offscreen, faz cache por URL.
- `offscreen.html` / `offscreen.js` — página invisível com DOM: carrega
  TF.js + NSFWJS + modelo **uma vez** e classifica.

## Setup

Pré-requisito: Node + npm.

```bash
npm install
npm run setup            # copia TF.js/NSFWJS p/ vendor/ e o modelo p/ models/
```

Depois, adicione imagens reais em `assets/jesus/` (ver `assets/jesus/README.md`)
e registre os nomes em `JESUS_IMAGES` no topo do `content.js`.

Carregar no navegador:

1. `chrome://extensions` → ative **Modo do desenvolvedor**.
2. **Carregar sem compactação** → selecione esta pasta.
3. Abra o console do service worker (link na página da extensão) para ver logs.

### Buracos propositais (dependem de decisões/arquivos seus)

| Item | Onde | Como preencher |
|---|---|---|
| Libs TF.js/NSFWJS | `vendor/` | `npm run setup` (gitignored) |
| Modelo NSFWJS | `models/` | `npm run setup` ou download manual (gitignored) |
| Imagens de troca | `assets/jesus/` | adicionar + listar em `JESUS_IMAGES` |
| Wordlist de texto | `data/wordlist.js` | preencher com termos inequívocos |
| Calibração | opções | ajustar thresholds até falso positivo tolerável |

## Limitações que você precisa aceitar

1. **Desinstalação é imparável.** A senha protege as configs, não a
   desinstalação. "Accountability" real exige um parceiro com a senha **e**
   monitoramento, ou bloqueio em nível de SO/DNS — outro produto.
2. **Detecção de imagem não é perfeita** (~90–93%). Vai haver falso positivo e
   falso negativo. Você calibra thresholds, não elimina erro.
3. **Vídeo em tempo real é caro** → v1 bloqueia o elemento inteiro.
4. **Filtro de texto por wordlist é fraco por natureza** (e, no v1, só dispara
   em blocos-folha com 2+ termos — ver "Diferenças" abaixo). Comece conservador.
5. **Performance** em feeds infinitos vai pesar; v1 mitiga com cache por URL.
6. **Publicar na Chrome Web Store é incerto** (`<all_urls>` atrai revisão).
   Para uso pessoal, rodar unpacked é o caminho.

## Diferenças em relação ao documento de spec

Mudanças feitas de propósito sobre o documento base, todas pequenas e sinalizadas:

- **`JESUS_IMAGES` (array) no lugar de `JESUS_COUNT` + `NN.jpg` hardcoded** —
  elimina o footgun de "a contagem tem que bater com a pasta" e aceita
  `.jpg/.webp/.svg`.
- **`blockedCount` agora é incrementado de verdade** no service worker (era um
  recurso morto: o popup lia, mas nada escrevia).
- **`init()` idempotente** no `content.js` — o spec registrava
  `DOMContentLoaded` **e** chamava `init()` na hora, criando dois
  `MutationObserver`/listeners. Uma trava evita a duplicação mantendo o
  "tentar cedo".
- **`scanImages`/`scanVideos` também tratam o nó-raiz** quando o
  MutationObserver entrega um `<img>`/`<video>` adicionado diretamente (o
  `querySelectorAll` do spec excluía o próprio nó → imagens dinâmicas de topo
  eram perdidas).
- **`options.js` usa `getElementById` explícito** no lugar de globais
  implícitos por `id`.
- **Placeholders SVG** em `assets/jesus/` só para não dar 404 nos testes.

Pontos ainda em aberto do próprio desenho (não corrigidos porque mudam
comportamento — decisão sua):

- **Filtro de texto perde a maioria dos parágrafos reais** (`el.children.length
  === 0` só pega folhas; parágrafo com `<a>`/`<b>` dentro é ignorado).
- **Transferir `ArrayBuffer` via `chrome.runtime.sendMessage`** funciona
  (structured clone) mas é o hop mais frágil/lento. O offscreen também tem
  `host_permissions` — dá pra mandar só a URL e ele mesmo faz o `fetch`,
  eliminando a cópia de bytes. Candidato a refatoração se pesar.

## Estrutura

```
manifest.json        background.js       content.js / content.css
offscreen.html/js    options.html/js     popup.html/js
data/wordlist.js     data/verses.js
assets/jesus/        models/             vendor/       scripts/setup-vendor.sh
```
