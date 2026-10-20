/**
 * Gramáticas prontas, agrupadas pela atividade de onde vieram. Dado estático.
 * `atividade` liga o grupo ao PDF (core/atividades.ts); `section` liga a questão
 * à resolução/exercício em Exercícios.
 */
export interface Preset {
  id: string;          // único entre todos os grupos (é o que fica salvo)
  label: string;
  grammar: string;
  word: string;
  note: string;
  section?: string;
}

export interface PresetGroup {
  id: string;
  label: string;
  atividade?: string;
  items: Preset[];
}

const G_LISTA1 = 'R → XRX | S\nS → aTb | bTa\nT → XTX | X | ε\nX → a | b';
const G_EXPR = 'E → E + E | E * E | ( E ) | - E | id';
const G_ASB = 'S → aSb | SS | ε';
const G_ETF = 'E → E + T | T\nT → T * F | F\nF → ( E ) | a';

export const PRESET_GROUPS: PresetGroup[] = [
  {
    id: 'lista-gramaticas',
    label: 'Lista — Gramáticas',
    atividade: 'lista-gramaticas',
    items: [
      { id: 'lista-q1', label: 'Q1 · não palíndromos (aaaba)', grammar: G_LISTA1, word: 'aaaba', section: 'ex-gram-q1',
        note: 'Símbolo de partida R. Gera as palavras sobre {a, b} que não são palíndromos.' },
      { id: 'lista-q2', label: 'Q2 · pelo menos três 1’s (10101)', grammar: 'S → 0S | 1A\nA → 0A | 1B\nB → 0B | 1C\nC → 0C | 1C | ε', word: '10101', section: 'ex-gram-q2',
        note: 'Regular: cada não terminal guarda quantos 1’s já saíram.' },
      { id: 'lista-q5', label: 'Q5 · expressões ((id + id) / id)', grammar: 'EXPR → EXPR OP EXPR | (EXPR) | EXPR | id\nOP → + | - | * | /', word: '(id + id) / id', section: 'ex-gram-q5',
        note: 'Escrita com espaços: “id” é um terminal só. Ambígua e com a regra inútil EXPR → EXPR.' },
      { id: 'gr-q1', label: 'Regulares Q1 · termina em 1 (0101)', grammar: 'S → 0S | 1B\nB → 0S | 1B | ε', word: '0101', section: 'ex-gr-q1',
        note: 'Gramática regular: a derivação é a própria simulação do autômato.' },
      { id: 'gr-q2', label: 'Regulares Q2 · R → aS | aR | bR (baaab)', grammar: 'R → aS | aR | bR\nS → aT\nT → aX | bX\nX → a | b', word: 'baaab', section: 'ex-gr-q2',
        note: 'R lendo a vai para dois lugares (R → aS | aR): o AF direto é um AFN.' },
      { id: 'gr-q5a', label: 'Regulares Q5a (abb)', grammar: 'S → aA | bB | ε\nA → aA | bB\nB → bB | b', word: 'abb', section: 'ex-gr-q5',
        note: 'S → ε: o estado inicial também é final.' },
      { id: 'gr-q5b', label: 'Regulares Q5b (01122)', grammar: 'S → 0S | 1A | 2B | 0 | 0C\nA → 1S | 1\nB → 2S | 2\nC → 0S | 0', word: '01122', section: 'ex-gr-q5',
        note: 'S → 0S | 0C: duas saídas com 0, AFN.' },
    ],
  },
  {
    id: 'lista-glc',
    label: 'Lista — Gramáticas Livres de Contexto',
    atividade: 'lista-glc',
    items: [
      { id: 'glc-q1a', label: 'Q1a · id * id * id', grammar: G_EXPR, word: 'id * id * id', section: 'ex-glc-q1', note: 'Ambígua: há duas árvores. Monte as duas!' },
      { id: 'glc-q1b', label: 'Q1b · (id + id) * id', grammar: G_EXPR, word: '(id + id) * id', section: 'ex-glc-q1', note: 'Peça derivações mais à esquerda e mais à direita.' },
      { id: 'glc-q1c', label: 'Q1c · -(id + id) * id + id', grammar: G_EXPR, word: '-(id + id) * id + id', section: 'ex-glc-q1', note: 'O primeiro símbolo é o - unário (E → - E).' },
      { id: 'glc-q2a', label: 'Q2a · abab', grammar: G_ASB, word: 'abab', section: 'ex-glc-q2', note: 'Dois blocos “ab” lado a lado: S → SS.' },
      { id: 'glc-q2b', label: 'Q2b · aaabbb', grammar: G_ASB, word: 'aaabbb', section: 'ex-glc-q2', note: 'Pares a…b aninhados: S → aSb três vezes.' },
      { id: 'glc-q2c', label: 'Q2c · aababb', grammar: G_ASB, word: 'aababb', section: 'ex-glc-q2', note: 'Um par por fora, dois blocos por dentro.' },
      { id: 'glc-q3a', label: 'Q3a · a + a * a', grammar: G_ETF, word: 'a + a * a', section: 'ex-glc-q3', note: 'Não ambígua: o * fica mais fundo que o +.' },
      { id: 'glc-q3b', label: 'Q3b · (a + a) * a', grammar: G_ETF, word: '(a + a) * a', section: 'ex-glc-q3', note: 'Os parênteses passam por F → ( E ).' },
      { id: 'glc-q3c', label: 'Q3c · ((a))', grammar: G_ETF, word: '((a))', section: 'ex-glc-q3', note: 'Cada par de parênteses: E → T → F → ( E ).' },
      { id: 'glc-q9', label: 'Q9 · S → aSbSa | ε (aba)', grammar: 'S → aSbSa | ε', word: 'aba', section: 'ex-glc-q9', note: 'Troque a palavra para testar outras cadeias de L(G).' },
      { id: 'glc-q10', label: 'Q10 · bbabaaabbaba', grammar: 'S → bAS | a\nA → SaA | SS | ab', word: 'bbabaaabbaba', section: 'ex-glc-q10', note: 'Use “Gerar gabarito” se travar.' },
    ],
  },
  {
    id: 'quadro',
    label: 'Exemplos do quadro',
    items: [
      { id: 'quadro-aASb', label: 'S → ab | aASb (ababbabb)', grammar: 'S → ab | aASb\nA → bSb | ε', word: 'ababbabb', note: 'Exemplo de derivação mais à esquerda feito em aula.' },
      { id: 'ambigua', label: 'Ambígua · E → E + E | E * E', grammar: 'E → E + E | E * E | id', word: 'id + id * id', note: 'Duas árvores diferentes para a mesma palavra: tente montar as duas.' },
      { id: '0n1n', label: '0ⁿ1ⁿ (livre de contexto)', grammar: 'S → 0S1 | 01', word: '000111', note: 'Não é regular: nenhum autômato finito reconhece.' },
    ],
  },
];

export const PRESETS: Preset[] = PRESET_GROUPS.flatMap((g) => g.items);
export const groupOf = (presetId: string): PresetGroup | null =>
  PRESET_GROUPS.find((g) => g.items.some((p) => p.id === presetId)) ?? null;
