import { Injectable, computed, signal } from '@angular/core';

export type InkTool = 'pen' | 'eraser';

/**
 * Um traço da caneta. Os pontos ficam em unidades do PDF (página em escala 1),
 * não em pixels de tela: assim o traço acompanha zoom, redimensionamento e a
 * troca entre janela flutuante e encaixada sem recálculo.
 */
export interface InkStroke {
  color: string;
  width: number;
  pts: number[]; // x0, y0, x1, y1, ...
  d: string;     // caminho SVG derivado de pts (não é salvo)
}

/** Traços de um documento, por número de página (1-based); página sem anotação não tem entrada. */
export type PageInk = Partial<Record<number, InkStroke[]>>;

export const INK_COLORS = [
  { value: '#1d4ed8', label: 'Azul' },
  { value: '#dc2626', label: 'Vermelho' },
  { value: '#111827', label: 'Preto' },
] as const;

/** Espessura em unidades do PDF; cresce junto com o zoom, como tinta no papel. */
export const INK_WIDTH = 2;

const KEY = 'bancada-pdf-ink-v1:';
const MAX_UNDO = 50;

const round = (v: number) => Math.round(v * 10) / 10;

export function pathOf(pts: number[]): string {
  if (pts.length < 2) return '';
  // um toque só vira um segmento de comprimento zero: com linecap round, um ponto
  let d = `M${round(pts[0])} ${round(pts[1])}`;
  if (pts.length === 2) return d + `L${round(pts[0])} ${round(pts[1])}`;
  for (let i = 2; i < pts.length; i += 2) d += `L${round(pts[i])} ${round(pts[i + 1])}`;
  return d;
}

/** Distância do ponto (px, py) ao segmento a–b. */
function distToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2)) : 0;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** A borracha em (x, y) com raio r encosta neste traço? */
export function hitsStroke(s: InkStroke, x: number, y: number, r: number): boolean {
  const reach = r + s.width / 2;
  const p = s.pts;
  if (p.length === 2) return Math.hypot(x - p[0], y - p[1]) <= reach;
  for (let i = 2; i < p.length; i += 2) {
    if (distToSegment(x, y, p[i - 2], p[i - 1], p[i], p[i + 1]) <= reach) return true;
  }
  return false;
}

/** Lê do localStorage descartando o que não tiver a forma esperada. */
function read(docId: string): PageInk {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY + docId) ?? 'null') as Record<string, unknown> | null;
    if (!raw || typeof raw !== 'object') return {};
    const colors: string[] = INK_COLORS.map((c) => c.value);
    const out: PageInk = {};
    for (const [page, list] of Object.entries(raw)) {
      const n = Number(page);
      if (!Number.isInteger(n) || n < 1 || !Array.isArray(list)) continue;
      const strokes: InkStroke[] = [];
      for (const s of list as { c?: unknown; w?: unknown; p?: unknown }[]) {
        const pts = Array.isArray(s?.p) && s.p.length >= 2 && s.p.length % 2 === 0 && s.p.every((v) => Number.isFinite(v))
          ? (s.p as number[]) : null;
        if (!pts) continue;
        const color = typeof s.c === 'string' && colors.includes(s.c) ? s.c : INK_COLORS[0].value;
        const width = typeof s.w === 'number' && s.w > 0 && s.w < 50 ? s.w : INK_WIDTH;
        strokes.push({ color, width, pts, d: pathOf(pts) });
      }
      if (strokes.length) out[n] = strokes;
    }
    return out;
  } catch { return {}; }
}

function write(docId: string, ink: PageInk): void {
  try {
    const data: Record<number, { c: string; w: number; p: number[] }[]> = {};
    for (const [page, list] of Object.entries(ink)) {
      if (list?.length) data[Number(page)] = list.map((s) => ({ c: s.color, w: s.width, p: s.pts.map(round) }));
    }
    if (Object.keys(data).length) localStorage.setItem(KEY + docId, JSON.stringify(data));
    else localStorage.removeItem(KEY + docId);
  } catch { /* modo privado ou cota cheia: a anotação vale só nesta aba */ }
}

/**
 * Anotações à mão livre sobre a janela de PDF. Ficam salvas neste navegador,
 * por documento; o arquivo PDF em si não é alterado.
 */
@Injectable({ providedIn: 'root' })
export class PdfInkService {
  readonly tool = signal<InkTool | null>(null);
  readonly color = signal<string>(INK_COLORS[0].value);
  readonly pages = signal<PageInk>({});
  private readonly history = signal<PageInk[]>([]);
  readonly canUndo = computed(() => this.history().length > 0);
  readonly hasInk = computed(() => Object.values(this.pages()).some((l) => !!l?.length));

  private docId: string | null = null;
  private gestureSaved = false;

  /** Troca de documento: carrega as anotações dele e desliga a ferramenta. */
  load(docId: string): void {
    this.docId = docId;
    this.pages.set(read(docId));
    this.history.set([]);
    this.tool.set(null);
  }

  usePen(color?: string): void {
    if (color) this.color.set(color);
    this.tool.set('pen');
  }
  togglePen(): void { this.tool.set(this.tool() === 'pen' ? null : 'pen'); }
  toggleEraser(): void { this.tool.set(this.tool() === 'eraser' ? 'pen' : 'eraser'); }

  addStroke(page: number, pts: number[]): void {
    const stroke: InkStroke = { color: this.color(), width: INK_WIDTH, pts, d: pathOf(pts) };
    const cur = this.pages();
    this.commit({ ...cur, [page]: [...(cur[page] ?? []), stroke] });
  }

  /** Marca o início de um gesto da borracha: o gesto inteiro vira um só passo de desfazer. */
  startGesture(): void { this.gestureSaved = false; }

  /** Apaga os traços inteiros que a borracha tocar. */
  eraseAt(page: number, x: number, y: number, radius: number): void {
    const cur = this.pages();
    const list = cur[page];
    if (!list?.length) return;
    const keep = list.filter((s) => !hitsStroke(s, x, y, radius));
    if (keep.length === list.length) return;
    this.commit({ ...cur, [page]: keep }, !this.gestureSaved);
    this.gestureSaved = true;
  }

  undo(): void {
    const h = this.history();
    if (!h.length) return;
    this.pages.set(h[h.length - 1]);
    this.history.set(h.slice(0, -1));
    this.save();
  }

  /** Limpa o documento todo; dá para desfazer. */
  clear(): void {
    if (this.hasInk()) this.commit({});
  }

  private commit(next: PageInk, snapshot = true): void {
    if (snapshot) this.history.set([...this.history(), this.pages()].slice(-MAX_UNDO));
    this.pages.set(next);
    this.save();
  }

  private save(): void {
    if (this.docId) write(this.docId, this.pages());
  }
}
