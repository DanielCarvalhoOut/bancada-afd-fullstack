import { AutomatonKind, AutomatonModel } from '../../domain/automaton';
import { Exercise } from '../../domain/exercise';

/**
 * Conteúdo do "livro" de teoria. É dado estático (não vem de backend): cada
 * capítulo tem seções, e cada seção é uma lista de blocos tipados. Os blocos
 * `fig` são autômatos de verdade, desenhados pelo mesmo motor da bancada e que
 * podem ser abertos nela. O campo `re` (opcional) é a linguagem esperada da
 * figura em regex JS — não aparece na tela; serve só para conferência.
 */
export type NoteKind = 'def' | 'tip' | 'warn' | 'ex' | 'q';

export type Block =
  | { t: 'p'; html: string }
  | { t: 'h'; text: string }
  | { t: 'list'; items: string[]; ordered?: boolean }
  | { t: 'table'; head: string[]; rows: string[][] }
  | { t: 'code'; text: string }
  | { t: 'note'; kind: NoteKind; title?: string; html: string }
  | { t: 'fig'; model: AutomatonModel; caption: string; re?: string }
  /** Exercício corrigível (responder, corrigir, ver resposta). */
  | { t: 'ex'; ex: Exercise };

export interface Section { id: string; title: string; blocks: Block[] }
export interface Chapter { id: string; title: string; summary: string; sections: Section[] }

type S = [name: string, x: number, y: number, flags?: string]; // flags: i = inicial, f = final
type T = [from: string, to: string, syms: string];

/** Monta um modelo compacto: estados com posição e transições "a,b". */
export function aut(kind: AutomatonKind, states: S[], trans: T[], alphabet?: string[]): AutomatonModel {
  return {
    kind,
    alphabet,
    states: states.map(([n, x, y, f = '']) => ({
      id: n, name: n, x, y, initial: f.includes('i'), accepting: f.includes('f'),
    })),
    transitions: trans.map(([from, to, s]) => ({ from, to, symbols: s.split(',') })),
  };
}

// ───────────────────────── figuras reutilizadas ─────────────────────────
const F_TERMINA0 = aut('afd',
  [['q0', 100, 120, 'i'], ['q1', 300, 120, 'f']],
  [['q0', 'q1', '0'], ['q1', 'q0', '1'], ['q0', 'q0', '1'], ['q1', 'q1', '0']]);

const F_COMECA1 = aut('afd',
  [['q0', 100, 120, 'i'], ['q1', 300, 60, 'f'], ['D', 300, 200]],
  [['q0', 'q1', '1'], ['q0', 'D', '0'], ['q1', 'q1', '0,1'], ['D', 'D', '0,1']]);

const F_TERMINA01 = aut('afd',
  [['s0', 100, 140, 'i'], ['s1', 290, 140], ['s2', 480, 140, 'f']],
  [['s0', 's0', '1'], ['s0', 's1', '0'], ['s1', 's1', '0'], ['s1', 's2', '1'], ['s2', 's1', '0'], ['s2', 's0', '1']]);

const F_NAO00 = aut('afd',
  [['q0', 100, 130, 'if'], ['q1', 290, 130, 'f'], ['D', 480, 130]],
  [['q0', 'q0', '1'], ['q0', 'q1', '0'], ['q1', 'q0', '1'], ['q1', 'D', '0'], ['D', 'D', '0,1']]);

const F_PAR0 = aut('afd',
  [['par', 110, 120, 'if'], ['ímpar', 310, 120]],
  [['par', 'ímpar', '0'], ['ímpar', 'par', '0'], ['par', 'par', '1'], ['ímpar', 'ímpar', '1']]);

const F_CONTEM01 = aut('afn',
  [['A', 100, 130, 'i'], ['B', 290, 130], ['C', 480, 130, 'f']],
  [['A', 'A', '0,1'], ['A', 'B', '0'], ['B', 'C', '1'], ['C', 'C', '0,1']]);

const F_DET01 = aut('afd',
  [['A', 100, 160, 'i'], ['AB', 290, 160], ['AC', 480, 160, 'f'], ['ABC', 480, 330, 'f']],
  [['A', 'AB', '0'], ['A', 'A', '1'], ['AB', 'AB', '0'], ['AB', 'AC', '1'],
   ['AC', 'ABC', '0'], ['AC', 'AC', '1'], ['ABC', 'ABC', '0'], ['ABC', 'AC', '1']]);

const F_MIN01 = aut('afd',
  [['q0', 100, 130, 'i'], ['q1', 290, 130], ['q2', 480, 130, 'f']],
  [['q0', 'q0', '1'], ['q0', 'q1', '0'], ['q1', 'q1', '0'], ['q1', 'q2', '1'], ['q2', 'q2', '0,1']]);

const F_ABC = aut('afn',
  [['S0', 100, 130, 'i'], ['S1', 290, 130], ['S2', 480, 130, 'f']],
  [['S0', 'S0', 'a'], ['S0', 'S1', 'ε'], ['S1', 'S1', 'b'], ['S1', 'S2', 'ε'], ['S2', 'S2', 'c']],
  ['a', 'b', 'c']);

const F_ABC_DET = aut('afd',
  [['X', 100, 130, 'if'], ['Y', 290, 130, 'f'], ['Z', 480, 130, 'f'], ['∅', 290, 320]],
  [['X', 'X', 'a'], ['X', 'Y', 'b'], ['X', 'Z', 'c'], ['Y', 'Y', 'b'], ['Y', 'Z', 'c'], ['Y', '∅', 'a'],
   ['Z', 'Z', 'c'], ['Z', '∅', 'a,b'], ['∅', '∅', 'a,b,c']],
  ['a', 'b', 'c']);

const F_QUADRO_GR = aut('afn',
  [['A', 100, 150, 'i'], ['B', 290, 80], ['C', 480, 150, 'f']],
  [['A', 'B', 'a'], ['A', 'C', 'a'], ['B', 'C', 'b'], ['C', 'C', 'c']],
  ['a', 'b', 'c']);

// S → 0S | B, B → 1B | ε, depois de eliminar a regra unitária e completar com o morto.
const F_UNITARIA = aut('afd',
  [['S', 100, 130, 'if'], ['B', 290, 130, 'f'], ['D', 480, 130]],
  [['S', 'S', '0'], ['S', 'B', '1'], ['B', 'B', '1'], ['B', 'D', '0'], ['D', 'D', '0,1']]);

const F_GR_EXEMPLO = aut('afd',
  [['S', 100, 130, 'i'], ['A', 290, 130], ['F', 480, 130, 'f']],
  [['S', 'S', 'a'], ['S', 'A', 'b'], ['A', 'A', 'a'], ['A', 'F', 'b']],
  ['a', 'b']);

const F_TH_A = aut('afn', [['1', 100, 110, 'i'], ['2', 290, 110, 'f']], [['1', '2', 'a']], ['a']);

const F_TH_AB = aut('afn',
  [['1', 100, 110, 'i'], ['2', 260, 110], ['3', 420, 110], ['4', 580, 110, 'f']],
  [['1', '2', 'a'], ['2', '3', 'ε'], ['3', '4', 'b']], ['a', 'b']);

const F_TH_UNIAO = aut('afn',
  [['0', 100, 160, 'i'], ['1', 270, 70], ['2', 440, 70, 'f'], ['3', 270, 250], ['4', 440, 250, 'f']],
  [['0', '1', 'ε'], ['0', '3', 'ε'], ['1', '2', 'a'], ['3', '4', 'b']], ['a', 'b']);

const F_TH_FECHO = aut('afn',
  [['0', 100, 140, 'if'], ['1', 280, 140], ['2', 460, 140, 'f']],
  [['0', '1', 'ε'], ['1', '2', 'a'], ['2', '1', 'ε']], ['a']);

const F_TH_COMPLETO = aut('afn',
  [['0', 100, 200, 'i'], ['1', 260, 90], ['2', 420, 90], ['3', 580, 90], ['4', 740, 90, 'f'],
   ['5', 260, 320, 'f'], ['6', 420, 320], ['7', 580, 320, 'f']],
  [['0', '1', 'ε'], ['1', '2', 'a'], ['2', '3', 'ε'], ['3', '4', 'b'],
   ['0', '5', 'ε'], ['5', '6', 'ε'], ['6', '7', 'a'], ['7', '6', 'ε']], ['a', 'b']);

