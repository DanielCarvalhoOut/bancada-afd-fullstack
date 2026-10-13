import { Chapter, aut } from './teoria.content';

/**
 * Conteúdos práticos: exercícios das listas, resolvidos e comentados.
 * Mesmo formato de blocos da teoria (o leitor é o mesmo componente), então
 * os ids de seção precisam ser únicos no livro inteiro — por isso o prefixo `ex-`.
 * Figuras com `re` foram conferidas contra a regex (ver comentário em teoria.content.ts).
 */

// Gramáticas, questão 2: S → 0S | 1A, A → 0A | 1B, B → 0B | 1C, C → 0C | 1C | ε
const F_TRES_UNS = aut('afd',
  [['S', 100, 130, 'i'], ['A', 270, 130], ['B', 440, 130], ['C', 610, 130, 'f']],
  [['S', 'S', '0'], ['S', 'A', '1'], ['A', 'A', '0'], ['A', 'B', '1'],
   ['B', 'B', '0'], ['B', 'C', '1'], ['C', 'C', '0,1']]);

// Gramáticas regulares, questão 1: S → 0S | 1B, B → 0S | 1B | ε
const F_GR_Q1 = aut('afd',
  [['S', 110, 130, 'i'], ['B', 330, 130, 'f']],
  [['S', 'S', '0'], ['S', 'B', '1'], ['B', 'S', '0'], ['B', 'B', '1']]);

