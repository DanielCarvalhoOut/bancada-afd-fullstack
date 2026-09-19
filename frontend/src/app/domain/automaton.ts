/**
 * Motor de autômatos finitos — lógica pura, sem dependências de framework.
 * Cobre AFD (determinístico) e AFN (não determinístico, com transições-ε) e a
 * conversão AFN → AFD por construção de subconjuntos. É o MESMO algoritmo do
 * front (portado em TS), então o backend é a fonte de verdade e o front pode
 * validar/determinizar localmente quando a API está fora do ar.
 */

export const ALPHABET = ['0', '1'] as const;
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
  states: AutomatonState[];
  transitions: AutomatonTransition[];
}

export function getState(model: AutomatonModel, id: string): AutomatonState | null {
  return model.states.find((s) => s.id === id) ?? null;
}

export function initialState(model: AutomatonModel): AutomatonState | null {
  return model.states.find((s) => s.initial) ?? null;
}

/** Símbolos "reais" do alfabeto (sem ε), sempre {0,1} neste domínio. */
export function realSymbols(): string[] {
  return [...ALPHABET];
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
  for (const c of word) {
    if (!ALPHABET.includes(c as (typeof ALPHABET)[number])) {
      return { error: `Símbolo inválido: "${c}". Use apenas 0 e 1.` };
    }
  }
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
  kind: 'no-initial' | 'multi-initial' | 'missing' | 'duplicate' | 'no-accepting' | 'epsilon';
  message: string;
}

/** Aponta o que impede o modelo de ser um AFD (saída faltando/duplicada, ε, inicial, aceitação). */
export function determinismIssues(model: AutomatonModel): DeterminismIssue[] {
  const issues: DeterminismIssue[] = [];
  if (model.states.length === 0) return issues;
  const inits = model.states.filter((s) => s.initial);
  if (inits.length === 0)
    issues.push({ kind: 'no-initial', message: 'Nenhum estado inicial definido.' });
  else if (inits.length > 1)
    issues.push({ kind: 'multi-initial', message: `Há ${inits.length} estados iniciais; um AFD tem exatamente um.` });

  if (model.transitions.some((t) => t.symbols.includes(EPS)))
    issues.push({ kind: 'epsilon', message: 'Há transições-ε; um AFD não pode ter transição vazia.' });

  for (const s of model.states) {
    for (const sym of ALPHABET) {
      const count = model.transitions.filter(
        (t) => t.from === s.id && t.symbols.includes(sym),
      ).length;
      if (count === 0)
        issues.push({ kind: 'missing', message: `"${s.name}" não tem saída para ${sym}.` });
      else if (count > 1)
        issues.push({ kind: 'duplicate', message: `"${s.name}" tem ${count} saídas para ${sym} (não-determinístico).` });
    }
  }
  if (!model.states.some((s) => s.accepting))
    issues.push({ kind: 'no-accepting', message: 'Nenhum estado de aceitação — o autômato rejeita tudo.' });
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
  for (const c of word) {
    if (!ALPHABET.includes(c as (typeof ALPHABET)[number])) {
      return { error: `Símbolo inválido: "${c}". Use apenas 0 e 1.` };
    }
  }
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
  const syms = realSymbols();
  const key = (ids: string[]) => ids.slice().sort().join('|');

  const subsets: Subset[] = [];
  const byKey = new Map<string, number>();
  const queue: number[] = [];

  const ensure = (ids: string[]): number => {
    const k = key(ids);
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
  const afd: AutomatonModel = { kind: 'afd', states: [], transitions: [] };
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
