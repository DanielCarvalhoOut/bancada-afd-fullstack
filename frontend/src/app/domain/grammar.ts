/**
 * Motor de gramáticas — lógica pura, sem Angular.
 *
 * Tudo aqui recebe texto digitado pelo usuário (entrada não confiável), então:
 *  - os tamanhos são limitados (LIMITS) antes de qualquer processamento;
 *  - as buscas (⇒*, derivação automática) têm teto de nós visitados, para que uma
 *    gramática patológica (A → AA | ε) não trave a aba;
 *  - nada vira HTML: a camada de tela só interpola strings.
 *
 * Formato da gramática (uma regra por linha):
 *   R → XRX | S          (também aceita -> e ::=)
 *   T → XTX | X | ε      (ε, eps, λ ou alternativa vazia = palavra vazia)
 *   | aT                 (linha começando com | continua a regra anterior)
 * O símbolo de partida é o lado esquerdo da primeira regra.
 *
 * Tokenização do lado direito:
 *  - alternativa SEM espaços ("aTb", "0S"): cada caractere é um símbolo, exceto
 *    nomes de não terminais, reconhecidos pelo maior casamento ("EXPR");
 *  - alternativa COM espaços ("EXPR OP EXPR", "( EXPR )", "id"): trechos entre
 *    não terminais viram um terminal só, então "id" é UM terminal.
 */

export const EPS = 'ε';

export const LIMITS = {
  grammarChars: 4000,
  productions: 200,
  rhsTokens: 40,
  formTokens: 120,
  derivationLines: 120,
  treeChars: 4000,
  treeNodes: 600,
  searchNodes: 60_000,
  stepSearchNodes: 4_000,
};

export interface Production {
  index: number;       // 1..n, na ordem em que aparece
  lhs: string;
  rhs: string[];       // [] = ε
}

export interface Grammar {
  start: string;
  nonterminals: string[];
  terminals: string[];
  productions: Production[];
  byLhs: Map<string, Production[]>;
  /** Todos os símbolos, do maior para o menor (tokenização por maior casamento). */
  symbols: string[];
  nullable: Set<string>;
  /** Escrita com espaços entre símbolos (EXPR OP EXPR) ou compacta (aTb). */
  spaced: boolean;
}

export interface Problem { line: number; message: string }

const ARROW = /\s*(?:→|->|::=)\s*/;
const isEpsWord = (s: string) => s === EPS || s === 'λ' || s.toLowerCase() === 'eps';

export function isNT(g: Grammar, sym: string): boolean {
  return g.byLhs.has(sym);
}

/** "aTb" fica junto; "EXPR OP EXPR" fica separado — como o usuário escreveria. */
export function showForm(g: Grammar | null, form: string[]): string {
  if (!form.length) return EPS;
  const compact = g ? !g.spaced : form.every((s) => [...s].length === 1);
  return compact ? form.join('') : form.join(' ');
}

export function showProd(g: Grammar | null, p: Production): string {
  return `${p.lhs} → ${p.rhs.length ? showForm(g, p.rhs) : EPS}`;
}

function longestAt(text: string, i: number, sorted: string[]): string | null {
  for (const s of sorted) if (s && text.startsWith(s, i)) return s;
  return null;
}

function tokenizeAlt(alt: string, ntSorted: string[], spaced: boolean): string[] {
  const a = alt.trim();
  if (!a || isEpsWord(a)) return [];
  const out: string[] = [];
  for (const chunk of a.split(/\s+/)) {
    if (!chunk || isEpsWord(chunk)) continue;
    let buf = '';
    let i = 0;
    while (i < chunk.length) {
      const nt = longestAt(chunk, i, ntSorted);
      if (nt) {
        if (buf) { out.push(buf); buf = ''; }
        out.push(nt);
        i += nt.length;
        continue;
      }
      const ch = String.fromCodePoint(chunk.codePointAt(i)!);
      if (ch === EPS) { i += ch.length; continue; }
      if (spaced) buf += ch; else out.push(ch);
      i += ch.length;
    }
    if (buf) out.push(buf);
  }
  return out;
}

