import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TreeEditorComponent } from '../../shared/tree-editor.component';
import { ThemeService } from '../../core/services/theme.service';
import { PdfWindowService } from '../../core/services/pdf-window.service';
import {
  EPS, Grammar, Production, SearchResult, TreeReport,
  checkDerivation, checkTree, classify, derivationToTree, isNT, parseGrammar,
  parseTree, searchLeftmost, serializeTree, showForm, showProd, tokenizeForm, treeToLeftmost,
} from '../../domain/grammar';
import { PRESETS } from './presets';

const STORE_KEY = 'bancada-derivacoes-v1';
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

/**
 * Página de derivações: o aluno escreve a gramática, a derivação (uma forma por
 * linha) e a árvore (notação com colchetes ou clicando nos nós). Tudo é
 * conferido a cada tecla pelo motor puro em domain/grammar.ts.
 */
@Component({
  selector: 'app-derivacoes',
  standalone: true,
  imports: [RouterLink, TreeEditorComponent],
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
  editTree(v: string): void { this.treeText.set(v); }
  restartTree(): void {
    const g = this.g();
    if (g) this.treeText.set(g.start);
  }
  treeFromDerivation(): void {
    const g = this.g(), d = this.derivation();
    if (!g || !d) return;
    const t = derivationToTree(g, d);
    if (t) this.treeText.set(serializeTree(t));
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

}
