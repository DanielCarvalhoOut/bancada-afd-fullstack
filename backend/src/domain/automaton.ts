/**
 * Motor de autômatos finitos — lógica pura, sem dependências de framework.
 * Cobre AFD (determinístico) e AFN (não determinístico, com transições-ε) e a
 * conversão AFN → AFD por construção de subconjuntos. É o MESMO algoritmo do
 * front (portado em TS), então o backend é a fonte de verdade e o front pode
 * validar/determinizar localmente quando a API está fora do ar.
 */

/** Alfabeto usado quando o modelo não declara o seu (retrocompatível). */
export const DEFAULT_ALPHABET = ['0', '1'];
export const EPS = 'ε'; // símbolo da transição vazia (só no AFN)

export type AutomatonKind = 'afd' | 'afn';

export interface AutomatonState {
  id: string;
  name: string;
  initial: boolean;
  accepting: boolean;
  x: number;
  y: number;
}

export interface AutomatonTransition {
  from: string;
  to: string;
  /** Um ou mais símbolos. No AFN, pode incluir EPS. */
  symbols: string[];
}

export interface AutomatonModel {
  /** 'afd' quando ausente (retrocompatível). */
  kind?: AutomatonKind;
  /** Σ: símbolos de um caractere, sem ε. Ausente = DEFAULT_ALPHABET. */
  alphabet?: string[];
  states: AutomatonState[];
  transitions: AutomatonTransition[];
}

export function getState(model: AutomatonModel, id: string): AutomatonState | null {
  return model.states.find((s) => s.id === id) ?? null;
}

export function initialState(model: AutomatonModel): AutomatonState | null {
  return model.states.find((s) => s.initial) ?? null;
}

/** Símbolos "reais" do alfabeto do modelo (sem ε). */
export function realSymbols(model: AutomatonModel): string[] {
  return model.alphabet?.length ? [...model.alphabet] : [...DEFAULT_ALPHABET];
}

/**
 * Lê um alfabeto digitado ("a, b, c" ou "abc") e valida: 1 a 10 símbolos de um
 * caractere, sem repetição e sem ε. Um caractere por símbolo porque a palavra
 * é lida caractere a caractere na simulação.
 */
export function parseAlphabet(text: string): string[] | { error: string } {
  const raw = text.includes(',') ? text.split(',') : [...text].filter((c) => !/\s/u.test(c));
  const syms = raw.map((s) => s.trim());
  // vírgula sobrando no fim ("a, b,") é tolerada; entrada vazia no meio é erro
  if (syms.length > 1 && syms[syms.length - 1] === '') syms.pop();
  if (syms.length && syms.some((s) => s === '')) return { error: 'Há um símbolo vazio entre vírgulas.' };
  return validateAlphabet(syms.filter((s) => s.length));
}

/** Valida uma lista de símbolos já separada (ex.: vinda de JSON importado). */
export function validateAlphabet(input: unknown[]): string[] | { error: string } {
  if (input.some((s) => typeof s !== 'string')) return { error: 'Os símbolos de Σ devem ser textos.' };
  const syms = input as string[];
  if (!syms.length) return { error: 'O alfabeto precisa de pelo menos um símbolo.' };
  if (syms.length > 10) return { error: 'Use no máximo 10 símbolos.' };
  for (const s of syms) {
    if ([...s].length !== 1) return { error: `"${s}" tem mais de um caractere; cada símbolo é um caractere.` };
    if (s === EPS) return { error: 'ε é a palavra vazia, não pode ser símbolo do alfabeto.' };
    // vírgula separa símbolos e espaços são aparados ao digitar: aceitá-los
    // aqui faria o Σ mudar sozinho ao ser editado de novo na tela
    if (s === ',' || /\s/u.test(s)) return { error: 'Vírgula e espaço não podem ser símbolos do alfabeto.' };
  }
  if (new Set(syms).size !== syms.length) return { error: 'Há símbolos repetidos.' };
  return syms;
}

/** Primeiro caractere da palavra fora do alfabeto, ou null se todos pertencem. */
function foreignSymbol(model: AutomatonModel, word: string): string | null {
  const sigma = realSymbols(model);
  for (const c of word) if (!sigma.includes(c)) return c;
  return null;
}

function invalidWord(model: AutomatonModel, c: string): { error: string } {
  return { error: `Símbolo inválido: "${c}". Σ = {${realSymbols(model).join(', ')}}.` };
}

