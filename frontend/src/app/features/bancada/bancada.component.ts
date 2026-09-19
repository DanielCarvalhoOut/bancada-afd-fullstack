import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AutomataService } from '../../core/services/automata.service';
import { EditorStateService } from '../../core/services/editor-state.service';
import { ThemeService } from '../../core/services/theme.service';
import {
  AutomatonKind, AutomatonModel, Determinization, SavedAutomaton,
} from '../../core/models/api.model';
import {
  ALPHABET, EPS, determinize as localDeterminize, determinismIssues,
  getState, realSymbols, simulateNfa, trace as localTrace,
} from '../../domain/automaton';
import { computeLayout, Layout, R } from '../../domain/render';

type Mode = 'idle' | 'addState' | 'addTrans' | 'select';
const STORAGE = 'bancada-aut-v2';

function emptyPair(): Record<AutomatonKind, AutomatonModel> {
  return { afd: { kind: 'afd', states: [], transitions: [] }, afn: { kind: 'afn', states: [], transitions: [] } };
}

@Component({
  selector: 'app-bancada',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './bancada.component.html',
  styleUrl: './bancada.component.css',
})
export class BancadaComponent implements OnInit {
  @ViewChild('stage', { static: true }) stageRef!: ElementRef<SVGSVGElement>;

  space: AutomatonKind = 'afd';
  automata: Record<AutomatonKind, AutomatonModel> = emptyPair();

  mode: Mode = 'idle';
  selected: string | null = null;
  selectedEdge: string | null = null;
  pendingFrom: string | null = null;
  multi: string[] = [];
  active: string[] = [];               // destaque de simulação
  view = { x: 0, y: 0, w: 1200, h: 800 };

  tab: 'props' | 'analise' = 'props';

  // picker de símbolos
  picker: { from: string; to: string; chosen: string[] } | null = null;

  // modais
  simModal = false;
  simWord = '';
  simHtml = '';
  detModal = false;
  det: Determinization | null = null;
  ioModal: 'export' | 'import' | null = null;
  ioText = '';
  libModal = false;
  library: SavedAutomaton[] = [];
  libError = '';

  private drag: { id: string; dx: number; dy: number } | null = null;
  private marquee: { x1: number; y1: number; x2: number; y2: number } | null = null;

  constructor(
    private automataSvc: AutomataService,
    private editor: EditorStateService,
    public theme: ThemeService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.space = this.editor.space;
    this.load();
    const pending = this.editor.takePending();
    if (pending) {
      this.space = pending.kind;
      this.automata[pending.kind] = { ...pending.model, kind: pending.kind };
    }
    this.seedIfEmpty();
    this.persist();
    this.fit();
  }

  // ---------- modelo ativo ----------
  get model(): AutomatonModel { return this.automata[this.space]; }

