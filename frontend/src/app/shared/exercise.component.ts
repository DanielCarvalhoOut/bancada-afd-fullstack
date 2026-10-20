import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Exercise, Feedback, Verdict, grade, initialAnswer } from '../domain/exercise';
import { Production, checkDerivation, isNT, parseGrammar, showForm, showProd, tokenizeForm } from '../domain/grammar';
import { TreeEditorComponent } from './tree-editor.component';
import { Sym, SymBarComponent } from './sym-bar.component';

const STORE = 'bancada-exercicios-v1';
const MAX_ANSWER = 6000;
type Store = Record<string, { a: string; v: Verdict | null }>;

function readStore(): Store {
  try {
    const v = JSON.parse(localStorage.getItem(STORE) ?? '{}');
    return v && typeof v === 'object' ? (v as Store) : {};
  } catch { return {}; }
}
function writeStore(id: string, a: string, v: Verdict | null): void {
  try {
    const s = readStore();
    s[id] = { a: a.slice(0, MAX_ANSWER), v };
    localStorage.setItem(STORE, JSON.stringify(s));
  } catch { /* modo privado / cota cheia: o exercício funciona sem salvar */ }
}

/** Seção de teoria ligada ao exercício (atalho “Dúvida?”). */
export interface TheoryLink { id: string; title: string }

const KIND_LABEL: Record<string, string> = {
  tree: 'árvore', sentences: 'derivações', choice: 'escolha', concept: 'dissertativa', build: 'construir gramática',
  outside: 'palavras fora de L(G)',
};

/**
 * Um exercício corrigível: o aluno responde, clica em "Corrigir" quantas vezes
 * quiser (editar a resposta só marca a correção como desatualizada) e pode ver
 * a resposta-modelo a qualquer momento. A resposta fica salva neste navegador.
 */