export function parseGrammar(src: string): { grammar: Grammar | null; problems: Problem[] } {
  const problems: Problem[] = [];
  if (src.length > LIMITS.grammarChars) {
    return { grammar: null, problems: [{ line: 0, message: `Gramática grande demais (máx. ${LIMITS.grammarChars} caracteres).` }] };
  }
  // 1ª passada: junta continuações e separa lhs/rhs.
  const raw: { line: number; lhs: string; rhs: string }[] = [];
  src.split(/\r?\n/).forEach((text, k) => {
    const line = k + 1;
    const t = text.trim();
    if (!t || t.startsWith('#') || t.startsWith('//')) return;
    if (t.startsWith('|')) {
      const last = raw[raw.length - 1];
      if (!last) { problems.push({ line, message: 'Linha começa com | mas não há regra antes.' }); return; }
      last.rhs += ' ' + t;
      return;
    }
    const parts = t.split(ARROW);
    if (parts.length < 2) { problems.push({ line, message: 'Falta a seta (→ ou ->).' }); return; }
    if (parts.length > 2) { problems.push({ line, message: 'Mais de uma seta na mesma linha.' }); return; }
    const lhs = parts[0].trim();
    if (!lhs || /\s/.test(lhs) || /[|\[\]]/.test(lhs) || isEpsWord(lhs)) {
      problems.push({ line, message: `Lado esquerdo inválido: “${lhs}”. Deve ser um único não terminal.` });
      return;
    }
    raw.push({ line, lhs, rhs: parts[1] });
  });
  if (!raw.length) {
    if (!problems.length) problems.push({ line: 0, message: 'Escreva ao menos uma regra, como S → aS | b.' });
    return { grammar: null, problems };
  }

  const nonterminals = [...new Set(raw.map((r) => r.lhs))];
  const ntSorted = [...nonterminals].sort((a, b) => b.length - a.length);
  // Estilo da gramática inteira: se alguma alternativa separa símbolos com espaço,
  // todas são lidas assim (e "id" vira um terminal só, como em EXPR → id).
  const spaced = raw.some((r) => r.rhs.split('|').some((alt) => /\S\s+\S/.test(alt.trim())));
  const productions: Production[] = [];
  const seen = new Set<string>();
  for (const r of raw) {
    for (const alt of r.rhs.split('|')) {
      if (productions.length >= LIMITS.productions) {
        problems.push({ line: r.line, message: `Regras demais (máx. ${LIMITS.productions}).` });
        break;
      }
      const rhs = tokenizeAlt(alt, ntSorted, spaced);
      if (rhs.length > LIMITS.rhsTokens) { problems.push({ line: r.line, message: 'Lado direito longo demais.' }); continue; }
      if (rhs.some((s) => s === '[' || s === ']')) { problems.push({ line: r.line, message: 'Os símbolos [ e ] são reservados para a notação de árvore.' }); continue; }
      const key = r.lhs + '\u0000' + rhs.join('\u0001');
      if (seen.has(key)) continue; // alternativa repetida não muda a linguagem
      seen.add(key);
      productions.push({ index: productions.length + 1, lhs: r.lhs, rhs });
    }
  }
  const byLhs = new Map<string, Production[]>();
  for (const n of nonterminals) byLhs.set(n, []);
  for (const p of productions) byLhs.get(p.lhs)!.push(p);

  const terminals = [...new Set(productions.flatMap((p) => p.rhs).filter((s) => !byLhs.has(s)))];
  const symbols = [...nonterminals, ...terminals].sort((a, b) => b.length - a.length);

  // anuláveis: ponto fixo (A é anulável se alguma regra só tem anuláveis)
  const nullable = new Set<string>();
  for (let changed = true; changed;) {
    changed = false;
    for (const p of productions) {
      if (!nullable.has(p.lhs) && p.rhs.every((s) => nullable.has(s))) { nullable.add(p.lhs); changed = true; }
    }
  }

  const grammar: Grammar = { start: raw[0].lhs, nonterminals, terminals, productions, byLhs, symbols, nullable, spaced };
  return { grammar, problems };
}