export const EXERCICIOS: Chapter[] = [
  {
    id: 'lista-gramaticas',
    title: 'Gramáticas',
    summary: 'Derivação, palavras geradas e não geradas, sentença × forma sentencial e linguagem gerada.',
    sections: [
      {
        id: 'ex-gram-q1',
        title: 'Questão 1 — analisando uma gramática',
        blocks: [
          { t: 'note', kind: 'q', html: 'Dada G = ({R, S, T, X}, {a, b}, P, R), responda: (a) terminais, não terminais e símbolo de partida; (b) três palavras aceitas; (c) três palavras não aceitas; (d) verdadeiro ou falso.' },
          { t: 'code', text: 'R → XRX | S\nS → aTb | bTa\nT → XTX | X | ε\nX → a | b' },
          { t: 'h', text: 'Entendendo cada não terminal' },
          { t: 'list', items: [
            '<b>X → a | b</b>: um símbolo qualquer (“coringa”).',
            '<b>T → XTX | X | ε</b>: gera <b>qualquer</b> palavra sobre {a, b}, inclusive ε.',
            '<b>S → aTb | bTa</b>: primeira e última letra <b>diferentes</b>.',
            '<b>R → XRX | S</b>: a mesma quantidade de símbolos dos dois lados de um S.',
          ] },
          { t: 'note', kind: 'def', title: 'L(G)', html: 'Palavras sobre {a, b} que <b>não são palíndromos</b>. A gramática <b>não é regular</b> (não terminal no meio), então não existe autômato finito: só derivação.' },
          { t: 'h', text: '(a) Componentes' },
          { t: 'p', html: 'Terminais {a, b}; não terminais {R, S, T, X}; símbolo de partida <b>R</b> (4º elemento da tupla). O “S” aqui é só mais um não terminal.' },
          { t: 'h', text: '(b) Três palavras geradas' },
          { t: 'code', text: 'ab    : R ⇒ S ⇒ aTb ⇒ ab                       (T → ε)\naab   : R ⇒ S ⇒ aTb ⇒ aXb ⇒ aab                (T → X, X → a)\naaaba : R ⇒ XRX ⇒ aRX ⇒ aRa ⇒ aSa ⇒ aaTba ⇒ aaXba ⇒ aaaba' },
          { t: 'note', kind: 'tip', title: 'Método rápido', html: 'Compare as pontas indo para dentro. Par igual → R → XRX. Primeiro par diferente → S → aTb ou bTa. O miolo restante → T.' },
          { t: 'h', text: '(c) Três palavras não geradas' },
          { t: 'p', html: '<b>ε, a, aba</b> (e qualquer palíndromo: aa, bb, abba).' },
          { t: 'p', html: 'Justificativa por invariante: toda derivação de R passa por S → aTb | bTa, que cria um par de letras <b>diferentes</b> em posições simétricas (R → XRX acrescenta igualmente dos dois lados). Palíndromos não têm esse par. Além disso, o tamanho mínimo é 2.' },
          { t: 'h', text: '(d) Verdadeiro ou falso' },
          { t: 'table', head: ['Item', 'V/F', 'Por quê'], rows: [
            ['T ⇒ aba', '<b>F</b>', 'em 1 passo T só vira XTX, X ou ε'],
            ['T ⇒* aba', '<b>V</b>', 'T ⇒ XTX ⇒ XXX ⇒ aXX ⇒ abX ⇒ aba'],
            ['T ⇒ T', '<b>F</b>', 'não existe a regra T → T (T ⇒* T seria V, com 0 passos)'],
            ['XXX ⇒* aba', '<b>V</b>', 'X → a, X → b, X → a'],
            ['T ⇒* XX', '<b>V</b>', 'T ⇒ XTX ⇒ XX (T → ε)'],
            ['T ⇒* XXX', '<b>V</b>', 'T ⇒ XTX ⇒ XXX (T → X)'],
            ['S ⇒* ε', '<b>F</b>', 'as duas regras de S já produzem 2 terminais'],
          ] },
          { t: 'note', kind: 'warn', html: 'Pegadinhas: <b>T ⇒ aba</b> e <b>T ⇒ T</b>. A diferença está na seta: ⇒ é exatamente 1 passo, ⇒* é 0 ou mais.' },
        ],
      },
      {
        id: 'ex-gram-q2',
        title: 'Questão 2 — pelo menos três 1’s',
        blocks: [
          { t: 'note', kind: 'q', html: 'Dado Σ = {0, 1}, dê a gramática que gere { w | w contém pelo menos três 1’s }.' },
          { t: 'p', html: 'O que a gramática precisa lembrar: <b>quantos 1’s já foram gerados</b> (0, 1, 2, 3 ou mais). Cada não terminal guarda uma contagem, igual aos estados de um AFD.' },
          { t: 'code', text: 'G = ({S, A, B, C}, {0, 1}, P, S)\n\nS → 0S | 1A       (nenhum 1 ainda)\nA → 0A | 1B       (um 1)\nB → 0B | 1C       (dois 1’s)\nC → 0C | 1C | ε   (três ou mais: pode parar)' },
          { t: 'p', html: 'O <b>ε só existe em C</b>, então a derivação só termina depois do terceiro 1. A gramática é regular, e o AF sai direto do dicionário:' },
          { t: 'fig', model: F_TRES_UNS, caption: 'AFD da gramática: cada estado é uma contagem de 1’s; só C (três ou mais) é final.', re: '^(0*1){3}[01]*$' },
          { t: 'code', text: 'Gerada:     10101 : S ⇒ 1A ⇒ 10A ⇒ 101B ⇒ 1010B ⇒ 10101C ⇒ 10101\nNão gerada: 0110  : só dois 1’s → para em B, e B não tem → ε' },
          { t: 'note', kind: 'tip', html: 'Também vale a livre de contexto <b>S → A1A1A1A</b>, <b>A → 0A | 1A | ε</b>. A regular é mais fácil de provar e de converter em AF.' },
        ],
      },
      {
        id: 'ex-gram-q3',
        title: 'Questão 3 — sentença × forma sentencial',
        blocks: [
          { t: 'note', kind: 'q', html: 'Explique a diferença entre sentença e forma sentencial.' },
          { t: 'list', items: [
            '<b>Forma sentencial</b>: qualquer cadeia derivável do símbolo de partida (S ⇒* α). Pode misturar terminais e não terminais.',
            '<b>Sentença</b>: forma sentencial formada <b>só por terminais</b>. É ela que pertence a L(G).',
          ] },
          { t: 'p', html: 'Toda sentença é forma sentencial; o contrário não vale. Na questão 1: <b>aXb</b> é forma sentencial (R ⇒ S ⇒ aTb ⇒ aXb); <b>aab</b> é sentença (aXb ⇒ aab).' },
        ],
      },
      {
        id: 'ex-gram-q4',
        title: 'Questão 4 — linguagem gerada',
        blocks: [
          { t: 'note', kind: 'q', html: 'Defina o que é linguagem gerada por uma gramática.' },
          { t: 'code', text: 'G = (N, T, P, S)\n\nL(G) = { w ∈ T* | S ⇒* w }' },
          { t: 'p', html: 'É o conjunto de <b>todas as sentenças</b> de G: cadeias só de terminais obtidas a partir do símbolo de partida, aplicando as produções de P zero ou mais vezes.' },
        ],
      },
      {
        id: 'ex-gram-q5',
        title: 'Questão 5 — (id + id) / id é gerada?',
        blocks: [
          { t: 'note', kind: 'q', html: 'Verifique se w = (id + id) / id é gerada por G = ({EXPR, OP}, {&lt;, &gt;, id, -, +, *, /}, P, EXPR).' },
          { t: 'code', text: 'EXPR → EXPR OP EXPR | (EXPR) | EXPR | id\nOP   → + | - | * | /' },
          { t: 'p', html: '<b>Sim.</b> Derivação mais à esquerda:' },
          { t: 'code', text: 'EXPR ⇒ EXPR OP EXPR\n     ⇒ (EXPR) OP EXPR\n     ⇒ (EXPR OP EXPR) OP EXPR\n     ⇒ (id OP EXPR) OP EXPR\n     ⇒ (id + EXPR) OP EXPR\n     ⇒ (id + id) OP EXPR\n     ⇒ (id + id) / EXPR\n     ⇒ (id + id) / id' },
          { t: 'list', items: [
            '<b>Erro no enunciado:</b> T lista &lt; e &gt;, mas as regras usam ( e ). Responda “sim, considerando ( e ) como terminais” e registre a observação.',
            '<b>EXPR → EXPR</b> é uma regra unitária inútil: não muda nada e só permite derivações infinitas.',
            '<b>A gramática é ambígua:</b> id + id / id tem duas árvores, porque não há precedência. Na palavra pedida, os parênteses resolvem.',
          ] },
        ],
      },
    ],
  },

  {
    id: 'lista-gr',
    title: 'Gramáticas Regulares',
    summary: 'Da gramática regular para o AFD, conferindo na bancada.',
    sections: [
      {
        id: 'ex-gr-q1',
        title: 'Questão 1 — AFD da gramática',
        blocks: [
          { t: 'note', kind: 'q', html: 'Obtenha o AFD da gramática G = ({S, B}, {0, 1}, P, S).' },
          { t: 'code', text: 'S → 0S | 1B\nB → 0S | 1B | ε' },
          { t: 'table', head: ['Regra', 'No AFD'], rows: [
            ['S (partida)', 'S é o estado <b>inicial</b>'],
            ['S → 0S', 'laço em S com 0'],
            ['S → 1B', 'S —1→ B'],
            ['B → 0S', 'B —0→ S'],
            ['B → 1B', 'laço em B com 1'],
            ['B → ε', 'B é <b>final</b>'],
          ] },
          { t: 'fig', model: F_GR_Q1, caption: 'Completo (uma saída por símbolo em cada estado), então não precisa de estado morto. Aceita as palavras que terminam em 1.', re: '^[01]*1$' },
          { t: 'note', kind: 'warn', title: 'Erro comum', html: 'Montar as quatro transições certas e esquecer de marcar <b>B como final</b>. Sem nenhum estado final o autômato não aceita nada (L = ∅): a palavra <b>1</b> é gerada (S ⇒ 1B ⇒ 1), mas o AFD pararia em B e rejeitaria. <b>A → ε sempre torna A final.</b>' },
          { t: 'p', html: 'Por que “termina em 1”: toda vez que lê 1 o autômato vai para B, toda vez que lê 0 volta para S. Só fica em B (final) se o último símbolo foi 1. ε não é aceita porque S não tem S → ε.' },
          { t: 'table', head: ['Palavra', 'Caminho', 'Resultado'], rows: [
            ['ε', 'S', 'rejeita'],
            ['0', 'S S', 'rejeita'],
            ['1', 'S B', 'aceita'],
            ['10', 'S B S', 'rejeita'],
            ['01', 'S S B', 'aceita'],
            ['0110', 'S S B B S', 'rejeita'],
            ['1011', 'S B S B B', 'aceita'],
          ] },
        ],
      },
    ],
  },
];
