# assets/jesus/ — pool de imagens de substituição

As imagens aqui substituem conteúdo explícito detectado.

## O que já vem
Três placeholders SVG (`placeholder-01.svg` … `placeholder-03.svg`) só para
o código não dar 404 durante os primeiros testes. **Troque por imagens reais.**

## Como adicionar as suas
1. Coloque de 5 a 20 imagens aqui (`.jpg`/`.webp` otimizadas < 200 KB cada, ou `.svg`).
2. Registre os nomes em `content.js`, no array `JESUS_IMAGES` (perto do topo do arquivo).
   Ex.: `const JESUS_IMAGES = ['01.jpg', '02.jpg', '03.webp'];`
   - Alternativa: defina `window.RED_JESUS_IMAGES = [...]` em um script carregado antes
     do `content.js` e o array externo será usado.
3. Recarregue a extensão em `chrome://extensions`.

> **Direitos:** use imagens de domínio público, licença livre, ou de sua autoria.
> Arte clássica (Sagrado Coração, ícones antigos) costuma ser domínio público.