/** Classificação rápida na hierarquia de Chomsky (só tipos 3 e 2: as regras daqui têm um não terminal à esquerda). */
export function classify(g: Grammar): { regular: boolean; reason: string } {
  for (const p of g.productions) {
    const nts = p.rhs.filter((s) => isNT(g, s));
    if (nts.length > 1) return { regular: false, reason: `${showProd(g, p)} tem ${nts.length} não terminais.` };
    if (nts.length === 1 && !isNT(g, p.rhs[p.rhs.length - 1])) {
      return { regular: false, reason: `${showProd(g, p)} tem não terminal fora do fim.` };
    }
  }
  return { regular: true, reason: 'Todo lado direito tem no máximo um não terminal, no fim.' };
}

/** Quebra uma forma sentencial digitada em símbolos da gramática. */
export function tokenizeForm(g: Grammar, text: string): { tokens: string[] } | { error: string } {
  const out: string[] = [];
  let i = 0;
  const t = text.trim();
  if (isEpsWord(t)) return { tokens: [] };
  while (i < t.length) {
    const ch = String.fromCodePoint(t.codePointAt(i)!);
    if (/\s/.test(ch) || ch === EPS) { i += ch.length; continue; }
    const sym = longestAt(t, i, g.symbols);
    if (!sym) return { error: `Símbolo “${ch}” não existe nesta gramática (posição ${out.length + 1}).` };
    out.push(sym);
    if (out.length > LIMITS.formTokens) return { error: `Forma longa demais (máx. ${LIMITS.formTokens} símbolos).` };
    i += sym.length;
  }
  return { tokens: out };
}

const eq = (a: string[], b: string[]) => a.length === b.length && a.every((s, i) => s === b[i]);
const key = (f: string[]) => f.join('\u0001');

export interface StepMatch { pos: number; prod: Production }

/** Todas as formas de ir de `a` para `b` em exatamente UM passo. */
export function oneStep(g: Grammar, a: string[], b: string[]): StepMatch[] {
  const out: StepMatch[] = [];
  for (let pos = 0; pos < a.length; pos++) {
    const prods = g.byLhs.get(a[pos]);
    if (!prods) continue;
    for (const prod of prods) {
      if (b.length !== a.length - 1 + prod.rhs.length) continue;
      let ok = true;
      for (let k = 0; ok && k < pos; k++) ok = a[k] === b[k];
      for (let k = 0; ok && k < prod.rhs.length; k++) ok = prod.rhs[k] === b[pos + k];
      for (let k = pos + 1; ok && k < a.length; k++) ok = a[k] === b[k - 1 + prod.rhs.length];
      if (ok) out.push({ pos, prod });
    }
  }
  return out;
}

export function apply(form: string[], m: StepMatch): string[] {
  return [...form.slice(0, m.pos), ...m.prod.rhs, ...form.slice(m.pos + 1)];
}

const firstNT = (g: Grammar, f: string[]) => f.findIndex((s) => isNT(g, s));
const lastNT = (g: Grammar, f: string[]) => {
  for (let i = f.length - 1; i >= 0; i--) if (isNT(g, f[i])) return i;
  return -1;
};

