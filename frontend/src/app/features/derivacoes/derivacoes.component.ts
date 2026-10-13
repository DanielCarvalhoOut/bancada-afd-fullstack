import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ThemeService } from '../../core/services/theme.service';
import { PdfWindowService } from '../../core/services/pdf-window.service';
import {
  EPS, Grammar, Production, SearchResult, TreeNode, TreeReport,
  checkDerivation, checkTree, classify, derivationToTree, expandLeaf, isNT, parseGrammar,
  parseTree, replaceNode, searchLeftmost, serializeTree, showForm, showProd, tokenizeForm, treeToLeftmost,
} from '../../domain/grammar';
import { PRESETS } from './presets';

const STORE_KEY = 'bancada-derivacoes-v1';
const NODE_W = 46;   // largura por folha
const LEVEL_H = 64;  // distância entre níveis
const PAD = 26;

interface LNode {
  path: string;      // "0.2.1": estável entre edições do texto (o id do parser não é)
  sym: string;
  x: number;
  y: number;
  kind: 'nt' | 't' | 'eps';
  leaf: boolean;
  err: string | null;
  open: boolean;     // não terminal ainda sem filhos
}
interface LEdge { key: string; x1: number; y1: number; x2: number; y2: number; err: boolean }
interface TreeView { nodes: LNode[]; edges: LEdge[]; w: number; h: number }

interface Saved { preset: string; grammar: string; word: string; steps: string; tree: string }

function load(): Saved | null {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<Saved>;
    // conteúdo do storage também é entrada não confiável: só strings, com teto
    const s = (x: unknown, max: number) => (typeof x === 'string' ? x.slice(0, max) : '');
    return { preset: s(v.preset, 40), grammar: s(v.grammar, 4000), word: s(v.word, 200), steps: s(v.steps, 6000), tree: s(v.tree, 4000) };
  } catch { return null; }
}

function nodeAt(root: TreeNode, path: string): TreeNode | null {
  let n: TreeNode | null = root;
  for (const k of path.split('.').slice(1)) {
    n = n?.children?.[+k] ?? null;
  }
  return n;
}

/**
 * Página de derivações: o aluno escreve a gramática, a derivação (uma forma por
 * linha) e a árvore (notação com colchetes ou clicando nos nós). Tudo é
 * conferido a cada tecla pelo motor puro em domain/grammar.ts.
 */