// ───────────────────────── AFD ─────────────────────────

/** Roda o AFD numa palavra. AFD parcial rejeita ao travar. `null` = sem estado inicial. */
export function accepts(model: AutomatonModel, word: string): boolean | null {
  let cur = initialState(model);
  if (!cur) return null;
  for (const sym of word) {
    let next: AutomatonState | null = null;
    for (const t of model.transitions) {
      if (t.from === cur.id && t.symbols.includes(sym)) {
        next = getState(model, t.to);
        break;
      }
    }
    if (!next) return false;
    cur = next;
  }
  return !!cur.accepting;
}

export interface Trace {
  path: string[];
  broke: boolean;
  brokeSym?: string;
  accepted?: boolean;
  finalState?: string;
}

/** Traço estado a estado de um AFD, para depuração/simulação. */
export function trace(model: AutomatonModel, word: string): Trace | { error: string } {
  const init = initialState(model);
  if (!init) return { error: 'Autômato sem estado inicial.' };
  const bad = foreignSymbol(model, word);
  if (bad != null) return invalidWord(model, bad);
  let cur = init;
  const path = [init.name];
  for (const sym of word) {
    let next: AutomatonState | null = null;
    for (const t of model.transitions) {
      if (t.from === cur.id && t.symbols.includes(sym)) {
        next = getState(model, t.to);
        break;
      }
    }
    if (!next) return { path, broke: true, brokeSym: sym, finalState: cur.name };
    cur = next;
    path.push(cur.name);
  }
  return { path, broke: false, accepted: !!cur.accepting, finalState: cur.name };
}

export interface DeterminismIssue {
  kind: 'no-initial' | 'multi-initial' | 'missing' | 'duplicate' | 'no-accepting' | 'epsilon' | 'foreign';
  /**
   * `error` impede o modelo de ser AFD; `note` é só informativo.
   * A função de transição é parcial (Menezes): saída faltando não invalida o AFD,
   * a palavra é rejeitada ao ler um símbolo sem transição definida.
   */
  severity: 'error' | 'note';
  message: string;
}

/** Aponta o que impede o modelo de ser um AFD (`error`) e o que vale saber sobre ele (`note`). */
export function determinismIssues(model: AutomatonModel): DeterminismIssue[] {
  const issues: DeterminismIssue[] = [];
  if (model.states.length === 0) return issues;
  const inits = model.states.filter((s) => s.initial);
  if (inits.length === 0)
    issues.push({ kind: 'no-initial', severity: 'error', message: 'Nenhum estado inicial definido.' });
  else if (inits.length > 1)
    issues.push({ kind: 'multi-initial', severity: 'error', message: `Há ${inits.length} estados iniciais; um AFD tem exatamente um.` });

  if (model.transitions.some((t) => t.symbols.includes(EPS)))
    issues.push({ kind: 'epsilon', severity: 'error', message: 'Há transições-ε; um AFD não pode ter transição vazia.' });

  const sigma = realSymbols(model);
  const foreign = new Set(
    model.transitions.flatMap((t) => t.symbols).filter((s) => s !== EPS && !sigma.includes(s)),
  );
  for (const sym of foreign)
    issues.push({ kind: 'foreign', severity: 'error', message: `O símbolo "${sym}" é usado em transições mas não está em Σ.` });

  for (const s of model.states) {
    const missing: string[] = [];
    for (const sym of sigma) {
      const count = model.transitions.filter(
        (t) => t.from === s.id && t.symbols.includes(sym),
      ).length;
      if (count === 0) missing.push(sym);
      else if (count > 1)
        issues.push({ kind: 'duplicate', severity: 'error', message: `"${s.name}" tem ${count} saídas para ${sym} (não-determinístico).` });
    }
    // uma nota por estado, não por símbolo, para o painel não inflar com Σ grande
    if (missing.length)
      issues.push({ kind: 'missing', severity: 'note', message: `"${s.name}" não tem saída para ${missing.join(', ')}: ler esse símbolo ali rejeita a palavra.` });
  }
  if (!model.states.some((s) => s.accepting))
    issues.push({ kind: 'no-accepting', severity: 'note', message: 'Nenhum estado de aceitação: o autômato reconhece a linguagem vazia (∅).' });
  return issues;
}

export function stateCount(model: AutomatonModel): number {
  return model.states.length;
}

// ───────────────────────── AFN ─────────────────────────