/** Menor número de passos (2..maxSteps) de a até b, ou null. BFS limitada. */
export function stepsBetween(g: Grammar, a: string[], b: string[], maxSteps = 5): number | null {
  const target = key(b);
  const termB = b.filter((s) => !isNT(g, s)).length;
  let layer = [a];
  const seen = new Set([key(a)]);
  let visited = 0;
  for (let d = 1; d <= maxSteps; d++) {
    const next: string[][] = [];
    for (const f of layer) {
      for (let pos = 0; pos < f.length; pos++) {
        for (const prod of g.byLhs.get(f[pos]) ?? []) {
          const n = apply(f, { pos, prod });
          const k = key(n);
          if (k === target) return d;
          if (seen.has(k) || n.length > b.length + 6) continue;
          if (n.filter((s) => !isNT(g, s)).length > termB) continue; // terminais nunca somem
          seen.add(k);
          next.push(n);
          if (++visited > LIMITS.stepSearchNodes) return null;
        }
      }
    }
    layer = next;
  }
  return null;
}

// ───────────────────────────── derivação ─────────────────────────────

export interface StepReport {
  line: number;
  text: string;
  tokens: string[] | null;
  status: 'start' | 'ok' | 'error';
  message: string;
  match?: StepMatch;
  ambiguous?: boolean;   // mais de uma regra/posição explica o passo
  leftmost?: boolean;
  rightmost?: boolean;
}

export interface DerivationReport {
  steps: StepReport[];
  startsAtStart: boolean;
  allValid: boolean;
  endsInSentence: boolean;
  matchesWord: boolean | null;  // null = palavra não informada
  leftmost: boolean;
  rightmost: boolean;
  count: number;                // passos válidos
}

/**
 * Lê uma derivação: uma forma por linha e/ou separadas por ⇒ (ou =>).
 * Linhas vazias são ignoradas; ⇒* numa linha é tratado como erro de notação.
 */
export function splitDerivation(text: string): { line: number; text: string }[] {
  const out: { line: number; text: string }[] = [];
  text.split(/\r?\n/).slice(0, LIMITS.derivationLines).forEach((l, k) => {
    for (const seg of l.split(/⇒\*?|=>\*?/)) {
      const t = seg.trim();
      if (t) out.push({ line: k + 1, text: t });
    }
  });
  return out;
}

export function checkDerivation(g: Grammar, text: string, word: string[] | null): DerivationReport {
  const parts = splitDerivation(text);
  const steps: StepReport[] = [];
  let prev: string[] | null = null;
  let allValid = true;
  let leftmost = true;
  let rightmost = true;
  let count = 0;

  for (const [i, p] of parts.entries()) {
    const tk = tokenizeForm(g, p.text);
    if ('error' in tk) {
      steps.push({ line: p.line, text: p.text, tokens: null, status: 'error', message: tk.error });
      allValid = false;
      prev = null;
      continue;
    }
    const f = tk.tokens;
    if (i === 0) {
      const ok = eq(f, [g.start]);
      steps.push({
        line: p.line, text: p.text, tokens: f, status: ok ? 'start' : 'error',
        message: ok ? `Começa no símbolo de partida ${g.start}.` : `A derivação deve começar no símbolo de partida ${g.start}.`,
      });
      if (!ok) allValid = false;
      prev = f;
      continue;
    }
    if (!prev) {
      steps.push({ line: p.line, text: p.text, tokens: f, status: 'error', message: 'Não dá para conferir: a forma anterior tem erro.' });
      prev = f;
      continue;
    }
    const ms = oneStep(g, prev, f);
    if (ms.length) {
      // prefere a explicação mais à esquerda (a convencional)
      const m = ms.reduce((a, b) => (b.pos < a.pos ? b : a));
      const lm = m.pos === firstNT(g, prev);
      const rm = ms.some((x) => x.pos === lastNT(g, prev!));
      leftmost &&= ms.some((x) => x.pos === firstNT(g, prev!));
      rightmost &&= rm;
      count++;
      steps.push({
        line: p.line, text: p.text, tokens: f, status: 'ok', match: m, ambiguous: ms.length > 1, leftmost: lm, rightmost: rm,
        message: `${showProd(g, m.prod)} no ${m.pos + 1}º símbolo.`,
      });
    } else {
      allValid = false;
      steps.push({ line: p.line, text: p.text, tokens: f, status: 'error', message: explainBadStep(g, prev, f) });
    }
    prev = f;
  }

  const last = [...steps].reverse().find((s) => s.tokens)?.tokens ?? null;
  const endsInSentence = !!last && last.every((s) => !isNT(g, s));
  return {
    steps,
    startsAtStart: steps[0]?.status === 'start',
    allValid: allValid && steps.length > 0,
    endsInSentence,
    matchesWord: word ? !!last && eq(last, word) : null,
    leftmost: leftmost && count > 0,
    rightmost: rightmost && count > 0,
    count,
  };
}

