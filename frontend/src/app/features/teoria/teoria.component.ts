import { ChangeDetectionStrategy, Component, HostListener, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { ThemeService } from '../../core/services/theme.service';
import { BlocksComponent } from '../../shared/blocks.component';
import { SiteNavComponent } from '../../shared/site-nav.component';
import { Block, CHAPTERS, Chapter, Section } from './teoria.content';

/** Parte do livro. Os exercícios resolvidos ganharam página própria (/exercicios); fica só a teoria. */
export interface Part {
  id: 'teoria';
  label: string;         // título da aba
  short: string;         // rótulo curto (topbar, resultados de busca)
  chapterWord: string;   // "Capítulo" / "Lista"
  prefix: string;        // prefixo da numeração: "4.2" / "E1.2"
  chapters: Chapter[];
}

const PARTS: Part[] = [
  { id: 'teoria', label: 'Conteúdos teóricos', short: 'Teoria', chapterWord: 'Capítulo', prefix: '', chapters: CHAPTERS },
];

/** Seção "achatada": posição no livro + texto normalizado para a busca. */
interface Entry {
  index: number;      // posição global (0..N-1)
  part: Part;
  partIndex: number;  // posição dentro da parte, para anterior/próxima e rodapé
  num: string;        // "4.2" ou "E1.2"
  chapterNum: string; // "4" ou "E1"
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
    case 'ex': return `${b.ex.label} ${b.ex.prompt}`;
    case 'sol': return b.blocks.map(blockText).join(' ');
  }
}

// O conteúdo é estático: o índice e os layouts das figuras são calculados uma
// única vez por carga do módulo (que é lazy), não a cada detecção de mudança.
const ENTRIES: Entry[] = PARTS.flatMap((part) =>
  part.chapters.flatMap((chapter, ci) =>
    chapter.sections.map((section, si) => ({
      index: 0,
      part,
      partIndex: 0,
      num: `${part.prefix}${ci + 1}.${si + 1}`,
      chapterNum: `${part.prefix}${ci + 1}`,
      chapter,
      section,
      haystack: norm([chapter.title, section.title, ...section.blocks.map(blockText)].join(' ')),
    })),
  ).map((e, partIndex) => ({ ...e, partIndex })),
).map((e, index) => ({ ...e, index }));

const BY_ID = new Map(ENTRIES.map((e) => [e.section.id, e]));
/** Total de seções por parte (rodapé "Seção x de n"). */
const PART_TOTAL = new Map(PARTS.map((p) => [p.id, ENTRIES.filter((e) => e.part === p).length]));

/**
 * Livro de teoria: índice por capítulos, leitura por seção (uma rota por seção,
 * então dá para favoritar/compartilhar o link de um tópico) e figuras que são
 * autômatos reais, abríveis na bancada.
 */
@Component({
  selector: 'app-teoria',
  standalone: true,
  imports: [RouterLink, BlocksComponent, SiteNavComponent],
  templateUrl: './teoria.component.html',
  styleUrl: './teoria.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeoriaComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly title = inject(Title);
  readonly theme = inject(ThemeService);


  readonly current = signal<Entry>(ENTRIES[0]);
  readonly part = computed(() => this.current().part);
  readonly partTotal = computed(() => PART_TOTAL.get(this.part().id) ?? 0);
  // anterior/próxima não atravessam de uma parte para a outra
  readonly prev = computed(() => this.sibling(-1));
  readonly next = computed(() => this.sibling(1));
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
    // Exercícios resolvidos moraram aqui (/teoria/ex-…): links antigos vão para a página nova.
    if (sec?.startsWith('ex-')) {
      void this.router.navigate(['/exercicios', sec], { replaceUrl: true });
      return;
    }
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
    this.title.setTitle(`${hit.num} ${hit.section.title} — ${hit.part.short}`);
    this.writeLast(hit.section.id);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0 });
  }

  private sibling(step: 1 | -1): Entry | null {
    const e = ENTRIES[this.current().index + step];
    return e && e.part === this.part() ? e : null;
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