/** Fecho-ε: todos os estados alcançáveis a partir de `ids` só por transições-ε. */
export function epsClosure(model: AutomatonModel, ids: string[]): string[] {
  const seen = new Set<string>(ids);
  const stack = [...ids];
  while (stack.length) {
    const cur = stack.pop()!;
    for (const t of model.transitions) {
      if (t.from === cur && t.symbols.includes(EPS) && !seen.has(t.to)) {
        seen.add(t.to);
        stack.push(t.to);
      }
    }
  }
  return [...seen];
}

/** Estados alcançados a partir do conjunto `ids` lendo um símbolo (sem fecho-ε). */
export function moveSet(model: AutomatonModel, ids: string[], sym: string): string[] {
  const out = new Set<string>();
  for (const t of model.transitions) {
    if (ids.includes(t.from) && t.symbols.includes(sym)) out.add(t.to);
  }
  return [...out];
}

/**
 * Chave de um conjunto de estados para deduplicação. Usa JSON em vez de juntar
 * com separador porque ids são texto livre: com join('|'), {"a|b"} e {"a","b"}
 * teriam a mesma chave.
 */
export function setKey(ids: string[]): string {
  return JSON.stringify(ids.slice().sort());
}

/** Nome legível de um conjunto de estados: "A,B" (ou "∅"). */
export function nameSet(model: AutomatonModel, ids: string[]): string {
  if (!ids.length) return '∅';
  return ids
    .map((i) => getState(model, i)?.name ?? '?')
    .sort()
    .join(',');
}

export interface NfaStep {
  sym: string;
  set: string[]; // ids do conjunto após o símbolo (com fecho-ε)
  label: string; // nome legível do conjunto
}

export interface NfaRun {
  start: { set: string[]; label: string };
  steps: NfaStep[];
  accepted: boolean;
  finalSet: string[];
}

/** Simula o AFN sobre uma palavra, acompanhando o CONJUNTO de estados por símbolo. */
export function simulateNfa(model: AutomatonModel, word: string): NfaRun | { error: string } {
  const init = initialState(model);
  if (!init) return { error: 'Autômato sem estado inicial.' };
  const bad = foreignSymbol(model, word);
  if (bad != null) return invalidWord(model, bad);
  let set = epsClosure(model, [init.id]);
  const steps: NfaStep[] = [];
  for (const sym of word) {
    set = epsClosure(model, moveSet(model, set, sym));
    steps.push({ sym, set, label: nameSet(model, set) });
  }
  const accepted = set.some((id) => getState(model, id)?.accepting);
  return {
    start: { set: epsClosure(model, [init.id]), label: nameSet(model, epsClosure(model, [init.id])) },
    steps,
    accepted,
    finalSet: set,
  };
}

// ───────────────── Determinização (AFN → AFD) ─────────────────

export interface Subset {
  index: number;
  ids: string[];
  name: string; // nome do estado do AFD resultante (nomes concatenados)
  accepting: boolean;
}

export interface DetRow {
  from: number;
  on: Record<string, number>; // símbolo → índice do subconjunto destino
}

export interface Determinization {
  subsets: Subset[];
  rows: DetRow[];
  syms: string[];
  afd: AutomatonModel;
}

/**
 * Construção de subconjuntos: converte um AFN (com ε) num AFD equivalente.
 * Retorna a tabela (subconjuntos × símbolos) e o AFD já posicionado em grade.
 */