function explainBadStep(g: Grammar, a: string[], b: string[]): string {
  if (eq(a, b)) return 'Nada mudou. Isso seria ⇒* com zero passos; num passo ⇒ algum não terminal precisa ser substituído.';
  let p = 0;
  while (p < a.length && p < b.length && a[p] === b[p]) p++;
  let s = 0;
  while (s < a.length - p && s < b.length - p && a[a.length - 1 - s] === b[b.length - 1 - s]) s++;
  const changed = a.slice(p, a.length - s);
  const written = b.slice(p, b.length - s);
  const nts = changed.filter((x) => isNT(g, x));
  const n = stepsBetween(g, a, b);
  if (n) return `Não é um passo só: daqui até aqui são ${n} passos. Escreva as formas intermediárias (ou use ⇒* na prova).`;
  if (!changed.length && a.every((x) => !isNT(g, x))) return 'A forma anterior já é sentença (só terminais): não há mais o que derivar.';
  if (nts.length === 0 && changed.length) return `Um terminal mudou (${showForm(g, changed)} → ${showForm(g, written)}). Terminais nunca são substituídos.`;
  if (nts.length === 1 && changed.length === 1) {
    const A = changed[0];
    const rules = (g.byLhs.get(A) ?? []).map((r) => showProd(g, r)).join(' · ');
    return `Não existe a regra ${A} → ${written.length ? showForm(g, written) : EPS}. Regras de ${A}: ${rules}.`;
  }
  if (nts.length > 1) return `Mais de um não terminal mudou ao mesmo tempo (${nts.join(', ')}). Em ⇒ só um é substituído por passo.`;
  return 'Este passo não corresponde a nenhuma regra aplicada à forma anterior.';
}

// ───────────────────────────── árvore ─────────────────────────────

export interface TreeNode {
  id: number;
  sym: string;                    // 'ε' para a folha vazia
  children: TreeNode[] | null;    // null = folha
}

export interface NodeIssue { id: number; message: string }

export interface TreeReport {
  issues: NodeIssue[];
  issueById: Map<number, string>;
  incomplete: number[];          // ids de folhas não terminais (árvore parcial)
  frontier: string[];            // fronteira (folhas, sem ε)
  valid: boolean;                // estrutura toda certa
  complete: boolean;             // sem não terminais nas folhas
  matchesWord: boolean | null;
}

let nextId = 1;
export const leaf = (sym: string): TreeNode => ({ id: nextId++, sym, children: null });
export const node = (sym: string, children: TreeNode[]): TreeNode => ({ id: nextId++, sym, children });

