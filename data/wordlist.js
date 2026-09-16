// Comece PEQUENO e inequívoco. Quanto maior a lista, mais falso positivo.
// Só termos que praticamente nunca aparecem em contexto legítimo.
// Regra do filtro (content.js): 2+ termos distintos no MESMO bloco de texto
// (>= 20 caracteres) para disparar. Um único termo isolado não bloqueia.
//
// Recomendação: 15 a 40 termos muito específicos. EVITE palavras ambíguas
// (anatômicas/médicas comuns) — elas geram falso positivo em conteúdo de
// saúde, educação e discussões de recuperação/abuso.
//
// Preencha com os termos que fizerem sentido para você. Mantido vazio de
// propósito: uma wordlist é uma decisão editorial sua, não do código.
window.RED_WORDLIST = [
  // "termo1", "termo2", ...
];
