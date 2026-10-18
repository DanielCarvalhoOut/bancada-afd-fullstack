import {
  ChangeDetectionStrategy, Component, ElementRef, HostListener, Injector, OnDestroy,
  afterNextRender, computed, effect, inject, signal, untracked, viewChild,
} from '@angular/core';
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
import { PdfDoc, PdfWindowService } from '../services/pdf-window.service';
import { INK_COLORS, INK_WIDTH, PdfInkService, pathOf } from '../services/pdf-ink.service';

type PdfJs = typeof import('pdfjs-dist');

/*
 * O pdf.js é carregado em tempo de execução a partir de /assets (copiado do
 * node_modules pelo angular.json), e não empacotado: o build ESM dele usa
 * top-level await, que o Angular com Zone.js não aceita. Bônus: os ~400 KB só
 * descem quando alguém abre um PDF.
 */
const PDFJS_BASE = '/assets/pdfjs/';
let pdfjsPromise: Promise<PdfJs> | null = null;
function loadPdfJs(): Promise<PdfJs> {
  if (!pdfjsPromise) {
    const url = PDFJS_BASE + 'pdf.min.mjs';
    pdfjsPromise = (import(/* @vite-ignore */ url) as Promise<PdfJs>).then((m) => {
      m.GlobalWorkerOptions.workerSrc = PDFJS_BASE + 'pdf.worker.min.mjs';
      return m;
    });
    pdfjsPromise.catch(() => (pdfjsPromise = null)); // permite tentar de novo
  }
  return pdfjsPromise;
}

const MIN_SCALE = 0.4;
const MAX_SCALE = 4;
const SNAP_PX = 28;
const ERASER_PX = 10;      // raio da borracha na tela, convertido para unidades do PDF
const MIN_STEP = 0.6;      // distância mínima entre pontos de um traço (unidades do PDF)
const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

/**
 * Janela flutuante de PDF: arrasta pelo título, encaixa à esquerda/direita
 * (soltando perto da borda ou pelos botões), redimensiona, e no celular vira
 * uma folha inferior. Zoom por botões, Ctrl+roda ou pinça; rolagem nativa.
 */
