import { ChangeDetectionStrategy, Component, HostListener, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { EditorStateService } from '../../core/services/editor-state.service';
import { ThemeService } from '../../core/services/theme.service';
import { AutomatonModel } from '../../domain/automaton';
import { computeLayout, Layout, R } from '../../domain/render';
import { Block, CHAPTERS, Chapter, NoteKind, Section } from './teoria.content';

/** Seção "achatada": posição no livro + texto normalizado para a busca. */
interface Entry {
  index: number;      // posição global (0..N-1), para anterior/próxima
  num: string;        // "4.2"
  chapterNum: number; // 4
  chapter: Chapter;
  section: Section;
  haystack: string;   // texto sem tags/acentos, minúsculo
}

const LAST_KEY = 'bancada-teoria-last';

/** Minúsculas, sem acentos, sem tags HTML — busca tolerante ("afn" acha "AFN", "funcao" acha "função"). */
function norm(s: string): string {
  return s.replace(/<[^>]*>/g, ' ').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function blockText(b: Block): string {
  switch (b.t) {
    case 'p': return b.html;
    case 'h': return b.text;
    case 'list': return b.items.join(' ');
    case 'table': return [...b.head, ...b.rows.flat()].join(' ');
    case 'code': return b.text;
    case 'note': return `${b.title ?? ''} ${b.html}`;
    case 'fig': return b.caption;
  }
}

// O conteúdo é estático: o índice e os layouts das figuras são calculados uma
// única vez por carga do módulo (que é lazy), não a cada detecção de mudança.
const ENTRIES: Entry[] = CHAPTERS.flatMap((chapter, ci) =>
  chapter.sections.map((section, si) => ({
    index: 0,
    num: `${ci + 1}.${si + 1}`,
    chapterNum: ci + 1,
    chapter,
    section,
    haystack: norm([chapter.title, section.title, ...section.blocks.map(blockText)].join(' ')),
  })),
).map((e, index) => ({ ...e, index }));

const BY_ID = new Map(ENTRIES.map((e) => [e.section.id, e]));
type FigLayout = Layout & { w: number; h: number };
const LAYOUTS = new WeakMap<AutomatonModel, FigLayout>();

/**
 * O viewBox padrão do motor tem folga para edição; numa figura de livro isso
 * vira faixa vazia. Recorta para o que é desenhado: estados, laços (acima do
 * estado), rótulos das arestas (que ficam no ponto de controle da curva) e a
 * seta de início.
 */
function tight(l: Layout): FigLayout {
  const xs: number[] = [], ys: number[] = [];
  for (const n of l.nodes) { xs.push(n.x - R, n.x + R); ys.push(n.y - R, n.y + R); }
  for (const e of l.edges) { xs.push(e.lx - e.labelW / 2, e.lx + e.labelW / 2); ys.push(e.ly - 10, e.ly + 10); }
  if (l.start) xs.push(l.start.x1);
  if (!xs.length) return { ...l, w: 0, h: 0 };
  const pad = 14;
  const x = Math.min(...xs) - pad, y = Math.min(...ys) - pad;
  const w = Math.max(...xs) + pad - x, h = Math.max(...ys) + pad - y;
  return { ...l, viewBox: `${x} ${y} ${w} ${h}`, w, h };
}

const NOTE_LABEL: Record<NoteKind, string> = { def: 'Definição', tip: 'Dica', warn: 'Cuidado', ex: 'Exemplo' };

/**
 * Livro de teoria: índice por capítulos, leitura por seção (uma rota por seção,
 * então dá para favoritar/compartilhar o link de um tópico) e figuras que são
 * autômatos reais, abríveis na bancada.
 */
@Component({
  selector: 'app-teoria',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './teoria.component.html',
  styleUrl: './teoria.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeoriaComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly title = inject(Title);
  private readonly editor = inject(EditorStateService);
  readonly theme = inject(ThemeService);

  readonly chapters = CHAPTERS;
  readonly total = ENTRIES.length;
  readonly noteLabel = NOTE_LABEL;

  readonly current = signal<Entry>(ENTRIES[0]);
  readonly prev = computed(() => ENTRIES[this.current().index - 1] ?? null);
  readonly next = computed(() => ENTRIES[this.current().index + 1] ?? null);
  /** É a primeira seção do capítulo? (mostra o resumo do capítulo como abertura) */
  readonly opensChapter = computed(() => this.current().section === this.current().chapter.sections[0]);

  readonly query = signal('');
  readonly results = computed<Entry[] | null>(() => {
    const terms = norm(this.query()).split(/\s+/).filter((t) => t.length >= 2);
    if (!terms.length) return null;
    return ENTRIES.filter((e) => terms.every((t) => e.haystack.includes(t))).slice(0, 40);
  });

  /** Índice lateral aberto (só faz diferença no celular, onde ele vira gaveta). */
  readonly tocOpen = signal(false);

  constructor() {
    // takeUntilDestroyed encerra a inscrição junto com o componente (sem vazamento).
    this.route.paramMap
      .pipe(map((p) => p.get('sec')), takeUntilDestroyed())
      .subscribe((sec) => this.show(sec));
  }

  private show(sec: string | null): void {
    // O parâmetro vem da URL (entrada não confiável): só é usado como chave de
    // um Map fechado. Desconhecido/ausente → última seção lida ou a primeira.
    const hit = sec ? BY_ID.get(sec) : undefined;
    if (!hit) {
      const fallback = BY_ID.get(this.readLast() ?? '') ?? ENTRIES[0];
      void this.router.navigate(['/teoria', fallback.section.id], { replaceUrl: true });
      return;
    }
    this.current.set(hit);
    this.tocOpen.set(false);
    this.title.setTitle(`${hit.num} ${hit.section.title} — Teoria`);
    this.writeLast(hit.section.id);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0 });
  }

  chapterNum(c: Chapter): number { return CHAPTERS.indexOf(c) + 1; }

  layout(m: AutomatonModel): FigLayout {
    let l = LAYOUTS.get(m);
    if (!l) { l = tight(computeLayout(m, {})); LAYOUTS.set(m, l); }
    return l;
  }

  /** Abre a figura no painel de referência da bancada — não mexe no que está em edição. */
  asReference(m: AutomatonModel, caption: string): void {
    this.editor.queueReference(caption, m.kind ?? 'afd', m);
    void this.router.navigate(['/bancada']);
  }

  /** Carrega a figura como o autômato em edição (substitui o atual daquele espaço). */
  toEdit(m: AutomatonModel): void {
    const kind = m.kind ?? 'afd';
    if (!confirm(`Isso substitui o ${kind.toUpperCase()} que está na bancada. Para não perder nada, use "Referência". Continuar?`)) return;
    this.editor.space = kind;
    this.editor.queueModel(kind, m);
    void this.router.navigate(['/bancada']);
  }

  clearSearch(): void { this.query.set(''); }

  @HostListener('document:keydown', ['$event'])
  onKey(ev: KeyboardEvent): void {
    const el = ev.target as HTMLElement | null;
    const typing = !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
    if (ev.key === 'Escape') {
      if (this.tocOpen()) this.tocOpen.set(false);
      else if (typing && this.query()) this.clearSearch();
      return;
    }
    if (typing || ev.altKey || ev.ctrlKey || ev.metaKey) return;
    if (ev.key === '/') {
      ev.preventDefault();
      document.getElementById('teoria-busca')?.focus();
      return;
    }
    const target = ev.key === 'ArrowRight' ? this.next() : ev.key === 'ArrowLeft' ? this.prev() : null;
    if (target) void this.router.navigate(['/teoria', target.section.id]);
  }

  private readLast(): string | null {
    try { return localStorage.getItem(LAST_KEY); } catch { return null; }
  }
  private writeLast(id: string): void {
    try { localStorage.setItem(LAST_KEY, id); } catch { /* modo privado etc. */ }
  }
}