/** Notação: R[X[a] R[S[a T[ε] b]] X[a]]. Espaços entre irmãos são opcionais. */
export function parseTree(g: Grammar, text: string): { root: TreeNode | null; error: string | null } {
  const t = text.trim();
  if (!t) return { root: null, error: null };
  if (t.length > LIMITS.treeChars) return { root: null, error: 'Árvore grande demais.' };
  let i = 0;
  let count = 0;
  const skip = () => { while (i < t.length && /\s/.test(t[i])) i++; };
  const sym = (): string | null => {
    skip();
    if (t.startsWith(EPS, i)) { i += EPS.length; return EPS; }
    const s = longestAt(t, i, g.symbols);
    if (s) { i += s.length; return s; }
    return null;
  };
  const parseNode = (depth: number): TreeNode => {
    if (depth > 200) throw new Error('Árvore profunda demais.');
    if (++count > LIMITS.treeNodes) throw new Error('Nós demais na árvore.');
    const s = sym();
    if (!s) {
      skip();
      const ch = t[i] ?? 'fim';
      throw new Error(i >= t.length ? 'Faltou um símbolo no fim.' : `Esperava um símbolo da gramática, encontrei “${ch}” (caractere ${i + 1}).`);
    }
    skip();
    if (t[i] !== '[') return leaf(s);
    i++; // [
    const kids: TreeNode[] = [];
    for (;;) {
      skip();
      if (i >= t.length) throw new Error(`Faltou fechar ] do nó ${s}.`);
      if (t[i] === ']') { i++; break; }
      kids.push(parseNode(depth + 1));
    }
    return node(s, kids);
  };
  try {
    const root = parseNode(0);
    skip();
    if (i < t.length) return { root: null, error: `Sobrou texto depois da raiz: “${t.slice(i, i + 12)}”. A árvore tem uma raiz só.` };
    return { root, error: null };
  } catch (e) {
    return { root: null, error: (e as Error).message };
  }
}

export function serializeTree(n: TreeNode): string {
  if (!n.children) return n.sym;
  return `${n.sym}[${n.children.map(serializeTree).join(' ')}]`;
}

export function frontierOf(n: TreeNode): string[] {
  if (!n.children) return n.sym === EPS ? [] : [n.sym];
  return n.children.flatMap(frontierOf);
}

export function checkTree(g: Grammar, root: TreeNode, word: string[] | null): TreeReport {
  const issues: NodeIssue[] = [];
  const incomplete: number[] = [];
  if (root.sym !== g.start) issues.push({ id: root.id, message: `A raiz deve ser o símbolo de partida ${g.start}.` });

  const walk = (n: TreeNode) => {
    if (!n.children) {
      if (isNT(g, n.sym)) incomplete.push(n.id);
      return;
    }
    if (n.sym === EPS) { issues.push({ id: n.id, message: 'ε é folha: não pode ter filhos.' }); return; }
    if (!isNT(g, n.sym)) { issues.push({ id: n.id, message: `${n.sym} é terminal: terminais são folhas, não têm filhos.` }); }
    else {
      const hasEps = n.children.some((c) => c.sym === EPS);
      if (hasEps && n.children.length > 1) {
        issues.push({ id: n.id, message: 'ε só aparece como filho único (regra A → ε).' });
      } else if (!n.children.length) {
        issues.push({ id: n.id, message: `${n.sym}[] está vazio. Para a regra ${n.sym} → ε escreva ${n.sym}[ε].` });
      } else {
        const rhs = hasEps ? [] : n.children.map((c) => c.sym);
        const prod = g.byLhs.get(n.sym)!.find((p) => eq(p.rhs, rhs));
        if (!prod) {
          const rules = g.byLhs.get(n.sym)!.map((r) => showProd(g, r)).join(' · ');
          issues.push({ id: n.id, message: `Não existe a regra ${n.sym} → ${rhs.length ? showForm(g, rhs) : EPS}. Regras de ${n.sym}: ${rules}.` });
        }
      }
    }
    n.children.forEach(walk);
  };
  walk(root);

  const frontier = frontierOf(root);
  return {
    issues,
    issueById: new Map(issues.map((x) => [x.id, x.message])),
    incomplete,
    frontier,
    valid: issues.length === 0,
    complete: incomplete.length === 0,
    matchesWord: word ? incomplete.length === 0 && eq(frontier, word) : null,
  };
}

/** Derivação mais à esquerda lida da árvore (só faz sentido se a árvore for válida). */
export function treeToLeftmost(g: Grammar, root: TreeNode): string[][] {
  let frontier: TreeNode[] = [root];
  const forms: string[][] = [[root.sym]];
  for (let guard = 0; guard < LIMITS.treeNodes; guard++) {
    const i = frontier.findIndex((n) => isNT(g, n.sym) && n.children);
    if (i < 0) break;
    const kids = frontier[i].children!.filter((c) => c.sym !== EPS);
    frontier = [...frontier.slice(0, i), ...kids, ...frontier.slice(i + 1)];
    forms.push(frontier.map((n) => n.sym));
  }
  return forms;
}