export function determinize(model: AutomatonModel): Determinization | { error: string } {
  const init = initialState(model);
  if (!init) return { error: 'Defina um estado inicial no AFN antes de determinizar.' };
  const syms = realSymbols(model);
  const subsets: Subset[] = [];
  const byKey = new Map<string, number>();
  const queue: number[] = [];

  const ensure = (ids: string[]): number => {
    const k = setKey(ids);
    const found = byKey.get(k);
    if (found != null) return found;
    const index = subsets.length;
    const accepting = ids.some((id) => getState(model, id)?.accepting);
    subsets.push({
      index,
      ids: ids.slice(),
      name: nameSet(model, ids).split(',').join(''),
      accepting: !!accepting,
    });
    byKey.set(k, index);
    queue.push(index);
    return index;
  };

  const startIds = epsClosure(model, [init.id]).sort();
  ensure(startIds);

  const rows: DetRow[] = [];
  while (queue.length) {
    const idx = queue.shift()!;
    const sub = subsets[idx];
    const on: Record<string, number> = {};
    for (const sym of syms) {
      const mv = epsClosure(model, moveSet(model, sub.ids, sym)).sort();
      on[sym] = ensure(mv);
    }
    rows.push({ from: idx, on });
  }
  rows.sort((a, b) => a.from - b.from);

  // AFD resultante, posicionado numa grade legível
  const afd: AutomatonModel = { kind: 'afd', alphabet: syms, states: [], transitions: [] };
  const cols = Math.min(6, Math.max(1, Math.ceil(Math.sqrt(subsets.length))));
  subsets.forEach((sub, i) => {
    const col = i % cols;
    const rowN = Math.floor(i / cols);
    afd.states.push({
      id: 'd' + i,
      name: sub.name,
      initial: i === 0,
      accepting: sub.accepting,
      x: 180 + col * 230,
      y: 160 + rowN * 200,
    });
  });
  for (const r of rows) {
    for (const sym of syms) {
      const to = r.on[sym];
      let e = afd.transitions.find((t) => t.from === 'd' + r.from && t.to === 'd' + to);
      if (!e) {
        e = { from: 'd' + r.from, to: 'd' + to, symbols: [] };
        afd.transitions.push(e);
      }
      if (!e.symbols.includes(sym)) e.symbols.push(sym);
      e.symbols.sort();
    }
  }
  return { subsets, rows, syms, afd };
}

// ───────────────── Equivalência (L(A) = L(B)?) ─────────────────

export type Equivalence =
  | { equivalent: true; alphabet: string[] }
  | {
      equivalent: false;
      alphabet: string[];
      /** Menor palavra (ordem por tamanho) em que os dois discordam. */
      witness: string;
      /** Qual dos dois aceita a testemunha. */
      acceptedBy: 'a' | 'b';
    };

/**
 * Decide se A e B aceitam a mesma linguagem, sem exigir que sejam AFDs.
 * Percorre em largura o autômato produto dos dois "determinizados sob demanda"
 * (cada lado é um conjunto de estados, com fecho-ε), sobre Σ(A) ∪ Σ(B). Um
 * símbolo fora do Σ de um lado leva esse lado ao conjunto vazio (rejeição).
 * A primeira dupla em que só um lado aceita dá o contraexemplo mais curto.
 */
export function equivalence(a: AutomatonModel, b: AutomatonModel): Equivalence | { error: string } {
  const initA = initialState(a);
  const initB = initialState(b);
  if (!initA) return { error: 'O seu autômato não tem estado inicial.' };
  if (!initB) return { error: 'O autômato de referência não tem estado inicial.' };

  const sigmaA = realSymbols(a);
  const sigmaB = realSymbols(b);
  const alphabet = [...new Set([...sigmaA, ...sigmaB])].sort();
  // A linguagem de cada autômato é sobre o SEU Σ: símbolo fora dele leva ao
  // conjunto vazio, mesmo que haja transição com ele (ex.: JSON importado).
  // Mesma regra de trace/simulateNfa/determinize, que só leem símbolos de Σ.
  const step = (m: AutomatonModel, sigma: string[], set: string[], sym: string) =>
    sigma.includes(sym) ? epsClosure(m, moveSet(m, set, sym)) : [];
  const pairKey = (sa: string[], sb: string[]) => setKey(sa) + setKey(sb); // JSON delimita cada lado
  const acc = (m: AutomatonModel, ids: string[]) => ids.some((id) => getState(m, id)?.accepting);

  type Node = { sa: string[]; sb: string[]; word: string };
  const start: Node = { sa: epsClosure(a, [initA.id]), sb: epsClosure(b, [initB.id]), word: '' };
  const seen = new Set([pairKey(start.sa, start.sb)]);
  const queue: Node[] = [start];

  while (queue.length) {
    const { sa, sb, word } = queue.shift()!;
    const inA = acc(a, sa);
    if (inA !== acc(b, sb)) return { equivalent: false, alphabet, witness: word, acceptedBy: inA ? 'a' : 'b' };
    for (const sym of alphabet) {
      const na = step(a, sigmaA, sa, sym);
      const nb = step(b, sigmaB, sb, sym);
      const k = pairKey(na, nb);
      if (seen.has(k)) continue;
      seen.add(k);
      queue.push({ sa: na, sb: nb, word: word + sym });
    }
  }
  return { equivalent: true, alphabet };
}