@Component({
  selector: 'app-exercise',
  standalone: true,
  imports: [TreeEditorComponent, RouterLink, SymBarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './exercise.component.html',
  styleUrl: './exercise.component.css',
})
export class ExerciseComponent {
  private readonly router = inject(Router);
  readonly ex = input.required<Exercise>();
  readonly theory = input<TheoryLink[]>([]);

  private readonly saved = computed(() => readStore()[this.ex().id] ?? null);
  private readonly edited = signal<string | null>(null);
  readonly answer = computed(() => this.edited() ?? this.saved()?.a ?? initialAnswer(this.ex()));
  readonly feedback = signal<Feedback | null>(null);
  readonly stale = signal(false);
  private readonly lastSet = signal<Verdict | null | undefined>(undefined);
  /** Último resultado: o desta sessão, ou o salvo da vez anterior. */
  readonly last = computed<Verdict | null>(() => { const v = this.lastSet(); return v !== undefined ? v : this.saved()?.v ?? null; });
  readonly showAns = signal(false);
  readonly pickPos = signal<number | null>(null);

  readonly kind = computed(() => this.ex().check.kind);
  readonly kindLabel = computed(() => {
    const c = this.ex().check;
    if (c.kind === 'derivation') return c.order === 'left' ? 'derivação mais à esquerda' : c.order === 'right' ? 'derivação mais à direita' : 'derivação';
    if (c.kind === 'automaton') return c.deterministic ? 'construir AFD' : 'construir AF';
    return KIND_LABEL[c.kind];
  });
  readonly grammar = computed(() => {
    const c = this.ex().check;
    return 'grammar' in c ? parseGrammar(c.grammar).grammar : null;
  });
  readonly wordTokens = computed(() => {
    const c = this.ex().check, g = this.grammar();
    if (!g || !('word' in c)) return null;
    const t = tokenizeForm(g, c.word);
    return 'tokens' in t ? t.tokens : null;
  });
  readonly options = computed(() => { const c = this.ex().check; return c.kind === 'choice' ? c.options : []; });
  readonly correctOption = computed(() => { const c = this.ex().check; return c.kind === 'choice' ? c.options[c.correct] : ''; });
  readonly canOpenLab = computed(() => this.kind() === 'derivation' || this.kind() === 'tree');
  readonly rows = computed(() => ({ derivation: 8, sentences: 12, concept: 4, build: 5, automaton: 9, outside: 4 } as Record<string, number>)[this.kind()] ?? 4);
  /** Botões de símbolo acima do campo: só onde o símbolo faz sentido (AFD não tem transição vazia). */
  readonly syms = computed<Sym[]>(() => {
    const c = this.ex().check;
    switch (c.kind) {
      case 'build': return [{ s: 'ε', label: 'vazio' }, { s: '→' }];
      case 'automaton': return c.deterministic ? [] : [{ s: 'ε', label: 'transição vazia' }];
      case 'outside': return [{ s: 'ε', label: 'palavra vazia' }];
      case 'derivation': case 'sentences': case 'tree': return [{ s: 'ε', label: 'vazio' }];
      default: return [];
    }
  });
  readonly typed = computed(() => (this.kind() === 'build' ? ['eps', '->'] : ['eps']));
  readonly placeholder = computed(() => ({
    derivation: 'Uma forma sentencial por linha (ou separadas por ⇒)',
    sentences: 'S\naSbSa\n…\n\n(linha em branco entre uma derivação e outra)',
    concept: 'Escreva a definição com suas palavras…',
    build: 'Uma regra por linha, ex.:\nS → aS | b',
    automaton: 'inicial: S\nfinais: B\nS a S\nS b B\n(uma transição por linha: origem símbolo destino)',
    outside: 'Uma palavra por linha (ε para a palavra vazia)',
  } as Record<string, string>)[this.kind()] ?? '');

  /** Última forma da derivação, para o "próximo passo" por clique. */
  readonly lastForm = computed<string[] | null>(() => {
    const g = this.grammar();
    if (!g || this.kind() !== 'derivation') return null;
    const d = checkDerivation(g, this.answer(), null);
    if (!d.steps.length) return [g.start];
    const s = d.steps[d.steps.length - 1];
    // só oferece "próximo passo" enquanto houver não terminal para trocar
    return s.status === 'error' || !s.tokens?.some((x) => isNT(g, x)) ? null : s.tokens;
  });
  readonly pickOptions = computed<Production[]>(() => {
    const g = this.grammar(), f = this.lastForm(), p = this.pickPos();
    return g && f && p !== null && isNT(g, f[p]) ? g.byLhs.get(f[p]) ?? [] : [];
  });

  setAnswer(v: string): void {
    const a = v.slice(0, MAX_ANSWER);
    this.edited.set(a);
    if (this.feedback()) this.stale.set(true);
    this.pickPos.set(null);
    writeStore(this.ex().id, a, this.last());
  }

  check(): void {
    const f = grade(this.ex(), this.answer());
    this.feedback.set(f);
    this.stale.set(false);
    this.lastSet.set(f.verdict);
    writeStore(this.ex().id, this.answer(), f.verdict);
  }

  reset(): void {
    this.edited.set(initialAnswer(this.ex()));
    this.feedback.set(null);
    this.stale.set(false);
    this.lastSet.set(null);
    this.pickPos.set(null);
    writeStore(this.ex().id, initialAnswer(this.ex()), null);
  }

  isNTsym(s: string): boolean { const g = this.grammar(); return !!g && isNT(g, s); }
  prodText(p: Production): string { return showProd(this.grammar(), p); }
  pick(i: number): void { this.pickPos.set(this.pickPos() === i ? null : i); }
  applyStep(p: Production): void {
    const g = this.grammar(), f = this.lastForm(), i = this.pickPos();
    if (!g || !f || i === null) return;
    const next = [...f.slice(0, i), ...p.rhs, ...f.slice(i + 1)];
    const base = this.answer().replace(/\s+$/, '') || g.start;
    this.setAnswer(`${base}\n${showForm(g, next)}`);
  }

  /** Leva gramática, palavra e resposta para a página de derivações (que lê o mesmo storage). */
  openInLab(): void {
    const c = this.ex().check;
    if (c.kind !== 'derivation' && c.kind !== 'tree') return;
    const start = this.grammar()?.start ?? '';
    const data = {
      preset: '', grammar: c.grammar, word: c.word,
      steps: c.kind === 'derivation' ? this.answer() : start,
      tree: c.kind === 'tree' ? this.answer() : start,
    };
    try { localStorage.setItem('bancada-derivacoes-v1', JSON.stringify(data)); } catch { /* segue sem levar */ }
    void this.router.navigate(['/derivacoes']);
  }
}