/** Árvore a partir de uma derivação já conferida (usa a regra/posição de cada passo). */
export function derivationToTree(g: Grammar, rep: DerivationReport): TreeNode | null {
  if (!rep.startsAtStart || !rep.allValid) return null;
  const root = leaf(g.start);
  let frontier: TreeNode[] = [root];
  for (const s of rep.steps) {
    if (s.status !== 'ok' || !s.match) continue;
    const target = frontier[s.match.pos];
    const kids = s.match.prod.rhs.length ? s.match.prod.rhs.map(leaf) : [leaf(EPS)];
    target.children = kids;
    frontier = [...frontier.slice(0, s.match.pos), ...kids.filter((k) => k.sym !== EPS), ...frontier.slice(s.match.pos + 1)];
  }
  return root;
}

/** Copia a árvore trocando um nó (imutável: a tela trabalha com signals). */
export function replaceNode(n: TreeNode, id: number, f: (old: TreeNode) => TreeNode): TreeNode {
  if (n.id === id) return f(n);
  if (!n.children) return n;
  let changed = false;
  const kids = n.children.map((c) => {
    const r = replaceNode(c, id, f);
    if (r !== c) changed = true;
    return r;
  });
  return changed ? { ...n, children: kids } : n;
}

export function expandLeaf(n: TreeNode, prod: Production): TreeNode {
  return { ...n, children: prod.rhs.length ? prod.rhs.map(leaf) : [leaf(EPS)] };
}

// ───────────────────────── busca de derivação ─────────────────────────

export type SearchResult =
  | { found: true; forms: string[][] }
  | { found: false; exhaustive: boolean };

/**
 * Procura uma derivação MAIS À ESQUERDA de w (BFS = a mais curta).
 * Podas seguras: o prefixo de terminais antes do 1º não terminal tem que ser
 * prefixo de w, e terminais + não terminais não anuláveis não podem passar de |w|.
 * Se a busca esgotar sem bater no teto, a palavra comprovadamente não é gerada.
 */
export function searchLeftmost(g: Grammar, word: string[]): SearchResult {
  const target = key(word);
  const startForm = [g.start];
  const parent = new Map<string, string | null>([[key(startForm), null]]);
  const formOf = new Map<string, string[]>([[key(startForm), startForm]]);
  let queue: string[][] = [startForm];
  let truncated = false;
  let visited = 0;
  const cap = word.length * 3 + 8;

  const viable = (f: string[]): boolean => {
    let i = 0;
    while (i < f.length && !isNT(g, f[i])) {
      if (f[i] !== word[i]) return false;
      i++;
    }
    let need = 0;
    for (const s of f) if (!isNT(g, s) || !g.nullable.has(s)) need++;
    return need <= word.length;
  };

  if (target === key(startForm)) return { found: true, forms: [startForm] };
  while (queue.length) {
    const next: string[][] = [];
    for (const f of queue) {
      const pos = firstNT(g, f);
      if (pos < 0) continue;
      for (const prod of g.byLhs.get(f[pos])!) {
        const n = apply(f, { pos, prod });
        const k = key(n);
        if (parent.has(k)) continue;
        if (!viable(n)) continue;
        if (n.length > cap) { truncated = true; continue; }
        parent.set(k, key(f));
        formOf.set(k, n);
        if (k === target) {
          const forms: string[][] = [];
          for (let c: string | null = k; c !== null; c = parent.get(c) ?? null) forms.unshift(formOf.get(c)!);
          return { found: true, forms };
        }
        if (++visited > LIMITS.searchNodes) return { found: false, exhaustive: false };
        next.push(n);
      }
    }
    queue = next;
  }
  return { found: false, exhaustive: !truncated };
}