  // ---------- persistência local ----------
  private persist(): void {
    try { localStorage.setItem(STORAGE, JSON.stringify(this.automata)); } catch { /* ignora */ }
  }
  private load(): void {
    try {
      const raw = localStorage.getItem(STORAGE);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data?.afd && data?.afn) {
        this.automata = {
          afd: { kind: 'afd', states: data.afd.states ?? [], transitions: data.afd.transitions ?? [] },
          afn: { kind: 'afn', states: data.afn.states ?? [], transitions: data.afn.transitions ?? [] },
        };
      }
    } catch { /* ignora */ }
  }
  private touch(): void { this.persist(); }

  private nextId(): string {
    let max = -1;
    for (const s of this.model.states) {
      const n = parseInt(s.id.replace(/^\D+/, ''), 10);
      if (!isNaN(n) && n > max) max = n;
    }
    return 's' + (max + 1);
  }

  // ---------- espaço ----------
  switchSpace(sp: AutomatonKind): void {
    if (sp === this.space) return;
    this.space = sp;
    this.editor.space = sp;
    this.reset();
    this.seedIfEmpty();
    this.fit();
  }
  private reset(): void {
    this.selected = null; this.selectedEdge = null; this.pendingFrom = null;
    this.multi = []; this.active = []; this.mode = 'idle'; this.picker = null;
  }

  // ---------- layout ----------
  get layout(): Layout {
    return computeLayout(this.model, {
      selectedNode: this.selected ?? undefined,
      selectedEdge: this.selectedEdge ?? undefined,
      multi: this.multi,
      pendingFrom: this.pendingFrom ?? undefined,
      active: this.active,
      view: `${this.view.x} ${this.view.y} ${this.view.w} ${this.view.h}`,
    });
  }
  get marqueeRect() {
    if (!this.marquee) return null;
    const m = this.marquee;
    return { x: Math.min(m.x1, m.x2), y: Math.min(m.y1, m.y2), w: Math.abs(m.x2 - m.x1), h: Math.abs(m.y2 - m.y1) };
  }
  get issues() { return determinismIssues(this.model); }
  get pickerSyms(): string[] { return this.space === 'afn' ? [...ALPHABET, EPS] : [...ALPHABET]; }
  get hint(): string {
    switch (this.mode) {
      case 'addState': return 'Clique na tela para posicionar um estado.';
      case 'addTrans': return 'Clique na ORIGEM e depois no DESTINO. Mesmo estado duas vezes = auto-laço.';
      case 'select': return 'Arraste sobre a tela para selecionar vários; Delete exclui a seleção.';
      default: return '';
    }
  }

  // ---------- coordenadas ----------
  private toSVG(evt: { clientX: number; clientY: number }): { x: number; y: number } {
    const svg = this.stageRef.nativeElement;
    const pt = svg.createSVGPoint();
    pt.x = evt.clientX; pt.y = evt.clientY;
    const m = svg.getScreenCTM();
    if (!m) return { x: 0, y: 0 };
    const p = pt.matrixTransform(m.inverse());
    return { x: p.x, y: p.y };
  }

  // ---------- modos ----------
  setMode(m: Mode): void {
    this.mode = this.mode === m ? 'idle' : m;
    this.pendingFrom = null; this.marquee = null;
    if (this.mode !== 'select') this.multi = [];
  }

  // ---------- pointer ----------
  onDown(evt: PointerEvent): void {
    const target = evt.target as Element;
    const nodeId = target.closest('[data-node]')?.getAttribute('data-node') ?? null;
    const edgeKey = target.getAttribute?.('data-edge') ?? null;

    if (this.mode === 'addState') {
      if (!nodeId) {
        const p = this.toSVG(evt);
        const id = this.nextId();
        this.model.states.push({ id, name: 'q' + this.model.states.length, initial: this.model.states.length === 0, accepting: false, x: p.x, y: p.y });
        this.selected = id; this.selectedEdge = null; this.touch();
      }
      return;
    }
    if (this.mode === 'addTrans') {
      if (nodeId) {
        if (!this.pendingFrom) this.pendingFrom = nodeId;
        else this.openPicker(this.pendingFrom, nodeId);
      }
      return;
    }
    if (this.mode === 'select') {
      if (nodeId) {
        const i = this.multi.indexOf(nodeId);
        if (i >= 0) this.multi.splice(i, 1); else this.multi.push(nodeId);
        this.selected = null; this.selectedEdge = null;
      } else {
        const p = this.toSVG(evt);
        this.marquee = { x1: p.x, y1: p.y, x2: p.x, y2: p.y };
        this.stageRef.nativeElement.setPointerCapture(evt.pointerId);
      }
      return;
    }
    // idle
    if (nodeId) {
      this.selected = nodeId; this.selectedEdge = null;
      const s = this.model.states.find((x) => x.id === nodeId)!;
      const p = this.toSVG(evt);
      this.drag = { id: nodeId, dx: s.x - p.x, dy: s.y - p.y };
      this.stageRef.nativeElement.setPointerCapture(evt.pointerId);
    } else if (edgeKey) {
      this.selectedEdge = edgeKey; this.selected = null;
    } else {
      this.selected = null; this.selectedEdge = null;
    }
  }
  onMove(evt: PointerEvent): void {
    if (this.marquee) {
      const p = this.toSVG(evt);
      this.marquee.x2 = p.x; this.marquee.y2 = p.y;
      const mnX = Math.min(this.marquee.x1, p.x), mxX = Math.max(this.marquee.x1, p.x);
      const mnY = Math.min(this.marquee.y1, p.y), mxY = Math.max(this.marquee.y1, p.y);
      this.multi = this.model.states.filter((s) => s.x >= mnX && s.x <= mxX && s.y >= mnY && s.y <= mxY).map((s) => s.id);
      return;
    }
    if (!this.drag) return;
    const s = this.model.states.find((x) => x.id === this.drag!.id);
    if (!s) return;
    const p = this.toSVG(evt);
    s.x = p.x + this.drag.dx; s.y = p.y + this.drag.dy;
  }
  onUp(evt: PointerEvent): void {
    if (this.marquee) { this.marquee = null; try { this.stageRef.nativeElement.releasePointerCapture(evt.pointerId); } catch { /* noop */ } return; }
    if (this.drag) { try { this.stageRef.nativeElement.releasePointerCapture(evt.pointerId); } catch { /* noop */ } this.drag = null; this.touch(); }
  }

  // ---------- transições / picker ----------
  private findEdge(from: string, to: string) { return this.model.transitions.find((t) => t.from === from && t.to === to); }
  openPicker(from: string, to: string): void {
    const ex = this.findEdge(from, to);
    this.picker = { from, to, chosen: ex ? [...ex.symbols] : [] };
  }
  toggleSym(sym: string): void {
    if (!this.picker) return;
    const i = this.picker.chosen.indexOf(sym);
    if (i >= 0) this.picker.chosen.splice(i, 1); else this.picker.chosen.push(sym);
  }
  confirmPicker(): void {
    if (this.picker && this.picker.chosen.length) {
      let e = this.findEdge(this.picker.from, this.picker.to);
      if (!e) { e = { from: this.picker.from, to: this.picker.to, symbols: [] }; this.model.transitions.push(e); }
      for (const s of this.picker.chosen) if (!e.symbols.includes(s)) e.symbols.push(s);
      e.symbols.sort();
      this.touch();
    }
    this.picker = null; this.pendingFrom = null;
  }
  cancelPicker(): void { this.picker = null; this.pendingFrom = null; }

  // ---------- propriedades ----------
  get selState() { return this.model.states.find((s) => s.id === this.selected) ?? null; }
  get selEdge() {
    if (!this.selectedEdge) return null;
    const [from, to] = this.selectedEdge.split('>');
    return this.findEdge(from, to) ?? null;
  }
  edgeEndpoints(): { from: string; to: string } | null {
    const e = this.selEdge; if (!e) return null;
    return { from: getState(this.model, e.from)?.name ?? '?', to: getState(this.model, e.to)?.name ?? '?' };
  }
  rename(name: string): void { const s = this.selState; if (s) { s.name = name; this.touch(); } }
  toggleInitial(): void { const s = this.selState; if (!s) return; const on = !s.initial; this.model.states.forEach((x) => (x.initial = false)); s.initial = on; this.touch(); }
  toggleAccepting(): void { const s = this.selState; if (s) { s.accepting = !s.accepting; this.touch(); } }
  toggleEdgeSym(sym: string): void {
    const e = this.selEdge; if (!e) return;
    const i = e.symbols.indexOf(sym);
    if (i >= 0) e.symbols.splice(i, 1); else e.symbols.push(sym);
    e.symbols.sort();
    if (!e.symbols.length) { this.model.transitions = this.model.transitions.filter((t) => t !== e); this.selectedEdge = null; }
    this.touch();
  }
  outsOf(id: string) {
    return this.model.transitions
      .filter((t) => t.from === id && t.symbols.length)
      .map((t) => ({ syms: t.symbols.join(','), to: getState(this.model, t.to)?.name ?? '?' }));
  }
  deleteSelected(): void {
    if (this.multi.length) {
      const set = new Set(this.multi);
      this.model.states = this.model.states.filter((s) => !set.has(s.id));
      this.model.transitions = this.model.transitions.filter((t) => !set.has(t.from) && !set.has(t.to));
      this.multi = [];
    } else if (this.selected) {
      const id = this.selected;
      this.model.states = this.model.states.filter((s) => s.id !== id);
      this.model.transitions = this.model.transitions.filter((t) => t.from !== id && t.to !== id);
      this.selected = null;
    } else if (this.selectedEdge) {
      const [from, to] = this.selectedEdge.split('>');
      this.model.transitions = this.model.transitions.filter((t) => !(t.from === from && t.to === to));
      this.selectedEdge = null;
    }
    this.touch();
  }

  @HostListener('window:keydown', ['$event'])
  onKey(e: KeyboardEvent): void {
    const tag = (document.activeElement as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if ((e.key === 'Delete' || e.key === 'Backspace') && (this.selected || this.selectedEdge || this.multi.length)) { e.preventDefault(); this.deleteSelected(); }
    if (e.key === 'Escape') { this.mode = 'idle'; this.pendingFrom = null; this.picker = null; this.marquee = null; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') { e.preventDefault(); this.mode = 'select'; this.multi = this.model.states.map((s) => s.id); }
  }

  // ---------- zoom ----------
  private zoom(cx: number, cy: number, f: number): void {
    const nw = this.view.w * f;
    if (nw < 260 || nw > 4200) return;
    this.view = { x: cx - (cx - this.view.x) * f, y: cy - (cy - this.view.y) * f, w: this.view.w * f, h: this.view.h * f };
  }
  get zoomRead(): number { return Math.round(1200 / this.view.w * 100); }
  zoomIn(): void { this.zoom(this.view.x + this.view.w / 2, this.view.y + this.view.h / 2, 0.8); }
  zoomOut(): void { this.zoom(this.view.x + this.view.w / 2, this.view.y + this.view.h / 2, 1.25); }
  fit(): void {
    if (!this.model.states.length) { this.view = { x: 0, y: 0, w: 1200, h: 800 }; return; }
    const xs = this.model.states.map((s) => s.x), ys = this.model.states.map((s) => s.y), pad = R + 70;
    const minX = Math.min(...xs) - pad, maxX = Math.max(...xs) + pad, minY = Math.min(...ys) - pad, maxY = Math.max(...ys) + pad;
    this.view = { x: minX, y: minY, w: Math.max(300, maxX - minX), h: Math.max(220, maxY - minY) };
  }
  onWheel(evt: WheelEvent): void {
    evt.preventDefault();
    const p = this.toSVG(evt);
    this.zoom(p.x, p.y, evt.deltaY < 0 ? 0.9 : 1 / 0.9);
  }

  // ---------- simulação ----------
  openSim(): void { this.simModal = true; this.simHtml = ''; this.simWord = ''; this.active = []; }
  closeSim(): void { this.simModal = false; this.active = []; }
  runSim(): void {
    const w = this.simWord.trim();
    for (const c of w) if (!realSymbols().includes(c)) { this.simHtml = `<p class="verdict no">Símbolo inválido: “${c}”. Use só 0 e 1.</p>`; return; }
    if (this.space === 'afd') {
      const r = localTrace(this.model, w);
      if ('error' in r) { this.simHtml = `<p class="verdict no">${r.error}</p>`; return; }
      let h = '<div class="trace">';
      r.path.forEach((p, i) => { h += `<span>${p}</span>`; if (i < r.path.length - 1) h += `<span class="dim"> --${w[i]}--&gt; </span>`; });
      h += '</div>';
      if (r.broke) h += `<p class="verdict no">Travou em “${r.finalState}” (sem saída para “${r.brokeSym}”).</p>`;
      else if (r.accepted) h += `<p class="verdict ok">Terminou em “${r.finalState}”, de aceitação → ACEITA${w === '' ? ' a vazia' : ''}.</p>`;
      else h += `<p class="verdict no">Terminou em “${r.finalState}”, não-aceitação → REJEITA${w === '' ? ' a vazia' : ''}.</p>`;
      this.simHtml = h;
      this.active = r.finalState ? this.model.states.filter((s) => s.name === r.finalState).map((s) => s.id) : [];
    } else {
      const r = simulateNfa(this.model, w);
      if ('error' in r) { this.simHtml = `<p class="verdict no">${r.error}</p>`; return; }
      let seq = `<div class="setseq"><span class="st">${r.start.label}</span>`;
      r.steps.forEach((st) => { seq += `<span class="op">--${st.sym}--&gt;</span><span class="st">${st.label}</span>`; });
      seq += '</div>';
      const v = r.accepted
        ? `<p class="verdict ok">Algum caminho termina em aceitação → ACEITA${w === '' ? ' a vazia' : ''}.</p>`
        : `<p class="verdict no">Nenhum caminho termina em aceitação → REJEITA${w === '' ? ' a vazia' : ''}.</p>`;
      this.simHtml = `<p class="modal-note">Conjunto de estados alcançáveis a cada passo:</p>${seq}${v}`;
      this.active = r.finalSet;
    }
  }

  // ---------- determinização ----------
  openDeterminize(): void {
    this.automataSvc.determinize(this.model).subscribe({
      next: (d) => { this.det = d; this.detModal = true; },
      error: () => {
        const local = localDeterminize(this.model);
        if ('error' in local) { this.det = null; this.simHtml = ''; alert(local.error); return; }
        this.det = local; this.detModal = true;
      },
    });
  }
  closeDet(): void { this.detModal = false; }
  detPreview(): Layout | null {
    if (!this.det) return null;
    return computeLayout(this.det.afd, {});
  }
  applyDet(): void {
    if (!this.det) return;
    this.automata.afd = { kind: 'afd', states: JSON.parse(JSON.stringify(this.det.afd.states)), transitions: JSON.parse(JSON.stringify(this.det.afd.transitions)) };
    this.detModal = false;
    this.switchSpace('afd');
    this.touch();
  }

  // ---------- export / import ----------
  openExport(): void { this.ioModal = 'export'; this.ioText = JSON.stringify({ kind: this.space, states: this.model.states, transitions: this.model.transitions }, null, 2); }
  openImport(): void { this.ioModal = 'import'; this.ioText = ''; }
  closeIo(): void { this.ioModal = null; }
  doImport(): void {
    try {
      const data = JSON.parse(this.ioText);
      if (!Array.isArray(data.states) || !Array.isArray(data.transitions)) throw new Error('formato');
      const kind: AutomatonKind = data.kind === 'afn' ? 'afn' : 'afd';
      this.automata[kind] = { kind, states: data.states, transitions: data.transitions };
      if (kind !== this.space) this.switchSpace(kind); else { this.reset(); this.fit(); }
      this.ioModal = null; this.touch();
    } catch {
      alert('JSON inválido. Cole um autômato exportado por esta bancada.');
    }
  }

  // ---------- biblioteca (API) ----------
  openLibrary(): void { this.libModal = true; this.libError = ''; this.refreshLibrary(); }
  closeLibrary(): void { this.libModal = false; }
  refreshLibrary(): void {
    this.automataSvc.list().subscribe({
      next: (l) => { this.library = l; this.libError = ''; },
      error: () => { this.library = []; this.libError = 'Backend offline — suba a API (porta 3000) e o Postgres (54327) para usar a biblioteca. Enquanto isso, use Exportar/Importar.'; },
    });
  }
  saveCurrent(): void {
    if (!this.model.states.length) return;
    const name = `${this.space.toUpperCase()} ${new Date().toLocaleString('pt-BR')}`;
    this.automataSvc.create(name, this.space, this.model).subscribe({
      next: () => this.refreshLibrary(),
      error: () => { this.libError = 'Não foi possível salvar — backend offline.'; },
    });
  }
  loadSaved(a: SavedAutomaton): void {
    this.automata[a.kind] = { ...a.model, kind: a.kind };
    this.libModal = false;
    if (a.kind !== this.space) this.switchSpace(a.kind); else { this.reset(); this.fit(); }
    this.touch();
  }
  deleteSaved(a: SavedAutomaton, ev: Event): void {
    ev.stopPropagation();
    this.automataSvc.remove(a.id).subscribe({ next: () => this.refreshLibrary(), error: () => this.refreshLibrary() });
  }

  // ---------- navegação ----------
  toPortal(): void { this.router.navigate(['/']); }

  private seedIfEmpty(): void {
    if (this.model.states.length) return;
    if (this.space === 'afd') {
      // termina com 0
      this.automata.afd = {
        kind: 'afd',
        states: [
          { id: 's0', name: 'q0', initial: true, accepting: false, x: 360, y: 340 },
          { id: 's1', name: 'q1', initial: false, accepting: true, x: 680, y: 340 },
        ],
        transitions: [
          { from: 's0', to: 's1', symbols: ['0'] },
          { from: 's0', to: 's0', symbols: ['1'] },
          { from: 's1', to: 's1', symbols: ['0'] },
          { from: 's1', to: 's0', symbols: ['1'] },
        ],
      };
    } else {
      // contém 01
      this.automata.afn = {
        kind: 'afn',
        states: [
          { id: 's0', name: 'A', initial: true, accepting: false, x: 300, y: 340 },
          { id: 's1', name: 'B', initial: false, accepting: false, x: 560, y: 340 },
          { id: 's2', name: 'C', initial: false, accepting: true, x: 820, y: 340 },
        ],
        transitions: [
          { from: 's0', to: 's0', symbols: ['0', '1'] },
          { from: 's0', to: 's1', symbols: ['0'] },
          { from: 's1', to: 's2', symbols: ['1'] },
          { from: 's2', to: 's2', symbols: ['0', '1'] },
        ],
      };
    }
  }
}