@Component({
  selector: 'app-derivacoes',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './derivacoes.component.html',
  styleUrl: './derivacoes.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DerivacoesComponent {
  readonly theme = inject(ThemeService);
  readonly pdf = inject(PdfWindowService);
  readonly presets = PRESETS;
  readonly EPS = EPS;

  private readonly saved = load();
  readonly presetId = signal(this.saved?.preset ?? PRESETS[0].id);
  readonly grammarText = signal(this.saved?.grammar ?? PRESETS[0].grammar);
  readonly word = signal(this.saved?.word ?? PRESETS[0].word);
  readonly stepsText = signal(this.saved?.steps ?? 'R');
  readonly treeText = signal(this.saved?.tree ?? 'R');

  readonly preset = computed(() => PRESETS.find((p) => p.id === this.presetId()) ?? null);

  // ─── gramática ───
  readonly parsed = computed(() => parseGrammar(this.grammarText()));
  readonly g = computed<Grammar | null>(() => this.parsed().grammar);
  readonly kind = computed(() => { const g = this.g(); return g ? classify(g) : null; });
  readonly prodsByLhs = computed(() => {
    const g = this.g();
    if (!g) return [];
    return g.nonterminals.map((n) => ({ lhs: n, alts: g.byLhs.get(n)!.map((p) => (p.rhs.length ? showForm(g, p.rhs) : EPS)) }));
  });

  // ─── palavra ───
  readonly wordTok = computed<{ tokens: string[] | null; error: string | null }>(() => {
    const g = this.g();
    const w = this.word().trim();
    if (!g || !w) return { tokens: null, error: null };
    const r = tokenizeForm(g, w);
    return 'error' in r ? { tokens: null, error: r.error } : { tokens: r.tokens, error: null };
  });

  // ─── derivação ───
  readonly derivation = computed(() => {
    const g = this.g();
    return g ? checkDerivation(g, this.stepsText(), this.wordTok().tokens) : null;
  });
  /** Última forma conferível: é dela que saem os próximos passos por clique. */
  readonly lastForm = computed<string[] | null>(() => {
    const g = this.g();
    const d = this.derivation();
    if (!g || !d) return null;
    if (!d.steps.length) return [g.start];
    const last = d.steps[d.steps.length - 1];
    return last.status === 'error' ? null : last.tokens;
  });
  readonly pickPos = signal<number | null>(null);
  readonly pickOptions = computed<Production[]>(() => {
    const g = this.g(), f = this.lastForm(), p = this.pickPos();
    if (!g || !f || p === null || !isNT(g, f[p])) return [];
    return g.byLhs.get(f[p]) ?? [];
  });
  readonly answer = signal<{ result: SearchResult; text: string } | null>(null);

  // ─── árvore ───
  readonly treeParse = computed(() => {
    const g = this.g();
    return g ? parseTree(g, this.treeText()) : { root: null, error: null };
  });
  readonly treeReport = computed<TreeReport | null>(() => {
    const g = this.g(), r = this.treeParse().root;
    return g && r ? checkTree(g, r, this.wordTok().tokens) : null;
  });
  readonly treeView = computed<TreeView | null>(() => this.layout());
  readonly selPath = signal<string | null>(null);
  readonly selNode = computed(() => {
    const r = this.treeParse().root, p = this.selPath();
    return r && p ? nodeAt(r, p) : null;
  });
  readonly selOptions = computed<Production[]>(() => {
    const g = this.g(), n = this.selNode();
    return g && n && isNT(g, n.sym) ? g.byLhs.get(n.sym) ?? [] : [];
  });
  readonly selIssue = computed(() => {
    const n = this.selNode(), rep = this.treeReport();
    return n && rep ? rep.issueById.get(n.id) ?? null : null;
  });

  constructor() {
    effect(() => {
      const data: Saved = { preset: this.presetId(), grammar: this.grammarText(), word: this.word(), steps: this.stepsText(), tree: this.treeText() };
      try { localStorage.setItem(STORE_KEY, JSON.stringify(data)); } catch { /* modo privado */ }
    });
  }

  // ─── ações: gramática ───
  loadPreset(id: string): void {
    const p = PRESETS.find((x) => x.id === id);
    this.presetId.set(id);
    if (!p) return; // "personalizada": mantém o que está escrito
    const start = parseGrammar(p.grammar).grammar?.start ?? '';
    this.grammarText.set(p.grammar);
    this.word.set(p.word);
    this.stepsText.set(start);
    this.treeText.set(start);
    this.resetUi();
  }
  editGrammar(v: string): void {
    this.grammarText.set(v);
    this.presetId.set('');
    this.resetUi();
  }
  private resetUi(): void {
    this.pickPos.set(null);
    this.selPath.set(null);
    this.answer.set(null);
  }

  // ─── ações: derivação ───
  editSteps(v: string): void { this.stepsText.set(v); this.pickPos.set(null); }
  pick(i: number): void {
    const g = this.g(), f = this.lastForm();
    if (!g || !f || !isNT(g, f[i])) return;
    this.pickPos.set(this.pickPos() === i ? null : i);
  }
  applyStep(prod: Production): void {
    const g = this.g(), f = this.lastForm(), p = this.pickPos();
    if (!g || !f || p === null) return;
    const next = [...f.slice(0, p), ...prod.rhs, ...f.slice(p + 1)];
    const base = this.stepsText().replace(/\s+$/, '') || g.start;
    this.stepsText.set(`${base}\n${showForm(g, next)}`);
    this.pickPos.set(null);
  }
  undoStep(): void {
    const lines = this.stepsText().replace(/\s+$/, '').split('\n');
    if (lines.length > 1) this.stepsText.set(lines.slice(0, -1).join('\n'));
    this.pickPos.set(null);
  }
  restartSteps(): void {
    const g = this.g();
    if (g) this.stepsText.set(g.start);
    this.pickPos.set(null);
  }
  solve(): void {
    const g = this.g(), w = this.wordTok().tokens;
    if (!g || !w) return;
    const result = searchLeftmost(g, w);
    const text = result.found ? result.forms.map((f) => showForm(g, f)).join('\n') : '';
    this.answer.set({ result, text });
  }
  useAnswer(): void {
    const a = this.answer();
    if (a?.text) this.stepsText.set(a.text);
  }

  // ─── ações: árvore ───
  editTree(v: string): void { this.treeText.set(v); this.selPath.set(null); }
  select(path: string): void { this.selPath.set(this.selPath() === path ? null : path); }
  expandSel(prod: Production): void {
    const r = this.treeParse().root, n = this.selNode();
    if (!r || !n) return;
    this.treeText.set(serializeTree(replaceNode(r, n.id, (old) => expandLeaf(old, prod))));
  }
  collapseSel(): void {
    const r = this.treeParse().root, n = this.selNode();
    if (!r || !n) return;
    this.treeText.set(serializeTree(replaceNode(r, n.id, (old) => ({ ...old, children: null }))));
  }
  restartTree(): void {
    const g = this.g();
    if (g) this.treeText.set(g.start);
    this.selPath.set(null);
  }
  treeFromDerivation(): void {
    const g = this.g(), d = this.derivation();
    if (!g || !d) return;
    const t = derivationToTree(g, d);
    if (t) { this.treeText.set(serializeTree(t)); this.selPath.set(null); }
  }
  derivationFromTree(): void {
    const g = this.g(), r = this.treeParse().root;
    if (!g || !r || !this.treeReport()?.valid) return;
    this.stepsText.set(treeToLeftmost(g, r).map((f) => showForm(g, f)).join('\n'));
  }

  // ─── apresentação ───
  show(f: string[] | null): string { return f ? showForm(this.g(), f) : ''; }
  prodText(p: Production): string { return showProd(this.g(), p); }
  isNTsym(s: string): boolean { const g = this.g(); return !!g && isNT(g, s); }

  /**
   * Desenho "arrumado": folhas em colunas consecutivas, pai centrado sobre o
   * primeiro e o último filho. O(n) e determinístico — não precisa de lib.
   */
  private layout(): TreeView | null {
    const g = this.g(), root = this.treeParse().root, rep = this.treeReport();
    if (!g || !root) return null;
    const nodes: LNode[] = [];
    const edges: LEdge[] = [];
    let cursor = 0; // x acumulado das folhas (largura depende do símbolo: "EXPR" ocupa mais que "a")
    let depthMax = 0;
    const place = (n: TreeNode, path: string, depth: number): { x: number; y: number } => {
      depthMax = Math.max(depthMax, depth);
      const y = PAD + depth * LEVEL_H;
      let x: number;
      const kids = n.children ?? [];
      const pts = kids.map((c, i) => place(c, `${path}.${i}`, depth + 1));
      if (!pts.length) {
        const w = Math.max(NODE_W, this.symWidth(n.sym) + 10);
        x = PAD + cursor + w / 2;
        cursor += w;
      }
      else x = (pts[0].x + pts[pts.length - 1].x) / 2;
      const err = rep?.issueById.get(n.id) ?? null;
      pts.forEach((p, i) => edges.push({ key: `${path}>${i}`, x1: x, y1: y + 14, x2: p.x, y2: p.y - 14, err: !!err }));
      const kind = n.sym === EPS ? 'eps' : isNT(g, n.sym) ? 'nt' : 't';
      nodes.push({ path, sym: n.sym, x, y, kind, leaf: !n.children, err, open: kind === 'nt' && !n.children });
      return { x, y };
    };
    place(root, '0', 0);
    return { nodes, edges, w: PAD * 2 + Math.max(cursor, NODE_W), h: PAD * 2 + depthMax * LEVEL_H };
  }

  symWidth(s: string): number { return Math.max(28, [...s].length * 8.6 + 16); }
}
