import { ChangeDetectionStrategy, Component, Injector, afterNextRender, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { ATIVIDADES } from '../../core/atividades';
import { PdfWindowService } from '../../core/services/pdf-window.service';
import { ThemeService } from '../../core/services/theme.service';
import { BlocksComponent } from '../../shared/blocks.component';
import { SiteNavComponent } from '../../shared/site-nav.component';
import { TheoryLink } from '../../shared/exercise.component';
import { EXERCICIOS } from '../teoria/pratica.content';
import { CHAPTERS, Chapter, Section } from '../teoria/teoria.content';

/** Uma questão da lista, pronta para a tela. */
interface Question {
  section: Section;
  num: string;          // "1", "5"
  title: string;        // título sem o "Questão N —"
  kinds: string[];      // tipos de exercício (etiquetas)
  theory: TheoryLink[]; // atalhos “Dúvida?”
  hasEx: boolean;
}

const THEORY_TITLE = new Map(CHAPTERS.flatMap((c) => c.sections.map((s) => [s.id, s.title] as const)));
/** Questão → lista, para links diretos (/exercicios/ex-glc-q5). */
const LIST_OF = new Map(EXERCICIOS.flatMap((c) => c.sections.map((s) => [s.id, c] as const)));
/** Ids que mudaram: links antigos continuam valendo. */
const ALIAS: Record<string, string> = { 'ex-glc-q5a8': 'ex-glc-q5' };
/** Lista → PDF de Atividades (Gramáticas e Regulares estão no mesmo PDF). */
const PDF_OF: Record<string, string> = { 'lista-gramaticas': 'lista-gramaticas', 'lista-gr': 'lista-gramaticas', 'lista-glc': 'lista-glc' };
const KIND: Record<string, string> = {
  derivation: 'derivação', tree: 'árvore', sentences: 'derivações', choice: 'escolha',
  concept: 'dissertativa', build: 'construir gramática', automaton: 'construir autômato', outside: 'fora de L(G)',
};

function toQuestion(s: Section): Question {
  const m = /^Quest(?:ão|ões)\s+(.+?)\s+—\s+(.+)$/.exec(s.title);
  const kinds = [...new Set(s.blocks.flatMap((b) => (b.t === 'ex' ? [KIND[b.ex.check.kind]] : [])))];
  return {
    section: s,
    num: m ? m[1] : '',
    title: m ? m[2].charAt(0).toUpperCase() + m[2].slice(1) : s.title,
    kinds: kinds.length ? kinds : ['resolvida'],
    theory: (s.theory ?? []).filter((id) => THEORY_TITLE.has(id)).map((id) => ({ id, title: THEORY_TITLE.get(id)! })),
    hasEx: kinds.length > 0,
  };
}
// conteúdo estático: calculado uma vez por carga do módulo (lazy)
const QUESTIONS = new Map<Chapter, Question[]>(EXERCICIOS.map((c) => [c, c.sections.map(toQuestion)]));

/**
 * Exercícios: uma aba por lista e, em cada lista, todas as questões
 * em sequência (derivações, árvores e questões teóricas juntas, na ordem do
 * PDF). Cada exercício tem atalho para a teoria do assunto.
 */
@Component({
  selector: 'app-exercicios',
  standalone: true,
  imports: [RouterLink, BlocksComponent, SiteNavComponent],
  templateUrl: './exercicios.component.html',
  styleUrl: './exercicios.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExerciciosComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly title = inject(Title);
  private readonly injector = inject(Injector);
  readonly theme = inject(ThemeService);
  readonly pdf = inject(PdfWindowService);

  readonly lists = EXERCICIOS;
  readonly list = signal<Chapter>(EXERCICIOS[0]);
  readonly questions = computed(() => QUESTIONS.get(this.list()) ?? []);
  readonly pdfDoc = computed(() => ATIVIDADES.find((a) => a.id === PDF_OF[this.list().id]) ?? null);
  private param: string | null = null;

  constructor() {
    this.route.paramMap
      .pipe(map((p) => p.get('id')), takeUntilDestroyed())
      .subscribe((id) => this.show(id));
  }

  count(c: Chapter): number { return QUESTIONS.get(c)?.length ?? 0; }

  /** O parâmetro vem da URL (entrada não confiável): só serve de chave em mapas fechados. */
  private show(raw: string | null): void {
    if (raw && ALIAS[raw]) {
      void this.router.navigate(['/exercicios', ALIAS[raw]], { replaceUrl: true });
      return;
    }
    this.param = raw;
    const id = raw;
    const asList = id ? EXERCICIOS.find((c) => c.id === id) : EXERCICIOS[0];
    const list = asList ?? (id ? LIST_OF.get(id) : undefined);
    if (!list) {
      void this.router.navigate(['/exercicios'], { replaceUrl: true });
      return;
    }
    this.list.set(list);
    this.title.setTitle(`Exercícios — ${list.title}`);
    this.scrollTo(asList ? null : id);
  }

  /** Atalho numerado: mesma URL não dispara a rota de novo, então rola direto. */
  go(q: Question): void {
    if (this.param === q.section.id) this.scrollTo(q.section.id);
    else void this.router.navigate(['/exercicios', q.section.id]);
  }

  private scrollTo(id: string | null): void {
    afterNextRender(() => {
      const el = id ? document.getElementById(id) : null;
      if (el) el.scrollIntoView({ block: 'start' });
      else window.scrollTo({ top: 0 });
    }, { injector: this.injector });
  }

  openPdf(): void {
    const d = this.pdfDoc();
    if (!d) return;
    this.pdf.setMode(this.pdf.narrow() ? 'float' : 'right');
    this.pdf.open(d);
  }
}