const F_AFER1 = aut('afd',
  [['1', 110, 130, 'i'], ['2', 330, 130, 'f']],
  [['1', '1', '1'], ['1', '2', '0'], ['2', '2', '0,1']]);

const F_METODO2 = aut('afn',
  [['A', 100, 140, 'i'], ['B', 270, 140], ['C', 440, 140, 'f'], ['D', 610, 140, 'f']],
  [['A', 'A', '0,1'], ['A', 'B', '1'], ['B', 'C', '0,1'], ['C', 'D', '0,1']]);

// ───────────────────────────── capítulos ─────────────────────────────
export const CHAPTERS: Chapter[] = [
  {
    id: 'fundamentos',
    title: 'Fundamentos',
    summary: 'Alfabeto, palavra, linguagem e as operações básicas.',
    sections: [
      {
        id: 'alfabeto-palavra-linguagem',
        title: 'Alfabeto, palavra e linguagem',
        blocks: [
          { t: 'p', html: 'Toda a disciplina se apoia em três ideias. Elas parecem simples, mas quase todo erro de prova vem de confundir uma com a outra.' },
          { t: 'note', kind: 'def', title: 'Alfabeto (Σ)', html: 'Conjunto <b>finito e não vazio</b> de símbolos. Exemplos: Σ = {0, 1}, Σ = {a, b, c}.' },
          { t: 'note', kind: 'def', title: 'Palavra (cadeia)', html: 'Sequência <b>finita</b> de símbolos de Σ. O comprimento de w é |w|. A <b>palavra vazia</b> é <b>ε</b>, com |ε| = 0.' },
          { t: 'note', kind: 'def', title: 'Linguagem', html: 'Qualquer <b>conjunto de palavras</b> sobre Σ. Pode ser finita ({0, 01}) ou infinita (todas as palavras que terminam com 0).' },
          { t: 'note', kind: 'warn', title: 'Três coisas diferentes', html: '<b>ε</b> é uma palavra (de tamanho zero), <b>não</b> é um símbolo do alfabeto. <b>∅</b> é a linguagem vazia (nenhuma palavra). <b>{ε}</b> é a linguagem que contém só a palavra vazia. ∅ ≠ {ε}.' },
        ],
      },
      {
        id: 'operacoes',
        title: 'Operações com palavras e linguagens',
        blocks: [
          { t: 'table', head: ['Operação', 'Notação', 'Exemplo (Σ = {0, 1})'], rows: [
            ['Concatenação', 'w·v ou wv', '01 · 10 = 0110'],
            ['Potência', 'wⁿ (w⁰ = ε)', '(01)³ = 010101'],
            ['Fecho de Kleene', 'Σ*', 'todas as palavras, <b>incluindo ε</b>'],
            ['Fecho positivo', 'Σ⁺', 'todas as palavras, <b>exceto ε</b>'],
            ['Prefixo', '—', 'ε, 0, 01, 011 são prefixos de 011'],
            ['Sufixo', '—', 'ε, 1, 11, 011 são sufixos de 011'],
            ['Subpalavra', '—', 'trecho <b>contíguo</b>: 01 é subpalavra de 1011'],
          ] },
          { t: 'note', kind: 'tip', html: 'Quando o enunciado diz “w ∈ (0,1)⁺”, a palavra vazia está <b>fora</b>. Com “(0,1)*”, ela está <b>dentro</b>. Esse detalhe decide se o estado inicial é final.' },
        ],
      },
      {
        id: 'lendo-enunciados',
        title: 'Como ler um enunciado',
        blocks: [
          { t: 'p', html: 'Linguagens aparecem em notação de conjunto. Traduza para português antes de desenhar qualquer coisa:' },
          { t: 'table', head: ['Notação', 'Em português'], rows: [
            ['{ w | w termina com 0 }', 'o último símbolo é 0'],
            ['{ w | w contém 01 }', '“01” aparece em algum lugar, colado'],
            ['{ w | |w| é par }', 'comprimento par (inclui ε)'],
            ['{ 0ⁿ1ⁿ | n ≥ 1 }', 'n zeros seguidos de n uns: 01, 0011, 000111…'],
          ] },
          { t: 'note', kind: 'tip', title: 'Hábito de prova', html: 'Antes de construir, escreva <b>5 palavras que pertencem</b> e <b>5 que não pertencem</b>, incluindo ε e palavras de tamanho 1. Isso revela o padrão e já vira sua bateria de testes depois.' },
        ],
      },
    ],
  },

  {
    id: 'afd',
    title: 'Autômato Finito Determinístico (AFD)',
    summary: 'Definição, diagrama, determinismo, palavra vazia e projeto.',
    sections: [
      {
        id: 'afd-definicao',
        title: 'Definição formal',
        blocks: [
          { t: 'p', html: 'Um AFD é uma máquina com memória finita que lê a palavra símbolo a símbolo, da esquerda para a direita, e no fim diz <b>aceito</b> ou <b>rejeito</b>.' },
          { t: 'code', text: 'M = (Q, Σ, δ, q₀, F)' },
          { t: 'table', head: ['Componente', 'Significado'], rows: [
            ['Q', 'conjunto finito de estados'],
            ['Σ', 'alfabeto de entrada'],
            ['δ : Q × Σ → Q', 'função de transição: de um estado, lendo um símbolo, vai para <b>exatamente um</b> estado'],
            ['q₀ ∈ Q', 'estado inicial (um só)'],
            ['F ⊆ Q', 'estados de aceitação (zero ou mais)'],
          ] },
          { t: 'p', html: 'A palavra é <b>aceita</b> se, depois de ler o último símbolo, a máquina está num estado de F.' },
        ],
      },
      {
        id: 'afd-diagrama',
        title: 'Lendo o diagrama e a tabela',
        blocks: [
          { t: 'list', items: [
            '<b>Círculo</b> é um estado; <b>círculo duplo</b> é estado de aceitação.',
            'A <b>seta solta</b> (sem origem) aponta o estado inicial.',
            'Toda seta tem <b>direção</b>: q0 → q1 lendo 0 não implica voltar de q1 a q0.',
            'Rótulo <b>“0,1”</b> é só a forma compacta de <b>duas</b> transições (uma com 0, outra com 1) indo para o <b>mesmo</b> destino. Não significa “vai e volta”.',
          ] },
          { t: 'fig', model: F_TERMINA0, caption: 'AFD para “termina com 0”. O estado q1 lembra “o último símbolo lido foi 0”.', re: '^[01]*0$' },
          { t: 'p', html: 'A mesma máquina em <b>tabela de transição</b> (→ marca o inicial, * marca os finais):' },
          { t: 'table', head: ['δ', '0', '1'], rows: [['→ q0', 'q1', 'q0'], ['* q1', 'q1', 'q0']] },
        ],
      },
      {
        id: 'afd-determinismo',
        title: 'A regra do determinismo e o estado morto',
        blocks: [
          { t: 'note', kind: 'def', title: 'Regra', html: 'De <b>cada</b> estado sai <b>exatamente uma</b> seta para <b>cada</b> símbolo de Σ. Nem zero, nem duas.' },
          { t: 'p', html: 'A regra fala só de setas <b>saindo</b>. Setas <b>chegando</b> são livres: um estado pode receber zero, uma ou várias. Um estado que não recebe nenhuma seta (e não é o inicial) é <b>inalcançável</b> e pode ser removido.' },
          { t: 'p', html: 'Quando, a partir de certo ponto, nenhuma continuação pode ser aceita, a máquina vai para o <b>estado morto</b> (ou armadilha, sumidouro): não é final e tem laço em todos os símbolos.' },
          { t: 'fig', model: F_COMECA1, caption: 'AFD completo para “começa com 1”. Ler 0 no início leva ao estado morto D, de onde nada mais é aceito.', re: '^1[01]*$' },
          { t: 'note', kind: 'tip', html: 'Alguns autores aceitam o <b>AFD parcial</b>, que omite o estado morto: transição ausente significa “rejeita”. Na prova, se pedirem AFD <b>completo</b>, desenhe o morto.' },
        ],
      },
      {
        id: 'afd-palavra-vazia',
        title: 'A palavra vazia',
        blocks: [
          { t: 'note', kind: 'def', html: 'O AFD aceita <b>ε</b> se, e somente se, o <b>estado inicial é final</b>. Afinal, ler ε é não sair do lugar.' },
          { t: 'p', html: 'Para decidir, substitua ε na condição do enunciado:' },
          { t: 'table', head: ['Linguagem', 'ε pertence?', 'Por quê'], rows: [
            ['termina com 0', 'não', 'ε não tem último símbolo'],
            ['não contém 00', 'sim', 'ε não contém nada, logo não contém 00'],
            ['número par de 0s', 'sim', 'zero 0s, e zero é par'],
            ['contém 010 ou é ε', 'sim', 'o “ou é ε” inclui explicitamente'],
            ['w ∈ (0,1)⁺ …', 'não', 'o ⁺ exclui a vazia'],
          ] },
          { t: 'fig', model: F_PAR0, caption: 'Número par de 0s: o inicial é final porque ε tem zero 0s.', re: '^(1*01*0)*1*$' },
        ],
      },
      {
        id: 'afd-projeto',
        title: 'Projetando um AFD: o que preciso lembrar?',
        blocks: [
          { t: 'p', html: 'Cada estado representa <b>o que a máquina precisa lembrar</b> do que já leu para decidir o futuro. O número de estados é o número de <b>respostas diferentes</b> a essa pergunta (essa é a intuição do teorema de Myhill–Nerode).' },
          { t: 'p', html: 'Exemplo, “termina com 01”: preciso lembrar só <b>quanto do padrão 01 eu tenho no final</b>. São três situações: nada, “0”, ou “01”. Logo, três estados.' },
          { t: 'fig', model: F_TERMINA01, caption: 'Termina com 01. s1 = “acabei de ler 0”; s2 = “acabei de ler 01”.', re: '^[01]*01$' },
          { t: 'h', text: 'Padrões que se repetem' },
          { t: 'table', head: ['Linguagem', 'Estratégia'], rows: [
            ['começa com w', 'cadeia que lê w; depois final com laço em tudo; desvio → morto'],
            ['termina com w', 'estado = maior prefixo de w que é sufixo do que li; cuidado com as “voltas”'],
            ['contém w', 'como “termina com”, mas ao completar w vai para um final que absorve tudo'],
            ['não contém w', 'faça “contém w” completo e <b>troque os finais</b> (complemento)'],
            ['exatamente n de algo', 'contador 0…n e um estado morto para “passou de n”'],
            ['pelo menos n de algo', 'contador 0…n; o último é final e absorve tudo'],
            ['par / ímpar, módulo k', 'ciclo de k estados'],
            ['duas condições ao mesmo tempo', 'estado = par (situação 1, situação 2): construção produto'],
          ] },
        ],
      },
      {
        id: 'afd-complemento',
        title: 'Complemento',
        blocks: [
          { t: 'p', html: 'Se M é um AFD <b>completo</b>, trocar F por Q ∖ F (finais viram não finais e vice-versa) produz uma máquina que aceita exatamente as palavras que M rejeitava.' },
          { t: 'fig', model: F_NAO00, caption: '“Não contém 00”: é o AFD de “contém 00” com os finais trocados. D é o estado “já vi 00”.', re: '^(?![01]*00)[01]*$' },
          { t: 'note', kind: 'warn', html: 'Só funciona em AFD <b>completo</b> (com o estado morto desenhado). Em AFN a troca de finais <b>não</b> dá o complemento: determinize antes.' },
        ],
      },
    ],
  },

  {
    id: 'testando',
    title: 'Testando e conferindo autômatos',
    summary: 'Simulação, bateria de testes e equivalência com contraexemplo.',
    sections: [
      {
        id: 'teste-simulacao',
        title: 'Simulação passo a passo',
        blocks: [
          { t: 'p', html: 'Simular é seguir as setas lendo um símbolo por vez. O resultado é o <b>traço</b> (sequência de estados).' },
          { t: 'code', text: '“termina com 0”, palavra 1010:\nq0 —1→ q0 —0→ q1 —1→ q0 —0→ q1   (q1 é final → ACEITA)' },
          { t: 'p', html: 'Se faltar seta para o símbolo atual, a máquina <b>trava</b> e a palavra é rejeitada. Na bancada, o botão <b>Simular</b> mostra exatamente esse traço.' },
        ],
      },
      {
        id: 'teste-bateria',
        title: 'Bateria de testes: casos de fronteira',
        blocks: [
          { t: 'p', html: 'Um único teste não prova nada. Monte uma bateria com palavras que <b>devem</b> ser aceitas e palavras que <b>devem</b> ser rejeitadas, focando nas fronteiras:' },
          { t: 'list', items: [
            'a palavra vazia <b>ε</b>;',
            'palavras de tamanho 1;',
            'a <b>menor</b> palavra que satisfaz a condição, e a menor que quase satisfaz;',
            'o padrão no <b>início</b>, no <b>meio</b> e no <b>fim</b>.',
          ] },
          { t: 'table', head: ['“não contém 00”', 'Palavras'], rows: [
            ['devem aceitar', 'ε, 0, 1, 01, 10, 010, 0101'],
            ['devem rejeitar', '00, 100, 001, 1001, 0100'],
          ] },
        ],
      },
      {
        id: 'teste-equivalencia',
        title: 'Equivalência e contraexemplo',
        blocks: [
          { t: 'note', kind: 'def', html: 'Dois autômatos A e B são <b>equivalentes</b> quando L(A) = L(B): aceitam exatamente as mesmas palavras, mesmo que tenham desenhos e números de estados diferentes.' },
          { t: 'p', html: 'Para decidir, percorre-se o <b>autômato produto</b>: os dois são simulados juntos (cada lado como conjunto de estados), em largura. Se em algum ponto um aceita e o outro não, a palavra que levou até ali é um <b>contraexemplo</b>, e por ser busca em largura é a menor possível. Como os estados são finitos, a busca termina: é uma decisão exata, não um palpite.' },
          { t: 'note', kind: 'tip', title: 'Na bancada', html: 'Use <b>Biblioteca → Comparar</b> contra um gabarito. Se não bater, ela mostra o menor contraexemplo; rode essa palavra no <b>Simular</b> para ver onde o seu autômato desvia. <b>Ao lado</b> abre o gabarito em leitura para conferir transição por transição.' },
        ],
      },
    ],
  },

  {
    id: 'afn',
    title: 'Autômato Finito Não Determinístico (AFN)',
    summary: 'Várias saídas por símbolo, transições-ε e simulação por conjuntos.',
    sections: [
      {
        id: 'afn-definicao',
        title: 'O que muda em relação ao AFD',
        blocks: [
          { t: 'code', text: 'M = (Q, Σ, δ, q₀, F)    com    δ : Q × (Σ ∪ {ε}) → 𝒫(Q)' },
          { t: 'p', html: 'A diferença está toda em δ: ela devolve um <b>conjunto</b> de estados (possivelmente vazio).' },
          { t: 'table', head: ['', 'AFD', 'AFN'], rows: [
            ['saídas por símbolo', 'exatamente 1', '0, 1 ou várias'],
            ['transição ε', 'proibida', 'permitida'],
            ['seta faltando', 'não pode (ou vai ao morto)', 'normal: aquele caminho morre'],
            ['poder de reconhecimento', 'linguagens regulares', '<b>as mesmas</b> linguagens regulares'],
          ] },
        ],
      },
      {
        id: 'afn-aceitacao',
        title: 'Quando um AFN aceita',
        blocks: [
          { t: 'note', kind: 'def', html: 'O AFN aceita w se <b>existe algum caminho</b> que lê w inteira e termina em estado final. Caminhos que travam ou terminam fora de F simplesmente não contam.' },
          { t: 'p', html: 'Uma boa intuição: o AFN “adivinha” o momento certo. Para “contém 01”, ele fica em A lendo qualquer coisa e, em algum 0, aposta que ali começa o 01.' },
          { t: 'fig', model: F_CONTEM01, caption: 'AFN para “contém 01”. Lendo 0 em A, há duas escolhas: ficar em A ou ir para B.', re: '^[01]*01[01]*$' },
        ],
      },
      {
        id: 'afn-epsilon',
        title: 'Transições-ε e fecho-ε',
        blocks: [
          { t: 'p', html: 'Uma transição <b>ε</b> muda de estado <b>sem consumir símbolo</b>. Na bancada, ela aparece tracejada.' },
          { t: 'note', kind: 'def', title: 'Fecho-ε', html: 'fecho-ε(q) = q mais todos os estados alcançáveis a partir de q usando <b>só</b> transições ε (em qualquer quantidade). Para um conjunto, une-se o fecho de cada elemento.' },
          { t: 'fig', model: F_ABC, caption: 'AFN-ε para a*b*c* (Σ = {a, b, c}): as ε permitem “pular” para a próxima fase.', re: '^a*b*c*$' },
          { t: 'table', head: ['Estado', 'fecho-ε'], rows: [['S0', '{S0, S1, S2}'], ['S1', '{S1, S2}'], ['S2', '{S2}']] },
          { t: 'p', html: 'Como S2 está no fecho de S0 e S2 é final, a palavra vazia é aceita.' },
        ],
      },
      {
        id: 'afn-simulacao',
        title: 'Simulando por conjuntos',
        blocks: [
          { t: 'list', ordered: true, items: [
            'Comece com o conjunto <b>fecho-ε(q₀)</b>.',
            'Para cada símbolo lido: aplique as setas desse símbolo a todos os estados do conjunto (<b>mover</b>) e depois tire o <b>fecho-ε</b> do resultado.',
            'No fim, aceite se o conjunto contém <b>algum</b> estado final.',
          ] },
          { t: 'code', text: '“contém 01”, palavra 001:\n{A} —0→ {A,B} —0→ {A,B} —1→ {A,C}   (C é final → ACEITA)' },
          { t: 'note', kind: 'tip', html: 'Esse acompanhamento por conjuntos é exatamente a ideia da determinização: cada conjunto vira um estado do AFD.' },
        ],
      },
    ],
  },

  {
    id: 'determinizacao',
    title: 'Determinização (AFN → AFD)',
    summary: 'Construção de subconjuntos, com e sem ε.',
    sections: [
      {
        id: 'det-ideia',
        title: 'A ideia',
        blocks: [
          { t: 'p', html: 'Todo AFN tem um AFD equivalente. O truque é fazer cada estado do AFD representar o <b>conjunto de estados</b> em que o AFN pode estar naquele momento. Como os subconjuntos de Q são finitos (no máximo 2<sup>|Q|</sup>), o AFD também é finito.' },
        ],
      },
      {
        id: 'det-algoritmo',
        title: 'O algoritmo dos subconjuntos',
        blocks: [
          { t: 'list', ordered: true, items: [
            'Estado inicial do AFD: <b>fecho-ε({q₀})</b>.',
            'Para cada subconjunto S ainda não processado e cada símbolo a: calcule <b>T = fecho-ε(mover(S, a))</b>. Se T é novo, ele vira um novo estado.',
            'Repita até não surgir subconjunto novo.',
            'São <b>finais</b> os subconjuntos que contêm <b>pelo menos um</b> estado final do AFN.',
            'Se aparecer o conjunto vazio <b>∅</b>, ele é o estado morto.',
          ] },
          { t: 'note', kind: 'tip', html: 'Gere só os subconjuntos <b>alcançáveis</b> a partir do inicial. Montar todos os 2ⁿ é desperdício.' },
        ],
      },
      {
        id: 'det-exemplo',
        title: 'Exemplo completo: “contém 01”',
        blocks: [
          { t: 'p', html: 'Partindo do AFN da seção 4.2:' },
          { t: 'table', head: ['Subconjunto', '0', '1'], rows: [
            ['→ {A}', '{A,B}', '{A}'],
            ['{A,B}', '{A,B}', '{A,C}'],
            ['* {A,C}', '{A,B,C}', '{A,C}'],
            ['* {A,B,C}', '{A,B,C}', '{A,C}'],
          ] },
          { t: 'fig', model: F_DET01, caption: 'AFD resultante. Os finais são os que contêm C. (Ele ainda não é mínimo: veja o capítulo 6.)', re: '^[01]*01[01]*$' },
        ],
      },
      {
        id: 'det-epsilon',
        title: 'Determinizando com transições-ε',
        blocks: [
          { t: 'p', html: 'Mesma receita, mas sempre tirando o fecho-ε. Para o AFN de a*b*c* (seção 4.3):' },
          { t: 'table', head: ['Subconjunto', 'a', 'b', 'c'], rows: [
            ['→ * X = {S0,S1,S2}', 'X', 'Y', 'Z'],
            ['* Y = {S1,S2}', '∅', 'Y', 'Z'],
            ['* Z = {S2}', '∅', '∅', 'Z'],
            ['∅', '∅', '∅', '∅'],
          ] },
          { t: 'fig', model: F_ABC_DET, caption: 'AFD para a*b*c*. X, Y e Z contêm S2, por isso são finais; ∅ é o estado morto.', re: '^a*b*c*$' },
        ],
      },
      {
        id: 'det-cuidados',
        title: 'Cuidados',
        blocks: [
          { t: 'list', items: [
            'Nomeie os estados pelos conjuntos ({A,C} ou “AC”): isso deixa a tabela conferível.',
            'O fecho-ε entra <b>no inicial</b> e <b>depois de cada movimento</b>. Esquecer um dos dois é o erro mais comum.',
            'No pior caso o AFD tem 2ⁿ estados, mas na prática costuma ser bem menor.',
            'O AFD obtido é equivalente, mas <b>não necessariamente mínimo</b>.',
          ] },
          { t: 'note', kind: 'tip', title: 'Na bancada', html: 'No espaço AFN, <b>Determinizar</b> monta essa tabela e o AFD resultante, que você pode abrir no espaço AFD.' },
        ],
      },
    ],
  },

  {
    id: 'minimizacao',
    title: 'Minimização de AFD',
    summary: 'Estados equivalentes e o refinamento de partições.',
    sections: [
      {
        id: 'min-equivalentes',
        title: 'Estados equivalentes',
        blocks: [
          { t: 'note', kind: 'def', html: 'Dois estados p e q são <b>equivalentes</b> se, para <b>toda</b> palavra w, partir de p e partir de q dá o mesmo veredito (ambos aceitam ou ambos rejeitam).' },
          { t: 'p', html: 'Juntar estados equivalentes não muda a linguagem. O AFD sem nenhum par equivalente (e sem estados inalcançáveis) é o <b>AFD mínimo</b>, que é único a menos dos nomes dos estados.' },
        ],
      },
      {
        id: 'min-algoritmo',
        title: 'Refinamento de partições',
        blocks: [
          { t: 'list', ordered: true, items: [
            'Garanta um AFD <b>completo</b> e remova estados <b>inalcançáveis</b>.',
            'Partição inicial: dois grupos, <b>F</b> e <b>Q ∖ F</b>.',
            'Dois estados continuam juntos só se, para <b>cada símbolo</b>, vão para estados do <b>mesmo grupo</b>. Separe quem discordar.',
            'Repita até nenhuma separação acontecer. Cada grupo final vira um estado.',
          ] },
        ],
      },
      {
        id: 'min-exemplo',
        title: 'Exemplo: o AFD de “contém 01”',
        blocks: [
          { t: 'p', html: 'Partindo do AFD da seção 5.3:' },
          { t: 'code', text: 'P₀ = { A, AB } { AC, ABC }\n  A  —1→ A  (grupo 1)     AB  —1→ AC (grupo 2)   ⇒ separa A de AB\n  AC —0→ ABC, —1→ AC     ABC —0→ ABC, —1→ AC  ⇒ continuam juntos\nP₁ = { A } { AB } { AC, ABC }   (estável)' },
          { t: 'fig', model: F_MIN01, caption: 'AFD mínimo de “contém 01”: 3 estados. q2 é o grupo {AC, ABC}.', re: '^[01]*01[01]*$' },
        ],
      },
    ],
  },

  {
    id: 'gramaticas',
    title: 'Gramáticas',
    summary: 'G = (N, T, P, S), derivação, forma sentencial e linguagem gerada.',
    sections: [
      {
        id: 'gram-definicao',
        title: 'O que é uma gramática',
        blocks: [
          { t: 'p', html: 'Enquanto o autômato <b>reconhece</b> palavras, a gramática <b>gera</b>: é um dispositivo formal para especificar uma linguagem (possivelmente infinita) com um número finito de regras. Na prática, é assim que se descreve a sintaxe de linguagens de programação, por exemplo em <b>BNF</b> (Backus–Naur Form): <code>&lt;programa&gt; ::= &lt;decl&gt; ; &lt;bloco&gt;</code>.' },
          { t: 'code', text: 'G = (N, T, P, S)' },
          { t: 'table', head: ['Componente', 'Significado'], rows: [
            ['N', '<b>não terminais</b>: variáveis que ainda serão substituídas (A, B, S…)'],
            ['T', '<b>terminais</b>: símbolos que aparecem na palavra final (a, b, 0, 1…)'],
            ['P', '<b>produções</b>: regras α → β (“onde houver α, posso escrever β”)'],
            ['S ∈ N', '<b>símbolo de partida</b>'],
          ] },
          { t: 'p', html: 'Exemplo do quadro: G = ({A, B, C}, {a, b, c, e}, P, A), com A → aB, B → bC, C → cC | e. Ela gera <b>a b c* e</b>.' },
          { t: 'note', kind: 'warn', html: 'Nesse exemplo, <b>e</b> é a <b>letra e</b> (um terminal). A palavra vazia é <b>ε</b>, que nunca entra no conjunto T.' },
        ],
      },
      {
        id: 'gram-derivacao',
        title: 'Derivação: ⇒, ⇒* e ⇒⁺',
        blocks: [
          { t: 'p', html: 'Derivar é aplicar produções, uma por vez, a partir de S.' },
          { t: 'table', head: ['Símbolo', 'Significa'], rows: [
            ['α ⇒ β', 'β sai de α com <b>exatamente um</b> passo'],
            ['α ⇒* β', 'com <b>zero ou mais</b> passos (vale α ⇒* α)'],
            ['α ⇒⁺ β', 'com <b>um ou mais</b> passos'],
          ] },
          { t: 'p', html: 'Na <b>derivação mais à esquerda</b>, a cada passo substitui-se o não terminal mais à esquerda. Exemplo resolvido em aula, com S → ab | aASb e A → bSb | ε:' },
          { t: 'code', text: 'S ⇒ aASb ⇒ abSbSb ⇒ ababbSb ⇒ ababbabb' },
          { t: 'note', kind: 'tip', html: 'Em questões de verdadeiro ou falso, “X ⇒ w” só é verdadeiro se der em <b>um</b> passo. Conte os passos antes de responder.' },
        ],
      },
      {
        id: 'gram-forma-sentencial',
        title: 'Forma sentencial e sentença',
        blocks: [
          { t: 'note', kind: 'def', title: 'Forma sentencial', html: 'Qualquer cadeia α tal que S ⇒* α. Pode misturar terminais e não terminais: aS, aaS.' },
          { t: 'note', kind: 'def', title: 'Sentença', html: 'Uma forma sentencial formada <b>só por terminais</b>: aab.' },
          { t: 'p', html: 'Toda sentença é forma sentencial; nem toda forma sentencial é sentença. Com S → aS | b: <b>aaS</b> é forma sentencial, <b>aab</b> é sentença.' },
        ],
      },
      {
        id: 'gram-linguagem',
        title: 'Linguagem gerada',
        blocks: [
          { t: 'code', text: 'L(G) = { w ∈ T* | S ⇒* w }' },
          { t: 'p', html: 'É o conjunto de todas as <b>sentenças</b> deriváveis de S. Duas gramáticas são <b>equivalentes</b> quando geram a mesma linguagem.' },
          { t: 'p', html: 'Para mostrar que w ∈ L(G), basta exibir uma derivação. Para mostrar que w ∉ L(G), é preciso argumentar que <b>nenhuma</b> derivação chega em w (por exemplo, observando um invariante, como “toda sentença tem tamanho par”).' },
        ],
      },
      {
        id: 'gram-arvore',
        title: 'Árvore de derivação e ambiguidade',
        blocks: [
          { t: 'p', html: 'A <b>árvore de derivação</b> mostra a estrutura: a raiz é S, cada nó interno é um não terminal com seus filhos dados por uma produção, e as folhas, lidas da esquerda para a direita, formam a sentença.' },
          { t: 'note', kind: 'def', title: 'Ambiguidade', html: 'Uma gramática é <b>ambígua</b> se alguma sentença tem <b>duas árvores</b> diferentes (equivalente: duas derivações mais à esquerda diferentes).' },
          { t: 'p', html: 'Exemplo clássico: E → E + E | E * E | id gera id + id * id de dois jeitos, um agrupando (id + id) * id e outro id + (id * id). Para provar que uma palavra é gerada, basta uma árvore; a ambiguidade só importa quando a estrutura (o significado) interessa.' },
        ],
      },
      {
        id: 'gram-conferir',
        title: 'Conferindo derivações e árvores',
        blocks: [
          { t: 'p', html: 'Derivação e árvore são duas formas de mostrar a mesma coisa. A derivação diz a <b>ordem</b> em que as regras foram aplicadas; a árvore mostra só a <b>estrutura</b> (qual regra expandiu cada não terminal). Várias derivações (em ordens diferentes) podem dar a mesma árvore; a derivação <b>mais à esquerda</b> de uma árvore é única.' },
          { t: 'h', text: 'Checklist da derivação' },
          { t: 'list', ordered: true, items: [
            'Começa no <b>símbolo de partida</b> (4º elemento da tupla).',
            'Em cada ⇒, exatamente <b>um</b> não terminal é trocado pelo lado direito de <b>uma regra dele</b>; o resto da forma fica igual.',
            'Terminais nunca mudam. Se dois não terminais mudaram de uma vez, faltou escrever um passo (isso seria ⇒*).',
            'Termina numa <b>sentença</b> (só terminais) igual à palavra pedida.',
            'Se a questão pede “mais à esquerda”, em todo passo o trocado é o primeiro não terminal da forma.',
          ] },
          { t: 'h', text: 'Checklist da árvore' },
          { t: 'list', ordered: true, items: [
            'A raiz é o símbolo de partida.',
            'Cada nó interno A tem como filhos, da esquerda para a direita, exatamente o lado direito de uma regra A → α.',
            'A regra A → ε aparece como A com um único filho ε.',
            'Terminais e ε são folhas; não terminal em folha = árvore incompleta (a fronteira ainda é forma sentencial).',
            'A <b>fronteira</b> (folhas lidas da esquerda para a direita, sem ε) é a palavra.',
          ] },
          { t: 'code', text: 'Notação com colchetes (a mesma da página de derivações):\n\nR[X[a] R[S[a T[X[b]] a]] X[a]]   →  fronteira: aabaa' },
          { t: 'note', kind: 'tip', html: 'Na página <b>Derivações</b> (link no índice) você escreve a derivação ou monta a árvore clicando nos nós, e cada passo é conferido: a regra usada, onde o passo quebrou, se é mais à esquerda e se a fronteira chega na palavra.' },
        ],
      },
    ],
  },

  {
    id: 'chomsky',
    title: 'Hierarquia de Chomsky',
    summary: 'Os quatro tipos de gramática e onde ficam as regulares.',
    sections: [
      {
        id: 'chomsky-tipos',
        title: 'Os quatro tipos',
        blocks: [
          { t: 'p', html: 'As gramáticas são classificadas pelo <b>formato das produções</b>. Cada classe contém a seguinte (regular ⊂ livre de contexto ⊂ sensível ao contexto ⊂ recursivamente enumerável).' },
          { t: 'table', head: ['Tipo', 'Gramática / linguagem', 'Reconhecedor', 'Produções'], rows: [
            ['3', 'Regular (GR / LR)', 'AFD, AFN', 'A → aB, A → a, A → ε'],
            ['2', 'Livre de contexto (GLC / LLC)', 'autômato com pilha', 'A → α (um não terminal à esquerda)'],
            ['1', 'Sensível ao contexto (GSC / LSC)', 'autômato linearmente limitado', 'α → β com |α| ≤ |β|'],
            ['0', 'Recursivamente enumerável (GRE / LRE)', 'máquina de Turing', 'sem restrição'],
          ] },
        ],
      },
      {
        id: 'chomsky-0n1n',
        title: 'Por que 0ⁿ1ⁿ não é regular',
        blocks: [
          { t: 'p', html: 'A gramática S → 0S1 | 01 gera { 0ⁿ1ⁿ | n ≥ 1 }:' },
          { t: 'code', text: 'S ⇒ 0S1 ⇒ 00S11 ⇒ 000S111 ⇒ 00001111' },
          { t: 'p', html: 'Ela é livre de contexto, mas <b>nenhum AFD</b> reconhece essa linguagem. Intuição: para conferir que há tantos 1s quanto 0s, a máquina teria que <b>contar</b> os 0s sem limite, e um autômato finito só tem memória finita.' },
          { t: 'note', kind: 'def', title: 'Lema do bombeamento (linguagens regulares)', html: 'Se L é regular, existe p ≥ 1 tal que toda w ∈ L com |w| ≥ p pode ser escrita w = xyz com |xy| ≤ p, |y| ≥ 1 e xy<sup>i</sup>z ∈ L para todo i ≥ 0. Para 0<sup>p</sup>1<sup>p</sup>, o trecho y cai só nos 0s; bombeando (i = 2) sobram mais 0s que 1s, a palavra sai de L, e a hipótese “L é regular” cai.' },
        ],
      },
      {
        id: 'chomsky-teste',
        title: 'Teste rápido: a gramática é regular?',
        blocks: [
          { t: 'note', kind: 'tip', html: 'É regular (linear à direita) se, em <b>toda</b> produção, o lado direito tem <b>no máximo um não terminal</b> e ele está <b>no final</b>: aB, a ou ε.' },
          { t: 'table', head: ['Produção', 'Classificação'], rows: [
            ['S → 0S | 1B', 'regular'],
            ['B → 0S | 1B | ε', 'regular'],
            ['S → aTb', 'não regular: não terminal no meio (GLC)'],
            ['T → XTX', 'não regular: três não terminais (GLC)'],
            ['S → 0S1 | 01', 'não regular (GLC)'],
          ] },
        ],
      },
    ],
  },

  {
    id: 'gr-af',
    title: 'Gramáticas regulares e autômatos',
    summary: 'O dicionário GR ↔ AF, nos dois sentidos.',
    sections: [
      {
        id: 'gr-forma',
        title: 'Forma das gramáticas regulares',
        blocks: [
          { t: 'p', html: 'Uma gramática regular (linear à direita) só tem produções dos tipos:' },
          { t: 'code', text: 'A → aB      (um terminal seguido de um não terminal)\nA → a       (um terminal sozinho)\nA → ε       (vazio)' },
          { t: 'note', kind: 'tip', html: 'Existe também a forma linear <b>à esquerda</b> (A → Ba), igualmente regular. O que não pode é <b>misturar</b> as duas na mesma gramática.' },
        ],
      },
      {
        id: 'gr-dicionario',
        title: 'O dicionário',
        blocks: [
          { t: 'p', html: 'Gramática regular e autômato finito são a mesma coisa escrita de dois jeitos:' },
          { t: 'table', head: ['Na gramática', 'No autômato'], rows: [
            ['não terminal', 'estado'],
            ['símbolo de partida S', 'estado inicial'],
            ['A → aB', 'transição A —a→ B'],
            ['A → ε', 'A é estado final'],
            ['A → a', 'transição A —a→ F, com F um estado final novo, sem saídas'],
            ['A → B (unitária)', 'transição <b>ε</b> de A para B: vira AFN-ε'],
          ] },
          { t: 'h', text: 'Anatomia de uma regra' },
          { t: 'p', html: 'Cada alternativa separada por <b>|</b> é <b>uma transição</b>. A leitura é sempre a mesma: quem está à esquerda da seta é a <b>origem</b>, o terminal é o <b>rótulo</b> e o não terminal no fim é o <b>destino</b>.' },
          { t: 'code', text: 'S → 0 S\n│   │ └── destino (para onde vai)\n│   └──── símbolo lido (rótulo da seta)\n└──────── origem (de onde sai)\n\nS → 0S | 1B   ⇒   S —0→ S (laço)   e   S —1→ B' },
          { t: 'note', kind: 'warn', html: 'Quem se move é o <b>estado</b>, não o símbolo: “em S, lendo 0, continua em S”. O terminal é só o rótulo da seta, e terminais <b>nunca</b> viram estados.' },
          { t: 'note', kind: 'tip', html: 'Mesmo terminal duas vezes na mesma regra (S → 0S | 0C) = duas setas com 0 saindo de S = <b>AFN</b>. Determinize antes de montar o AFD.' },
        ],
      },
      {
        id: 'gr-af-para-gr',
        title: 'Do autômato para a gramática',
        blocks: [
          { t: 'list', ordered: true, items: [
            'Cada estado vira um não terminal; o inicial vira o símbolo de partida.',
            'Cada seta p —a→ q vira a produção <b>p → aq</b>.',
            'Cada estado final p ganha <b>p → ε</b>.',
          ] },
          { t: 'fig', model: F_QUADRO_GR, caption: 'Exemplo do quadro (Σ = {a, b, c}).', re: '^a(b)?c*$' },
          { t: 'code', text: 'A → aB | aC\nB → bC\nC → cC | ε        (C é final)' },
        ],
      },
      {
        id: 'gr-gr-para-af',
        title: 'Da gramática para o autômato',
        blocks: [
          { t: 'list', ordered: true, items: [
            'Cada não terminal vira um estado; S é o inicial.',
            'A → aB vira a seta A —a→ B.',
            'A → ε torna A final.',
            'A → a: crie um estado final novo F (se ainda não existir) e a seta A —a→ F.',
          ] },
          { t: 'p', html: 'Exemplo: S → aS | bA, A → aA | b. A regra A → b pede o estado F.' },
          { t: 'fig', model: F_GR_EXEMPLO, caption: 'Gera a*ba*b. Para um AFD completo, faltaria o estado morto (S e A já estão completos; F não tem saídas).', re: '^a*ba*b$' },
        ],
      },
      {
        id: 'gr-finais',
        title: 'De onde vêm os estados finais',
        blocks: [
          { t: 'p', html: 'Um estado é final quando <b>a palavra pode terminar nele</b>. Numa gramática regular isso acontece em dois casos, e esquecer o segundo é o erro mais comum:' },
          { t: 'table', head: ['Regra', 'Efeito no autômato'], rows: [
            ['A → ε', 'A é <b>final</b>'],
            ['A → a', 'seta A —a→ <b>F</b>, com F um estado extra <b>final</b>'],
          ] },
          { t: 'p', html: 'Exemplo: em X → a | b, X não tem ε, mas as duas regras terminam a palavra. Nasce o estado F (final) com X —a→ F e X —b→ F. Procurando só o ε, a gramática ficaria sem nenhum estado final, e o autômato não aceitaria nada.' },
          { t: 'list', items: [
            '<b>S → ε</b> no símbolo de partida: o estado <b>inicial</b> também é final, e ε ∈ L(G).',
            'Depois de <b>determinizar</b>, um estado-conjunto como {A, F} é final se <b>contém pelo menos um</b> final do AFN.',
            'No caminho inverso (AF → GR), todo estado final p ganha a regra <b>p → ε</b>.',
          ] },
          { t: 'note', kind: 'warn', title: 'A → ε não torna o autômato AFN', html: 'O ε numa regra <b>A → ε</b> só marca A como final; não cria seta nenhuma. Quem cria transição ε é a regra unitária <b>A → B</b>.' },
        ],
      },
      {
        id: 'gr-unitarias',
        title: 'Regras unitárias (A → B)',
        blocks: [
          { t: 'p', html: 'Em <b>A → B</b> o não terminal muda <b>sem gerar símbolo nenhum</b>. No autômato isso é uma <b>transição ε</b>: A passa para B “de graça”, sem ler nada. O resultado é um <b>AFN-ε</b>, que a bancada no espaço AFD não aceita.' },
          { t: 'code', text: 'S → 0S | B\n\nS —0→ S     (laço)\nS —ε→ B     (pula para B sem ler nada)' },
          { t: 'h', text: 'Eliminando: copie as regras de B para A' },
          { t: 'code', text: 'Antes:              Depois:\nS → 0S | B          S → 0S | 1B | ε     ← herdou as regras de B\nB → 1B | ε          B → 1B | ε' },
          { t: 'table', head: ['Regra', 'Transição'], rows: [
            ['S → 0S', 'laço em S com 0'],
            ['S → 1B', 'S —1→ B (herdada de B → 1B)'],
            ['S → ε', 'S é <b>final</b> (herdou o ε de B)'],
            ['B → 1B', 'laço em B com 1'],
            ['B → ε', 'B é final'],
            ['B com 0', 'nenhuma regra → estado morto <b>D</b>'],
          ] },
          { t: 'fig', model: F_UNITARIA, caption: 'S → 0S | B, B → 1B | ε já sem a regra unitária: gera 0*1* (zeros e depois uns). D é o estado morto que completa o AFD.', re: '^0*1*$' },
          { t: 'p', html: 'Pelo caminho do autômato dá o mesmo: fecho-ε(S) = {S, B}, e como B é final, o conjunto {S, B} é final. Com regra unitária simples, eliminar direto na gramática é mais rápido.' },
          { t: 'note', kind: 'tip', html: 'A bancada <b>rejeita quando trava</b>, então o AFD sem o estado D dá os mesmos resultados. Mas sem D a função δ não é total, e pela definição formal <b>não é AFD</b>. Na prova, desenhe o morto.' },
        ],
      },
      {
        id: 'gr-cuidados',
        title: 'Cuidados na conversão',
        blocks: [
          { t: 'list', items: [
            '<b>Pode sair um AFN.</b> Se um não terminal tem duas regras com o mesmo terminal (R → aS | aR), o estado R lendo a vai para dois lugares. Se o enunciado pede AFD, determinize (capítulo 5).',
            '<b>DTE</b> = Diagrama de Transição de Estados: é o desenho do autômato.',
            '<b>AFD completo</b>: acrescente o estado morto para as setas que faltarem.',
            'Para <b>construir</b> uma gramática do zero (“não tem 1s consecutivos”), costuma ser mais fácil desenhar o <b>AFD</b> primeiro e depois traduzir com o dicionário.',
          ] },
        ],
      },
    ],
  },

  {
    id: 'er',
    title: 'Expressões regulares',
    summary: 'Sintaxe, precedência, leitura e o teorema de Kleene.',
    sections: [
      {
        id: 'er-definicao',
        title: 'Definição',
        blocks: [
          { t: 'p', html: 'Uma expressão regular (ER) descreve uma linguagem combinando casos base com três operações.' },
          { t: 'table', head: ['ER', 'Linguagem', 'Exemplo'], rows: [
            ['∅', 'nenhuma palavra', '—'],
            ['ε', '{ε}', '—'],
            ['a (símbolo)', '{a}', '0 → {0}'],
            ['r | s  (ou r + s)', '<b>união</b>: L(r) ∪ L(s)', 'a | b → {a, b}'],
            ['rs', '<b>concatenação</b>', 'ab → {ab}'],
            ['r*', '<b>fecho de Kleene</b>: zero ou mais repetições', 'a* → {ε, a, aa, …}'],
            ['r⁺', 'uma ou mais (= r r*)', 'a⁺ → {a, aa, …}'],
          ] },
        ],
      },
      {
        id: 'er-precedencia',
        title: 'Precedência',
        blocks: [
          { t: 'note', kind: 'def', html: 'Do mais forte para o mais fraco: <b>*</b> (e ⁺), depois <b>concatenação</b>, depois <b>|</b>. É como potência, multiplicação e soma na aritmética.' },
          { t: 'table', head: ['Escrito', 'Lido como'], rows: [
            ['ab*', 'a(b*): um a seguido de qualquer número de b'],
            ['(ab)*', 'repetições de “ab”'],
            ['a | bc', 'a | (bc)'],
            ['(a | b)c', 'ac ou bc'],
          ] },
        ],
      },
      {
        id: 'er-leitura',
        title: 'Lendo e escrevendo ERs',
        blocks: [
          { t: 'table', head: ['ER', 'Em português'], rows: [
            ['1*0(0|1)*', 'contém pelo menos um 0'],
            ['(0|1)*1(0|1)', 'o penúltimo símbolo é 1'],
            ['(0|1)*00(0|1)*', 'contém 00'],
            ['(1|01)*(ε|0)', 'não contém 00'],
            ['0*1*', 'zeros e depois uns (não contém 10)'],
            ['(a|b)*abb', 'termina com abb'],
            ['((0|1)(0|1))*', 'comprimento par'],
          ] },
          { t: 'note', kind: 'tip', html: 'Para escrever uma ER, pense na <b>estrutura</b> da palavra: o que vem antes do padrão (geralmente (0|1)*), o padrão, e o que vem depois. Depois confira com a bateria de fronteira.' },
        ],
      },
      {
        id: 'er-identidades',
        title: 'Identidades úteis',
        blocks: [
          { t: 'table', head: ['Identidade', 'Comentário'], rows: [
            ['r | ∅ = r', '∅ é o neutro da união'],
            ['rε = εr = r', 'ε é o neutro da concatenação'],
            ['r∅ = ∅r = ∅', '∅ anula a concatenação'],
            ['r | r = r', 'união é idempotente'],
            ['ε* = ε  e  ∅* = ε', 'o fecho sempre contém ε'],
            ['(r*)* = r*  e  r*r* = r*', 'fechar de novo não muda nada'],
            ['r r* = r* r = r⁺', 'definição de ⁺'],
            ['(r | s)* = (r* s*)*', 'útil para simplificar'],
          ] },
        ],
      },
      {
        id: 'er-kleene',
        title: 'Teorema de Kleene',
        blocks: [
          { t: 'note', kind: 'def', html: 'Uma linguagem é <b>regular</b> se, e somente se, é reconhecida por um autômato finito, se e somente se é gerada por uma gramática regular, se e somente se é descrita por uma expressão regular.' },
          { t: 'p', html: 'São três roupas para a mesma classe de linguagens. Os capítulos seguintes mostram como trocar de roupa: ER → AF (capítulo 11) e AF → ER (capítulo 12). GR ↔ AF ficou no capítulo 9.' },
        ],
      },
    ],
  },

  {
    id: 'thompson',
    title: 'ER → AF: construção de Thompson',
    summary: 'Montando o AFN-ε peça por peça.',
    sections: [
      {
        id: 'th-base',
        title: 'Peças base',
        blocks: [
          { t: 'p', html: 'A construção segue a própria estrutura da ER: cada pedaço vira um pequeno AFN, e os pedaços são colados com transições ε.' },
          { t: 'fig', model: F_TH_A, caption: 'Símbolo a: dois estados e uma seta. (ε é um estado inicial que já é final; ∅ é um inicial sem saídas e sem finais.)', re: '^a$' },
        ],
      },
      {
        id: 'th-concatenacao',
        title: 'Concatenação rs',
        blocks: [
          { t: 'p', html: 'O final do autômato de r liga, por ε, ao inicial do autômato de s. O final de r deixa de ser final.' },
          { t: 'fig', model: F_TH_AB, caption: 'ab.', re: '^ab$' },
        ],
      },
      {
        id: 'th-uniao',
        title: 'União r | s',
        blocks: [
          { t: 'p', html: 'Um estado inicial novo, com ε para o inicial de r e ε para o inicial de s.' },
          { t: 'fig', model: F_TH_UNIAO, caption: 'a | b, no estilo do quadro (os finais de cada ramo continuam finais).', re: '^(a|b)$' },
          { t: 'note', kind: 'tip', html: 'Na versão “de livro” da construção de Thompson, cria-se também <b>um único final novo</b>, alcançado por ε a partir dos finais de r e de s. As duas versões reconhecem a mesma linguagem.' },
        ],
      },
      {
        id: 'th-fecho',
        title: 'Fecho r*',
        blocks: [
          { t: 'p', html: 'Um inicial novo que <b>já é final</b> (aceita zero repetições), com ε para o inicial de r; e, do final de r, uma ε de volta ao inicial de r (repete).' },
          { t: 'fig', model: F_TH_FECHO, caption: 'a*.', re: '^a*$' },
        ],
      },
      {
        id: 'th-exemplo',
        title: 'Exemplo completo: (ab) | a*',
        blocks: [
          { t: 'p', html: 'Monte de dentro para fora: primeiro ab e a*, depois a união.' },
          { t: 'fig', model: F_TH_COMPLETO, caption: 'Ramo de cima: ab. Ramo de baixo: a*. O estado 0 é o inicial da união.', re: '^(ab|a*)$' },
          { t: 'note', kind: 'tip', html: 'No quadro, a professora simplificou ε desnecessárias (por exemplo, ligou a e b direto). Simplificar é válido desde que a linguagem não mude; na dúvida, faça a versão sistemática.' },
        ],
      },
      {
        id: 'th-depois',
        title: 'E depois?',
        blocks: [
          { t: 'p', html: 'O resultado é um <b>AFN-ε</b>. Se o enunciado pedir AFD, determinize (capítulo 5); se pedir o menor AFD, minimize em seguida (capítulo 6).' },
          { t: 'note', kind: 'tip', title: 'Na bancada', html: 'Monte o AFN-ε no espaço AFN (a transição ε aparece no seletor de símbolos), use <b>Determinizar</b> e confira com <b>Comparar</b>.' },
        ],
      },
    ],
  },

  {
    id: 'af-er',
    title: 'AF → ER',
    summary: 'Eliminação de estados (método 2) e o método de Kleene (método 1).',
    sections: [
      {
        id: 'elim-ideia',
        title: 'Eliminação de estados: a ideia',
        blocks: [
          { t: 'p', html: 'Permita que as setas tenham <b>expressões regulares</b> como rótulo, não só símbolos. Aí remova os estados intermediários um a um, sempre ajustando os rótulos para não perder nenhum caminho. No fim sobram só o inicial e o final, e o rótulo entre eles é a ER.' },
        ],
      },
      {
        id: 'elim-formula',
        title: 'A regra de eliminação',
        blocks: [
          { t: 'p', html: 'Para eliminar o estado q, para cada par p (que chega em q) e r (que sai de q):' },
          { t: 'code', text: 'novo(p → r) = antigo(p → r)  |  (p → q) (laço de q)* (q → r)' },
          { t: 'list', ordered: true, items: [
            'Se o inicial recebe setas, crie um inicial novo com ε para ele.',
            'Se há vários finais, faça a eliminação <b>uma vez para cada final</b> e una os resultados com |. Alternativa: crie um final único novo, com ε a partir dos antigos.',
            'Elimine os intermediários, um por vez, aplicando a regra.',
            'Com só inicial (I) e final (F), a ER é (laço de I)* (I → F) (laço de F)*; se também houver seta F → I, use (laço_I | (I→F)(laço_F)*(F→I))* (I→F)(laço_F)*.',
          ] },
        ],
      },
      {
        id: 'elim-exemplo-1',
        title: 'Exemplo simples',
        blocks: [
          { t: 'fig', model: F_AFER1, caption: 'Laço 1 no inicial, seta 0 para o final, laço 0,1 no final.', re: '^1*0[01]*$' },
          { t: 'p', html: 'Não há intermediário a eliminar, e não há seta de volta. Pela fórmula do passo 4: (1)* · 0 · (0|1)* = <b>1*0(0|1)*</b>, ou seja, “contém pelo menos um 0”.' },
        ],
      },
      {
        id: 'elim-exemplo-2',
        title: 'Exemplo com dois finais (método 2 do quadro)',
        blocks: [
          { t: 'fig', model: F_METODO2, caption: 'C e D são finais.', re: '^[01]*1[01]{1,2}$' },
          { t: 'list', items: [
            '<b>Para o final C</b>: D não leva de volta a lugar nenhum, então é ignorado. Eliminando B, a seta A → C fica 1(0|1). Resultado: (0|1)*1(0|1).',
            '<b>Para o final D</b>: eliminando B e C, a seta A → D fica 1(0|1)(0|1). Resultado: (0|1)*1(0|1)(0|1).',
          ] },
          { t: 'code', text: 'ER = (0|1)*1(0|1)  |  (0|1)*1(0|1)(0|1)\n   = (0|1)*1(0|1)(ε|0|1)        (forma simplificada)' },
          { t: 'p', html: 'Em português: o 2º ou o 3º símbolo, contando do fim, é 1.' },
        ],
      },
      {
        id: 'kleene-rijk',
        title: 'Método 1: as expressões Rᵢⱼᵏ',
        blocks: [
          { t: 'p', html: 'Numere os estados 1…n. R<sub>ij</sub><sup>k</sup> é a ER dos caminhos de i até j que só passam por estados intermediários numerados até k.' },
          { t: 'code', text: 'Base:     R⁰ᵢⱼ = símbolos a com δ(i, a) = j   (+ ε se i = j;  ∅ se não houver nenhum)\nIndução:  Rᵏᵢⱼ = Rᵏ⁻¹ᵢⱼ  |  Rᵏ⁻¹ᵢₖ (Rᵏ⁻¹ₖₖ)* Rᵏ⁻¹ₖⱼ\nResposta: a união de Rⁿ₁f para cada estado final f' },
          { t: 'p', html: 'Para o AF da seção 12.3 (estados 1 e 2), a base do quadro fica:' },
          { t: 'table', head: ['Expressão', 'Valor'], rows: [['R⁰₁₁', 'ε + 1'], ['R⁰₁₂', '0'], ['R⁰₂₁', '∅'], ['R⁰₂₂', 'ε + 0 + 1']] },
          { t: 'note', kind: 'tip', html: 'O método 1 constrói cerca de <b>n³</b> expressões para n estados. É ótimo para provar o teorema de Kleene, mas na mão a eliminação de estados é bem mais rápida.' },
        ],
      },
    ],
  },

  {
    id: 'mapa',
    title: 'Mapa e roteiro de prova',
    summary: 'Todas as conversões numa página e um checklist.',
    sections: [
      {
        id: 'mapa-conversoes',
        title: 'Mapa das conversões',
        blocks: [
          { t: 'table', head: ['De', 'Para', 'Método', 'Capítulo'], rows: [
            ['AFN / AFN-ε', 'AFD', 'construção de subconjuntos (com fecho-ε)', '5'],
            ['AFD', 'AFD mínimo', 'refinamento de partições', '6'],
            ['AF', 'Gramática regular', 'seta p —a→ q vira p → aq; final vira p → ε', '9'],
            ['Gramática regular', 'AF', 'o inverso; A → a usa um final novo F', '9'],
            ['ER', 'AFN-ε', 'Thompson (peças + ε)', '11'],
            ['AF', 'ER', 'eliminação de estados, ou Rᵢⱼᵏ', '12'],
            ['AFD', 'complemento', 'trocar finais (AFD completo)', '2'],
          ] },
        ],
      },
      {
        id: 'mapa-checklist',
        title: 'Checklist antes de entregar',
        blocks: [
          { t: 'list', items: [
            'Qual é o Σ? (alfabeto padrão ou outro, como {a, b, c})',
            'A palavra vazia deve ser aceita? Então o inicial é final.',
            'Se é AFD: cada estado tem exatamente uma saída por símbolo? Falta o estado morto?',
            'Testei a bateria de fronteira (ε, tamanho 1, padrão no início, meio e fim)?',
            'Numa gramática regular: todo lado direito é aB, a ou ε?',
            'Numa ER: a precedência está certa? Coloquei os parênteses necessários?',
            'Conferi na bancada com <b>Comparar</b> contra o gabarito, quando houver?',
          ] },
        ],
      },
    ],
  },
];
