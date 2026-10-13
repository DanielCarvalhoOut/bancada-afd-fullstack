import { Injectable, computed, signal } from '@angular/core';
import { ATIVIDADES } from '../atividades';

export interface PdfDoc {
  id: string;
  title: string;
  url: string;       // sempre um caminho do próprio app (assets/public), nunca vindo da URL
  fileName: string;
}

export type DockMode = 'float' | 'left' | 'right';
export interface Rect { x: number; y: number; w: number; h: number }

const KEY = 'bancada-pdf-window-v1';
const NARROW = '(max-width: 760px)';

interface Saved { mode: DockMode; rect: Rect; dockW: number; docId: string | null }

function read(): Saved | null {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<Saved> | null;
    if (!v) return null;
    const n = (x: unknown, d: number) => (typeof x === 'number' && Number.isFinite(x) ? x : d);
    const mode: DockMode = v.mode === 'left' || v.mode === 'float' ? v.mode : 'right';
    const r = v.rect ?? ({} as Rect);
    const docId = typeof v.docId === 'string' ? v.docId : null;
    return { mode, rect: { x: n(r.x, 80), y: n(r.y, 80), w: n(r.w, 460), h: n(r.h, 560) }, dockW: n(v.dockW, 440), docId };
  } catch { return null; }
}

/**
 * Estado global da janela de PDF. Fica fora das páginas para a janela
 * sobreviver à navegação: dá para ler a lista na lateral enquanto se monta o
 * autômato na bancada ou a derivação.
 */
@Injectable({ providedIn: 'root' })
export class PdfWindowService {
  private readonly saved = read();
  // Reabre o PDF que estava aberto antes de recarregar. O id salvo só serve de
  // chave numa lista fechada: a URL nunca vem do storage.
  readonly doc = signal<PdfDoc | null>(ATIVIDADES.find((a) => a.id === this.saved?.docId) ?? null);
  readonly mode = signal<DockMode>(this.saved?.mode ?? 'right');
  readonly rect = signal<Rect>(this.saved?.rect ?? { x: 80, y: 80, w: 460, h: 560 });
  readonly dockW = signal(this.saved?.dockW ?? 440);
  readonly minimized = signal(false);
  readonly narrow = signal(typeof matchMedia !== 'undefined' && matchMedia(NARROW).matches);

  /** Faixa da tela ocupada por uma janela encaixada (o conteúdo da página encolhe). */
  readonly inset = computed<{ left: number; right: number }>(() => {
    if (!this.doc() || this.minimized() || this.narrow() || this.mode() === 'float') return { left: 0, right: 0 };
    return this.mode() === 'left' ? { left: this.dockW(), right: 0 } : { left: 0, right: this.dockW() };
  });

  constructor() {
    if (typeof matchMedia !== 'undefined') {
      // serviço raiz: vive o app inteiro, então o listener não precisa de remoção
      matchMedia(NARROW).addEventListener('change', (e) => this.narrow.set(e.matches));
    }
  }

  open(doc: PdfDoc): void {
    this.doc.set(doc);
    this.minimized.set(false);
    this.persist();
  }
  close(): void { this.doc.set(null); this.persist(); }
  setMode(m: DockMode): void { this.mode.set(m); this.minimized.set(false); this.persist(); }
  setRect(r: Rect): void { this.rect.set(r); }
  setDockW(w: number): void { this.dockW.set(w); }

  persist(): void {
    try {
      localStorage.setItem(KEY, JSON.stringify({ mode: this.mode(), rect: this.rect(), dockW: this.dockW(), docId: this.doc()?.id ?? null }));
    } catch { /* modo privado */ }
  }
}
