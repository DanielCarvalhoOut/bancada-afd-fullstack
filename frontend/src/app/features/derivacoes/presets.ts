/** Gramáticas prontas: as da lista e as do quadro. Dado estático. */
export interface Preset {
  id: string;
  label: string;
  grammar: string;
  word: string;
  note: string;
}

export const PRESETS: Preset[] = [
  {
    id: 'lista-q1',
    label: 'Lista · Q1 (não palíndromos)',
    grammar: 'R → XRX | S\nS → aTb | bTa\nT → XTX | X | ε\nX → a | b',
    word: 'aaaba',
    note: 'Símbolo de partida R. Gera as palavras sobre {a, b} que não são palíndromos.',
  },
  {
    id: 'lista-q2',
    label: 'Lista · Q2 (pelo menos três 1’s)',
    grammar: 'S → 0S | 1A\nA → 0A | 1B\nB → 0B | 1C\nC → 0C | 1C | ε',
    word: '10101',
    note: 'Regular: cada não terminal guarda quantos 1’s já saíram.',
  },
  {
    id: 'lista-q5',
    label: 'Lista · Q5 (expressões)',
    grammar: 'EXPR → EXPR OP EXPR | (EXPR) | EXPR | id\nOP → + | - | * | /',
    word: '(id + id) / id',
    note: 'Escrita com espaços: “id” é um terminal só. Ambígua e com a regra inútil EXPR → EXPR.',
  },
  {
    id: 'gr-q1',
    label: 'Regulares · Q1 (termina em 1)',
    grammar: 'S → 0S | 1B\nB → 0S | 1B | ε',
    word: '0101',
    note: 'Gramática regular: a derivação é a própria simulação do AFD.',
  },
  {
    id: 'quadro-aASb',
    label: 'Quadro · S → ab | aASb',
    grammar: 'S → ab | aASb\nA → bSb | ε',
    word: 'ababbabb',
    note: 'Exemplo de derivação mais à esquerda feito em aula.',
  },
  {
    id: 'ambigua',
    label: 'Ambígua · E → E + E | E * E',
    grammar: 'E → E + E | E * E | id',
    word: 'id + id * id',
    note: 'Duas árvores diferentes para a mesma palavra: tente montar as duas.',
  },
  {
    id: '0n1n',
    label: '0ⁿ1ⁿ (livre de contexto)',
    grammar: 'S → 0S1 | 01',
    word: '000111',
    note: 'Não é regular: nenhum AFD reconhece.',
  },
];