@Component({
  selector: 'app-pdf-window',
  standalone: true,
  templateUrl: './pdf-window.component.html',
  styleUrl: './pdf-window.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PdfWindowComponent implements OnDestroy {
  readonly svc = inject(PdfWindowService);
  readonly ink = inject(PdfInkService);
  readonly inkColors = INK_COLORS;
  readonly inkWidth = INK_WIDTH;
  /** Traço em andamento: desenhado à parte e só gravado ao soltar. */
  readonly live = signal<{ page: number; d: string } | null>(null);
  private readonly injector = inject(Injector);
  private readonly scroller = viewChild<ElementRef<HTMLDivElement>>('scroller');

  readonly status = signal<'loading' | 'ready' | 'error'>('loading');
  readonly pages = signal<{ w: number; h: number }[]>([]);
  readonly scale = signal(1);
  readonly fitWidth = signal(true);
  readonly current = signal(1);
  readonly snap = signal<'left' | 'right' | null>(null);
  readonly dragging = signal(false);
  readonly percent = computed(() => Math.round(this.scale() * 100));

  /** Posição explícita só no modo flutuante; encaixada e folha inferior são por CSS. */
  readonly box = computed(() => {
    if (this.svc.narrow() || this.svc.minimized() || this.svc.mode() !== 'float') return null;
    return this.svc.rect();
  });
  readonly dockStyleW = computed(() => (this.svc.narrow() || this.svc.mode() === 'float' ? null : this.svc.dockW()));

  private pdf: PDFDocumentProxy | null = null;
  private loadToken = 0;
  private renderToken = 0;
  private tasks: RenderTask[] = [];
  private renderTimer: ReturnType<typeof setTimeout> | null = null;
  private ro: ResizeObserver | null = null;
  private drag: { dx: number; dy: number } | null = null;
  private resize: { kind: 'corner' | 'edge'; x0: number; y0: number; w0: number; h0: number } | null = null;
  private pinch = new Map<number, { x: number; y: number }>();
  private pinchStart: { d: number; s: number } | null = null;
  private inkPointer: { id: number; page: number; svg: SVGSVGElement; w: number; h: number; pts: number[] } | null = null;

  constructor() {
    effect(() => {
      const d = this.svc.doc();
      if (d) untracked(() => { this.ink.load(d.id); void this.load(d); });
    }, { allowSignalWrites: true });

    afterNextRender(() => {
      this.onWindowResize(); // posição salva pode ser de uma tela maior
      const el = this.scroller()?.nativeElement;
      if (!el || typeof ResizeObserver === 'undefined') return;
      this.ro = new ResizeObserver(() => {
        if (this.fitWidth() && this.status() === 'ready') this.applyFit();
      });
      this.ro.observe(el);
    });
  }

  ngOnDestroy(): void {
    this.ro?.disconnect();
    if (this.renderTimer) clearTimeout(this.renderTimer);
    this.cancelRenders();
    void this.pdf?.destroy();
    this.pdf = null;
  }

  // ───────────────────────── carga e renderização ─────────────────────────
  private async load(d: PdfDoc): Promise<void> {
    const token = ++this.loadToken;
    this.cancelRenders();
    void this.pdf?.destroy();
    this.pdf = null;
    this.status.set('loading');
    this.pages.set([]);
    this.current.set(1);
    try {
      const pdfjs = await loadPdfJs();
      const doc = await pdfjs.getDocument({
        url: d.url,
        isEvalSupported: false,                        // nada de eval/new Function sobre conteúdo do PDF
        standardFontDataUrl: PDFJS_BASE + 'standard_fonts/',
      }).promise;
      if (token !== this.loadToken) { void doc.destroy(); return; }
      this.pdf = doc;
      const sizes: { w: number; h: number }[] = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const v = (await doc.getPage(i)).getViewport({ scale: 1 });
        sizes.push({ w: v.width, h: v.height });
      }
      if (token !== this.loadToken) return;
      this.pages.set(sizes);
      this.status.set('ready');
      afterNextRender(() => {
        if (this.fitWidth()) this.applyFit(); else this.scheduleRender(0);
      }, { injector: this.injector });
    } catch {
      if (token === this.loadToken) this.status.set('error');
    }
  }

  private cancelRenders(): void {
    this.renderToken++;
    for (const t of this.tasks) t.cancel();
    this.tasks = [];
  }

  private scheduleRender(delay = 140): void {
    if (this.renderTimer) clearTimeout(this.renderTimer);
    this.renderTimer = setTimeout(() => void this.renderAll(), delay);
  }

  /** Renderiza fora da tela e só então copia: o zoom não "pisca" em branco. */
  private async renderAll(): Promise<void> {
    const doc = this.pdf;
    const root = this.scroller()?.nativeElement;
    if (!doc || !root) return;
    this.cancelRenders();
    const token = this.renderToken;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const s = this.scale();
    const canvases = Array.from(root.querySelectorAll<HTMLCanvasElement>('canvas[data-page]'));
    for (const c of canvases) {
      if (token !== this.renderToken) return;
      const n = Number(c.dataset['page']);
      const page = await doc.getPage(n);
      const vp = page.getViewport({ scale: s * dpr });
      const off = document.createElement('canvas');
      off.width = Math.floor(vp.width);
      off.height = Math.floor(vp.height);
      const task = page.render({ canvasContext: off.getContext('2d')!, viewport: vp });
      this.tasks.push(task);
      try { await task.promise; } catch { return; } // cancelado por um zoom mais novo
      if (token !== this.renderToken) return;
      c.width = off.width;
      c.height = off.height;
      c.getContext('2d')!.drawImage(off, 0, 0);
    }
  }

  // ───────────────────────── zoom e páginas ─────────────────────────
  private applyFit(): void {
    const el = this.scroller()?.nativeElement;
    const maxW = Math.max(...this.pages().map((p) => p.w), 1);
    if (!el || el.clientWidth < 60) return; // minimizada/oculta: não recalcula
    const s = clamp((el.clientWidth - 24) / maxW, MIN_SCALE, MAX_SCALE);
    if (Math.abs(s - this.scale()) > 0.005 || !this.tasks.length) {
      this.scale.set(s);
      this.scheduleRender();
    }
  }

  fit(): void {
    this.fitWidth.set(true);
    this.applyFit();
  }

  zoomBy(f: number): void { this.zoomTo(this.scale() * f); }

  private zoomTo(target: number): void {
    const el = this.scroller()?.nativeElement;
    const s = clamp(target, MIN_SCALE, MAX_SCALE);
    if (!el || s === this.scale()) return;
    // mantém o centro da vista no mesmo ponto do documento
    const cy = (el.scrollTop + el.clientHeight / 2) / Math.max(el.scrollHeight, 1);
    const cx = (el.scrollLeft + el.clientWidth / 2) / Math.max(el.scrollWidth, 1);
    this.fitWidth.set(false);
    this.scale.set(s);
    afterNextRender(() => {
      el.scrollTop = cy * el.scrollHeight - el.clientHeight / 2;
      el.scrollLeft = cx * el.scrollWidth - el.clientWidth / 2;
    }, { injector: this.injector });
    this.scheduleRender();
  }

  onWheel(e: WheelEvent): void {
    if (!e.ctrlKey && !e.metaKey) return; // rolagem normal fica com o navegador
    e.preventDefault();
    this.zoomBy(e.deltaY < 0 ? 1.1 : 1 / 1.1);
  }

  onScroll(): void {
    const el = this.scroller()?.nativeElement;
    if (!el) return;
    const mid = el.scrollTop + el.clientHeight / 3;
    const pages = Array.from(el.querySelectorAll<HTMLElement>('.pg'));
    let cur = 1;
    for (const [i, p] of pages.entries()) if (p.offsetTop <= mid) cur = i + 1;
    if (cur !== this.current()) this.current.set(cur);
  }

  goTo(n: number): void {
    const el = this.scroller()?.nativeElement;
    const target = el?.querySelectorAll<HTMLElement>('.pg')[clamp(n, 1, this.pages().length) - 1];
    if (el && target) el.scrollTo({ top: target.offsetTop - 8, behavior: 'smooth' });
  }

  // pinça (dois dedos) — o CSS libera só pan, então o navegador não dá zoom na página inteira
  onPointerDown(e: PointerEvent): void {
    if (e.pointerType !== 'touch') return;
    this.pinch.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.pinch.size === 2) this.pinchStart = { d: this.pinchDist(), s: this.scale() };
  }
  onPointerMove(e: PointerEvent): void {
    if (!this.pinch.has(e.pointerId)) return;
    this.pinch.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.pinch.size === 2 && this.pinchStart) {
      this.zoomTo(this.pinchStart.s * (this.pinchDist() / Math.max(this.pinchStart.d, 1)));
    }
  }
  onPointerUp(e: PointerEvent): void {
    this.pinch.delete(e.pointerId);
    if (this.pinch.size < 2) this.pinchStart = null;
  }
  private pinchDist(): number {
    const [a, b] = [...this.pinch.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  // ───────────────────────── caneta ─────────────────────────
  /** Ponteiro na tela → coordenadas da página em unidades do PDF (independe do zoom). */
  private toPage(svg: SVGSVGElement, w: number, h: number, e: { clientX: number; clientY: number }): [number, number] {
    const r = svg.getBoundingClientRect();
    return [((e.clientX - r.left) / Math.max(r.width, 1)) * w, ((e.clientY - r.top) / Math.max(r.height, 1)) * h];
  }

  onInkDown(e: PointerEvent, page: number, w: number, h: number): void {
    const tool = this.ink.tool();
    if (!tool || (e.pointerType === 'mouse' && e.button !== 0)) return;
    e.stopPropagation(); // não deixa a pinça do scroller tratar o mesmo dedo
    if (this.inkPointer) { this.cancelInk(); return; } // segundo dedo: desiste do traço
    e.preventDefault();
    const svg = e.currentTarget as SVGSVGElement;
    svg.setPointerCapture(e.pointerId);
    const [x, y] = this.toPage(svg, w, h, e);
    this.inkPointer = { id: e.pointerId, page, svg, w, h, pts: [x, y] };
    if (tool === 'eraser') {
      this.ink.startGesture();
      this.ink.eraseAt(page, x, y, ERASER_PX / this.scale());
    } else {
      this.live.set({ page, d: pathOf([x, y]) });
    }
  }

  onInkMove(e: PointerEvent): void {
    const p = this.inkPointer;
    if (!p || e.pointerId !== p.id) return;
    e.stopPropagation();
    // eventos agrupados pelo navegador entre dois quadros: traço mais liso
    const events = e.getCoalescedEvents?.() ?? [];
    for (const ev of events.length ? events : [e]) {
      const [x, y] = this.toPage(p.svg, p.w, p.h, ev);
      if (this.ink.tool() === 'eraser') { this.ink.eraseAt(p.page, x, y, ERASER_PX / this.scale()); continue; }
      const n = p.pts.length;
      if (Math.hypot(x - p.pts[n - 2], y - p.pts[n - 1]) >= MIN_STEP) p.pts.push(x, y);
    }
    if (this.ink.tool() === 'pen') this.live.set({ page: p.page, d: pathOf(p.pts) });
  }

  onInkUp(e: PointerEvent): void {
    const p = this.inkPointer;
    if (!p || e.pointerId !== p.id) return;
    e.stopPropagation();
    if (this.ink.tool() === 'pen') this.ink.addStroke(p.page, p.pts);
    this.inkPointer = null;
    this.live.set(null);
  }

  cancelInk(): void {
    this.inkPointer = null;
    this.live.set(null);
  }

  // ───────────────────────── arrastar e encaixar ─────────────────────────
  onGrab(e: PointerEvent): void {
    if (this.svc.narrow() || e.button !== 0) return;
    if ((e.target as HTMLElement).closest('button, a')) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    let r = this.svc.rect();
    if (this.svc.mode() !== 'float') {
      // desencaixa: a janela "descola" da borda sob o ponteiro
      const w = Math.min(this.svc.dockW(), 520);
      const h = Math.min(window.innerHeight - 80, 640);
      r = { x: clamp(e.clientX - w / 2, 0, window.innerWidth - w), y: clamp(e.clientY - 18, 0, window.innerHeight - h), w, h };
      this.svc.setRect(r);
      this.svc.mode.set('float');
    }
    this.drag = { dx: e.clientX - r.x, dy: e.clientY - r.y };
    this.dragging.set(true);
  }

  onDrag(e: PointerEvent): void {
    if (!this.drag) return;
    const r = this.svc.rect();
    const x = clamp(e.clientX - this.drag.dx, -r.w + 120, window.innerWidth - 120);
    const y = clamp(e.clientY - this.drag.dy, 0, window.innerHeight - 44);
    this.svc.setRect({ ...r, x, y });
    this.snap.set(e.clientX < SNAP_PX ? 'left' : e.clientX > window.innerWidth - SNAP_PX ? 'right' : null);
  }

  onDrop(): void {
    if (!this.drag) return;
    this.drag = null;
    this.dragging.set(false);
    const s = this.snap();
    this.snap.set(null);
    if (s) this.svc.setMode(s); else this.svc.persist();
  }

  onResizeStart(e: PointerEvent, kind: 'corner' | 'edge'): void {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const r = this.svc.rect();
    this.resize = { kind, x0: e.clientX, y0: e.clientY, w0: kind === 'edge' ? this.svc.dockW() : r.w, h0: r.h };
    this.dragging.set(true);
  }

  onResizeMove(e: PointerEvent): void {
    const z = this.resize;
    if (!z) return;
    const dx = e.clientX - z.x0;
    if (z.kind === 'edge') {
      const w = this.svc.mode() === 'left' ? z.w0 + dx : z.w0 - dx;
      this.svc.setDockW(clamp(w, 280, window.innerWidth * 0.7));
    } else {
      const r = this.svc.rect();
      this.svc.setRect({ ...r, w: clamp(z.w0 + dx, 280, window.innerWidth - r.x), h: clamp(z.h0 + e.clientY - z.y0, 220, window.innerHeight - r.y) });
    }
  }

  onResizeEnd(): void {
    if (!this.resize) return;
    this.resize = null;
    this.dragging.set(false);
    this.svc.persist();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    const r = this.svc.rect();
    const w = Math.min(r.w, window.innerWidth);
    const h = Math.min(r.h, window.innerHeight);
    this.svc.setRect({ w, h, x: clamp(r.x, 0, window.innerWidth - Math.min(w, 120)), y: clamp(r.y, 0, window.innerHeight - 44) });
    this.svc.setDockW(clamp(this.svc.dockW(), 280, Math.max(280, window.innerWidth * 0.7)));
  }

  toggleMin(): void { this.svc.minimized.set(!this.svc.minimized()); }
}
