import { Exercise } from '../../domain/exercise';
import { Block, Chapter, aut } from './teoria.content';

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

// ───────────────────── Lista — Gramáticas Livres de Contexto ─────────────────────
// Respostas-modelo geradas e conferidas pelo próprio motor (domain/grammar.ts):
// derivações válidas, na ordem pedida, chegando na palavra; árvores válidas e
// completas; gramáticas da Q11/Q12 comparadas com a linguagem em todas as palavras
// até o tamanho usado na correção.
const ex = (e: Exercise): Block => ({ t: 'ex', ex: e });
const G_EXPR = "E → E + E | E * E | ( E ) | - E | id";
const G_ASB = "S → aSb | SS | ε";
const G_ETF = "E → E + T | T\nT → T * F | F\nF → ( E ) | a";
const G_Q9 = "S → aSbSa | ε";
const G_Q10 = "S → bAS | a\nA → SaA | SS | ab";
const count = (w: string, s: string) => { let c = 0; for (let i = 0; i + s.length <= w.length; i++) if (w.startsWith(s, i)) c++; return c; };
const TIPO = ['Tipo 3 (regular)', 'Tipo 2 (livre de contexto)'];

export const EXERCICIOS_GLC: Chapter = {
  id: 'lista-glc',
  title: 'Gramáticas Livres de Contexto',
  summary: 'Derivações mais à esquerda e à direita, árvores, ambiguidade e construção de gramáticas — responda, corrija quantas vezes quiser e compare com a resposta-modelo.',
  sections: [    {
      id: 'ex-glc-q1',
      title: 'Questão 1 — derivações mais à esquerda e à direita',
      blocks: [
        { t: 'note', kind: 'q', html: 'Dada G = ({E}, {+, *, (, ), -, id}, P, E), obtenha as derivações <b>mais à esquerda</b> e <b>mais à direita</b> das sentenças a seguir.' },
        { t: 'code', text: "E → E + E | E * E | ( E ) | - E | id" },
        { t: 'note', kind: 'tip', html: 'Mais à esquerda: em todo passo troque o <b>primeiro</b> não terminal da forma. Mais à direita: troque o <b>último</b>. Clique num não terminal para gerar o próximo passo.' },
        ex({ id: "glc-1a-e", label: "1a · mais à esquerda", prompt: "Derivação mais à esquerda de <code>id * id * id</code>.", check: { kind: 'derivation', grammar: G_EXPR, word: "id * id * id", order: 'left' }, answer: "E\nE * E\nE * E * E\nid * E * E\nid * id * E\nid * id * id", explain: "A gramática é <b>ambígua</b> (não tem precedência entre + e *), então existe mais de uma árvore e mais de uma derivação certa: qualquer derivação válida na ordem pedida é aceita. A resposta-modelo é uma delas." }),
        ex({ id: "glc-1a-d", label: "1a · mais à direita", prompt: "Derivação mais à direita de <code>id * id * id</code>.", check: { kind: 'derivation', grammar: G_EXPR, word: "id * id * id", order: 'right' }, answer: "E\nE * E\nE * id\nE * E * id\nE * id * id\nid * id * id", explain: "A gramática é <b>ambígua</b> (não tem precedência entre + e *), então existe mais de uma árvore e mais de uma derivação certa: qualquer derivação válida na ordem pedida é aceita. A resposta-modelo é uma delas." }),
        ex({ id: "glc-1b-e", label: "1b · mais à esquerda", prompt: "Derivação mais à esquerda de <code>(id + id) * id</code>.", check: { kind: 'derivation', grammar: G_EXPR, word: "(id + id) * id", order: 'left' }, answer: "E\nE * E\n( E ) * E\n( E + E ) * E\n( id + E ) * E\n( id + id ) * E\n( id + id ) * id" }),
        ex({ id: "glc-1b-d", label: "1b · mais à direita", prompt: "Derivação mais à direita de <code>(id + id) * id</code>.", check: { kind: 'derivation', grammar: G_EXPR, word: "(id + id) * id", order: 'right' }, answer: "E\nE * E\nE * id\n( E ) * id\n( E + E ) * id\n( E + id ) * id\n( id + id ) * id" }),
        ex({ id: "glc-1c-e", label: "1c · mais à esquerda", prompt: "Derivação mais à esquerda de <code>-(id + id) * id + id</code>.", check: { kind: 'derivation', grammar: G_EXPR, word: "-(id + id) * id + id", order: 'left' }, answer: "E\nE + E\nE * E + E\n- E * E + E\n- ( E ) * E + E\n- ( E + E ) * E + E\n- ( id + E ) * E + E\n- ( id + id ) * E + E\n- ( id + id ) * id + E\n- ( id + id ) * id + id", explain: "O primeiro símbolo é o <b>-</b> unário (E → - E)." }),
        ex({ id: "glc-1c-d", label: "1c · mais à direita", prompt: "Derivação mais à direita de <code>-(id + id) * id + id</code>.", check: { kind: 'derivation', grammar: G_EXPR, word: "-(id + id) * id + id", order: 'right' }, answer: "E\nE + E\nE + id\nE * E + id\nE * id + id\n- E * id + id\n- ( E ) * id + id\n- ( E + E ) * id + id\n- ( E + id ) * id + id\n- ( id + id ) * id + id", explain: "O primeiro símbolo é o <b>-</b> unário (E → - E)." }),
      ],
    },    {
      id: 'ex-glc-q2',
      title: 'Questão 2 — árvores em S → aSb | SS | ε',
      blocks: [
        { t: 'note', kind: 'q', html: 'Dada G = ({S}, {a, b}, {S → aSb | SS | ε}, S), faça a árvore de derivação das sentenças.' },
        { t: 'note', kind: 'tip', html: 'Clique no S para escolher a regra. A regra S → ε vira um filho <b>ε</b>. Em <code>abab</code> há dois blocos “ab” lado a lado: isso pede S → SS.' },
        ex({ id: "glc-2a", label: "2a", prompt: "Árvore de derivação de <code>abab</code>.", check: { kind: 'tree', grammar: G_ASB, word: "abab" }, answer: "S[S[a S[ε] b] S[a S[ε] b]]" }),
        ex({ id: "glc-2b", label: "2b", prompt: "Árvore de derivação de <code>aaabbb</code>.", check: { kind: 'tree', grammar: G_ASB, word: "aaabbb" }, answer: "S[a S[a S[a S[ε] b] b] b]" }),
        ex({ id: "glc-2c", label: "2c", prompt: "Árvore de derivação de <code>aababb</code>.", check: { kind: 'tree', grammar: G_ASB, word: "aababb" }, answer: "S[a S[S[a S[ε] b] S[a S[ε] b]] b]", explain: "Por fora um par a…b (S → aSb); dentro, dois blocos “ab” (S → SS)." }),
      ],
    },    {
      id: 'ex-glc-q3',
      title: 'Questão 3 — árvores em E, T, F',
      blocks: [
        { t: 'note', kind: 'q', html: 'Dada G = ({E, T, F}, {+, *, (, ), a}, P, E), faça a árvore de derivação das sentenças.' },
        { t: 'code', text: "E → E + T | T\nT → T * F | F\nF → ( E ) | a" },
        { t: 'note', kind: 'tip', html: 'Esta gramática <b>não é ambígua</b>: o * fica mais fundo na árvore (T → T * F) do que o + (E → E + T), então a precedência sai da própria estrutura. Para cada sentença há uma árvore só.' },
        ex({ id: "glc-3a", label: "3a", prompt: "Árvore de derivação de <code>a + a * a</code>.", check: { kind: 'tree', grammar: G_ETF, word: "a + a * a" }, answer: "E[E[T[F[a]]] + T[T[F[a]] * F[a]]]" }),
        ex({ id: "glc-3b", label: "3b", prompt: "Árvore de derivação de <code>(a + a) * a</code>.", check: { kind: 'tree', grammar: G_ETF, word: "(a + a) * a" }, answer: "E[T[T[F[( E[E[T[F[a]]] + T[F[a]]] )]] * F[a]]]" }),
        ex({ id: "glc-3c", label: "3c", prompt: "Árvore de derivação de <code>((a))</code>.", check: { kind: 'tree', grammar: G_ETF, word: "((a))" }, answer: "E[T[F[( E[T[F[( E[T[F[a]]] )]]] )]]]", explain: "Cada par de parênteses passa por F → ( E ), e depois E → T → F de novo." }),
      ],
    },    {
      id: 'ex-glc-q4',
      title: 'Questão 4 — tipo 2 ou 3',
      blocks: [
        { t: 'note', kind: 'q', html: 'Indique o tipo de cada uma das gramáticas (2 ou 3).' },
        { t: 'note', kind: 'tip', html: 'Tipo 3 (regular): em <b>toda</b> regra o lado direito tem no máximo um não terminal, sempre no fim (ou sempre no começo). Qualquer outra coisa com um só não terminal à esquerda é tipo 2.' },
        ex({ id: "glc-4a", label: "S → aS | b", prompt: 'Qual o tipo desta gramática?', check: { kind: 'choice', options: TIPO, correct: 0 }, answer: TIPO[0], explain: "Todo lado direito é terminal seguido de no máximo um não terminal, no fim: linear à direita." }),
        ex({ id: "glc-4b", label: "S → AAA | a", prompt: 'Qual o tipo desta gramática?', check: { kind: 'choice', options: TIPO, correct: 1 }, answer: TIPO[1], explain: "AAA tem três não terminais no lado direito." }),
        ex({ id: "glc-4c", label: "S → (S) | S + S", prompt: 'Qual o tipo desta gramática?', check: { kind: 'choice', options: TIPO, correct: 1 }, answer: TIPO[1], explain: "Não terminal no meio, entre terminais, e dois não terminais em S + S." }),
        ex({ id: "glc-4d", label: "S → aA | Aba", prompt: 'Qual o tipo desta gramática?', check: { kind: 'choice', options: TIPO, correct: 1 }, answer: TIPO[1], explain: "aA é linear à direita, mas Aba é linear à esquerda: misturar as duas formas na mesma gramática deixa de ser regular." }),
        ex({ id: "glc-4e", label: "B → aB | a", prompt: 'Qual o tipo desta gramática?', check: { kind: 'choice', options: TIPO, correct: 0 }, answer: TIPO[0], explain: "Linear à direita: aB e a." }),
      ],
    },    {
      id: 'ex-glc-q5a8',
      title: 'Questões 5 a 8 — conceitos',
      blocks: [
        { t: 'note', kind: 'tip', html: 'Respostas dissertativas: a correção mostra quais pontos-chave a sua definição já cobre. Depois compare com a resposta-modelo.' },
        ex({ id: "glc-5", label: "5", prompt: "O que é uma gramática equivalente?", check: { kind: 'concept', groups: [{ label: "geram a mesma linguagem", terms: ["mesma linguagem", "mesmas palavras", "mesmas sentencas", "mesmo conjunto", "l(g1) = l(g2)", "l(g1)=l(g2)", "linguagens iguais", "linguagem igual", "geram a mesma", "gera a mesma", "mesma l(g)"] }, { label: "mesmo com regras diferentes", terms: ["diferente", "distint", "outras regras", "outra gramatica", "regras diferentes", "producoes diferentes"] }] }, answer: "Duas gramáticas G1 e G2 são equivalentes quando geram a mesma linguagem: L(G1) = L(G2). As regras podem ser completamente diferentes (por exemplo, uma ambígua e outra não, ou uma com produções ε e outra ε-livre)." }),
        ex({ id: "glc-6", label: "6", prompt: "O que é uma GLC ε-livre?", check: { kind: 'concept', groups: [{ label: "nenhuma produção da forma A → ε", terms: ["sem producoes vazias", "sem producao vazia", "nenhuma producao vazia", "nao possui producoes vazias", "nao tem producoes vazias", "nao possui producao vazia", "nao tem producao vazia", "sem regras vazias", "sem regra vazia", "→ ε", "-> ε", "sem ε", "sem epsilon", "nao possui ε", "nao tem ε", "nao possui epsilon", "nao tem epsilon", "producoes ε", "producao ε", "producoes-ε"] }, { label: "exceção: S → ε quando ε ∈ L(G), e S não aparece no lado direito", terms: ["exceto", "excecao", "a menos", "salvo", "s → ε", "s -> ε", "simbolo inicial", "simbolo de partida", "partida"] }] }, answer: "Uma GLC é ε-livre quando não tem produções vazias (A → ε). A única exceção permitida é S → ε, quando ε ∈ L(G), e nesse caso o símbolo de partida S não pode aparecer no lado direito de nenhuma regra. Toda GLC tem uma equivalente ε-livre." }),
        ex({ id: "glc-7", label: "7", prompt: "O que é uma gramática ambígua?", check: { kind: 'concept', groups: [{ label: "existe uma sentença (palavra) de L(G)", terms: ["sentenca", "palavra", "cadeia"] }, { label: "com duas ou mais árvores de derivação (ou derivações mais à esquerda) diferentes", terms: ["duas arvores", "mais de uma arvore", "duas ou mais arvores", "arvores diferentes", "arvores distintas", "duas derivacoes", "mais de uma derivacao", "duas ou mais derivacoes", "derivacoes mais a esquerda diferentes", "derivacoes distintas"] }] }, answer: "Uma gramática é ambígua quando existe pelo menos uma sentença de L(G) com duas (ou mais) árvores de derivação diferentes — de forma equivalente, duas derivações mais à esquerda (ou mais à direita) diferentes. Ex.: E → E + E | E * E | id com id + id * id." }),
        ex({ id: "glc-8", label: "8", prompt: "O que é uma gramática inerentemente ambígua?", check: { kind: 'concept', groups: [{ label: "é uma propriedade da linguagem", terms: ["linguagem"] }, { label: "toda gramática que gera essa linguagem é ambígua", terms: ["toda gramatica", "todas as gramaticas", "qualquer gramatica", "todas sao ambiguas", "sempre ambigua", "nao existe gramatica nao ambigua", "nao existe gramatica nao-ambigua", "nao existe nenhuma gramatica nao", "nenhuma gramatica nao ambigua"] }] }, answer: "É uma linguagem livre de contexto para a qual toda gramática que a gera é ambígua — não existe nenhuma GLC não ambígua para ela. (O termo correto é “linguagem inerentemente ambígua”.) Ex.: { aⁱbʲcᵏ | i = j ou j = k }: palavras com i = j = k têm sempre duas árvores." }),
      ],
    },    {
      id: 'ex-glc-q9',
      title: 'Questão 9 — quatro cadeias de L(G)',
      blocks: [
        { t: 'note', kind: 'q', html: 'Seja G = ({S}, {a, b}, {S → aSbSa | ε}, S). Mostre quatro cadeias de L(G) e a derivação de cada uma delas.' },
        ex({ id: 'glc-9', label: '9', prompt: 'Escreva quatro derivações, cada uma começando em S, separadas por uma <b>linha em branco</b>.', check: { kind: 'sentences', grammar: G_Q9, count: 4 }, answer: "S\naSbSa\nabSa\naba\n\nS\naSbSa\naaSbSabSa\naabSabSa\naababSa\naababa\n\nS\naSbSa\nabSa\nabaSbSaa\nababSaa\nababaa\n\nS\naSbSa\naaSbSabSa\naabSabSa\naababSa\naababaSbSaa\naabababSaa\naabababaa", explain: 'Toda cadeia não vazia tem a forma a·x·b·y·a, com x e y em L(G). A menor é <b>aba</b> (os dois S viram ε); as seguintes trocam um ou os dois S internos por aba. ε também pertence a L(G) (S → ε).' }),
      ],
    },    {
      id: 'ex-glc-q10',
      title: 'Questão 10 — árvore de bbabaaabbaba',
      blocks: [
        { t: 'note', kind: 'q', html: 'Obtenha a árvore de derivação da sentença “bbabaaabbaba” na gramática G = ({S, A}, {a, b}, P, S).' },
        { t: 'code', text: "S → bAS | a\nA → SaA | SS | ab" },
        ex({ id: "glc-10", label: "10", prompt: "Árvore de derivação de <code>bbabaaabbaba</code>.", check: { kind: 'tree', grammar: G_Q10, word: "bbabaaabbaba" }, answer: "S[b A[S[b A[a b] S[a]] a A[a b]] S[b A[a b] S[a]]]", explain: "Leia da esquerda: o S inicial começa com b, então é S → bAS. O A gera <b>babaaab</b> (S → bAS, A → SaA) e o último S gera <b>baba</b>. Use o botão <b>Abrir em Derivações</b> e “Gerar gabarito” para ver uma derivação completa." })
      ],
    },    {
      id: 'ex-glc-q11',
      title: 'Questão 11 — construa a gramática',
      blocks: [
        { t: 'note', kind: 'q', html: 'Construa uma gramática G para cada linguagem.' },
        { t: 'note', kind: 'tip', html: 'Uma regra por linha (S → aS | b); o símbolo de partida é o lado esquerdo da primeira. A correção gera todas as palavras da sua gramática até um tamanho limite e compara com a linguagem pedida, mostrando o que sobra e o que falta.' },
        ex({ id: 'glc-11a', label: '11a', prompt: "L(G) = <code>{ aⁿ bᵐ | n ≥ 0 e m ≥ 1 }</code>", check: { kind: 'build', alphabet: ["a", "b"], lang: (w) => /^a*b+$/.test(w), maxLen: 8 }, answer: "S → aS | B\nB → bB | b", explain: "S empilha os a’s (inclusive nenhum); B gera pelo menos um b." }),
        ex({ id: 'glc-11b', label: '11b', prompt: "L(G) = <code>{ aⁱ bʲ cⁱ | i ≥ 0 e j ≥ 1 }</code>", check: { kind: 'build', alphabet: ["a", "b", "c"], lang: (w) => { const m = /^(a*)(b+)(c*)$/.exec(w); return !!m && m[1].length === m[3].length; }, maxLen: 7 }, answer: "S → aSc | B\nB → bB | b", explain: "Cada a nasce junto com um c (S → aSc), garantindo a mesma quantidade; no meio, B gera bʲ com j ≥ 1. Não é regular." }),
        ex({ id: 'glc-11c', label: '11c', prompt: "L(G) = <code>{ aⁿ b²ⁿ | n ≥ 1 }</code>", check: { kind: 'build', alphabet: ["a", "b"], lang: (w) => { const m = /^(a+)(b+)$/.exec(w); return !!m && m[2].length === 2 * m[1].length; }, maxLen: 9 }, answer: "S → aSbb | abb", explain: "Cada a vem com dois b’s; a base abb garante n ≥ 1." }),
        ex({ id: 'glc-11d', label: '11d', prompt: "L(G) = <code>{ aⁿ bᵐ cⁿ⁻¹ | n ≥ 2 e m ≥ 1 }</code>", check: { kind: 'build', alphabet: ["a", "b", "c"], lang: (w) => { const m = /^(a+)(b+)(c*)$/.exec(w); return !!m && m[1].length >= 2 && m[3].length === m[1].length - 1; }, maxLen: 8 }, answer: "S → aA\nA → aAc | aBc\nB → bB | b", explain: "Um a sobra sem par (S → aA); os demais vêm com um c cada, e pelo menos um par (A → aBc) garante n ≥ 2." }),
        ex({ id: 'glc-11e', label: '11e', prompt: "L(G) = <code>{ w ∈ (0,1,2)⁺ | todos os 0’s são consecutivos }</code>", check: { kind: 'build', alphabet: ["0", "1", "2"], lang: (w) => w.length > 0 && /^[12]*0*[12]*$/.test(w), maxLen: 6 }, answer: "S → 1S | 2S | 0Z | 1 | 2\nZ → 0Z | 1B | 2B | ε\nB → 1B | 2B | ε", explain: "Antes do bloco de zeros vale 1 ou 2 à vontade (S); Z continua o bloco; depois que sai do bloco (B) não pode mais aparecer 0." }),
        ex({ id: 'glc-11f', label: '11f', prompt: "L(G) = <code>{ w ∈ (0,1,2)⁺ | todo 0 vem seguido de um 1 }</code>", check: { kind: 'build', alphabet: ["0", "1", "2"], lang: (w) => /^(1|2|01)+$/.test(w), maxLen: 6 }, answer: "S → 1S | 2S | 01S | 1 | 2 | 01", explain: "A palavra é uma sequência de blocos 1, 2 ou 01: o 0 só aparece colado num 1." }),
        ex({ id: 'glc-11g', label: '11g', prompt: "L(G) = <code>{ w ∈ (a,b)⁺ | no máximo um par aa e no máximo um par bb como subpalavra }</code>", check: { kind: 'build', alphabet: ["a", "b"], lang: (w) => w.length > 0 && count(w, 'aa') <= 1 && count(w, 'bb') <= 1, maxLen: 8 }, answer: "S → aA00 | bB00\nA00 → aA10 | bB00 | ε\nA10 → bB10 | ε\nA01 → aA11 | bB01 | ε\nA11 → bB11 | ε\nB00 → bB01 | aA00 | ε\nB01 → aA01 | ε\nB10 → bB11 | aA10 | ε\nB11 → aA11 | ε", explain: "Lido como “aa aparece no máximo uma vez” (aaa tem duas ocorrências, sobrepostas). Cada não terminal lembra a última letra (A/B) e se aa e bb já foram usados (dígitos): é o AFD escrito como gramática." }),
        ex({ id: 'glc-11h', label: '11h', prompt: "L(G) = <code>{ w ∈ (0,1,2)⁺ | w não possui 010 }</code>", check: { kind: 'build', alphabet: ["0", "1", "2"], lang: (w) => w.length > 0 && !w.includes('010'), maxLen: 6 }, answer: "S → 0A | 1B | 2B\nB → 0A | 1B | 2B | ε\nA → 0A | 1C | 2B | ε\nC → 1B | 2B | ε", explain: "Estados do AFD de “não contém 010”: B = nada útil, A = acabou em 0, C = acabou em 01 (aqui o 0 é proibido)." }),
        ex({ id: 'glc-11i', label: '11i', prompt: "L(G) = <code>{ w ∈ (a,b,c)⁺ | w possui baa }</code>", check: { kind: 'build', alphabet: ["a", "b", "c"], lang: (w) => w.includes('baa'), maxLen: 6 }, answer: "S → aS | bS | cS | baaT\nT → aT | bT | cT | ε", explain: "Qualquer prefixo, depois o baa obrigatório, depois qualquer sufixo." }),
      ],
    },    {
      id: 'ex-glc-q12',
      title: 'Questão 12 — palíndromos',
      blocks: [
        { t: 'note', kind: 'q', html: 'Construa uma gramática que gere L(G) = { w | w ∈ (a,b,c)⁺ e w é palíndromo }. Ex.: abba, bcabacb, abbbba, cacac.' },
        ex({ id: 'glc-12', label: '12', prompt: 'L(G) = <code>{ w ∈ (a,b,c)⁺ | w = wᴿ }</code>', check: { kind: 'build', alphabet: ['a', 'b', 'c'], lang: (w) => w.length > 0 && w === [...w].reverse().join(''), maxLen: 6 }, answer: "S → aSa | bSb | cSc | a | b | c | aa | bb | cc", explain: 'Cada passo põe a mesma letra nas duas pontas. O miolo final é uma letra (tamanho ímpar) ou um par igual (tamanho par). Sem S → ε, porque ε não está em (a,b,c)⁺.' }),
      ],
    },
  ],
};

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
  EXERCICIOS_GLC,
];
