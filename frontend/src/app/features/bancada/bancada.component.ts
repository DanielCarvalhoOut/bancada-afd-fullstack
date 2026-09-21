import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AutomataService } from '../../core/services/automata.service';
import { EditorStateService } from '../../core/services/editor-state.service';
import { ThemeService } from '../../core/services/theme.service';
import {
  AutomatonKind, AutomatonModel, Comparison, Determinization, SavedAutomaton,
} from '../../core/models/api.model';
import {
  DEFAULT_ALPHABET, EPS, determinize as localDeterminize, determinismIssues,
  getState, parseAlphabet, realSymbols, simulateNfa, trace as localTrace, validateAlphabet,
} from '../../domain/automaton';
import { computeLayout, Layout, R } from '../../domain/render';

/** Escapa texto do usuário (nomes de estado, palavra, erros) antes de montar o HTML da simulação. */
const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

type Mode = 'idle' | 'addState' | 'addTrans' | 'select';
const STORAGE = 'bancada-aut-v2';

const isFiniteNum = (v: unknown) => typeof v === 'number' && Number.isFinite(v);

/**
 * Lê um autômato de JSON importado; lança Error com mensagem legível se inválido.
 * Confere a forma de cada estado e transição: o JSON vem de fora e um campo
 * errado quebraria o desenho ou a simulação só mais tarde, longe da causa.
 */
function readModel(data: unknown): AutomatonModel {
  const d = data as Partial<AutomatonModel> | null;
  if (!d || !Array.isArray(d.states) || !Array.isArray(d.transitions)) throw new Error('faltam "states" e "transitions".');
  const ids = new Set<string>();
  for (const [i, st] of d.states.entries()) {
    const ok = st && typeof st.id === 'string' && typeof st.name === 'string'
      && typeof st.initial === 'boolean' && typeof st.accepting === 'boolean'
      && isFiniteNum(st.x) && isFiniteNum(st.y);
    if (!ok) throw new Error(`estado ${i + 1} precisa de id, name, initial, accepting, x e y válidos.`);
    if (ids.has(st.id)) throw new Error(`id de estado repetido: "${st.id}".`);
    ids.add(st.id);
  }
  if (d.kind !== undefined && d.kind !== 'afd' && d.kind !== 'afn') {
    throw new Error(`"kind" deve ser "afd" ou "afn" (veio "${d.kind}").`);
  }
  const kind: AutomatonKind = d.kind ?? 'afd';
  let alphabet: string[] | undefined;
  if (d.alphabet !== undefined) {
    const parsed = Array.isArray(d.alphabet) ? validateAlphabet(d.alphabet) : { error: '"alphabet" deve ser uma lista.' };
    if ('error' in parsed) throw new Error(parsed.error);
    alphabet = parsed;
  }
  // Símbolo de seta fora de Σ nunca seria lido na simulação: a seta ficaria
  // desenhada e morta. Melhor recusar aqui do que deixar o autômato mudo.
  const sigma = [...(alphabet ?? DEFAULT_ALPHABET), EPS];
  for (const [i, t] of d.transitions.entries()) {
    const ok = t && typeof t.from === 'string' && typeof t.to === 'string'
      && Array.isArray(t.symbols) && t.symbols.length
      && t.symbols.every((x: unknown) => typeof x === 'string');
    if (!ok) throw new Error(`transição ${i + 1} precisa de from, to e symbols (lista de textos não vazia).`);
    if (!ids.has(t.from) || !ids.has(t.to)) throw new Error(`transição ${i + 1} liga um estado que não existe.`);
    const foreign = t.symbols.find((x: string) => !sigma.includes(x));
    if (foreign !== undefined) {
      throw new Error(`transição ${i + 1} usa o símbolo "${foreign}", que não está em Σ = {${sigma.slice(0, -1).join(', ')}} (ε é aceito).`);
    }
  }
  return { kind, alphabet, states: d.states, transitions: d.transitions };
}

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

  // layout responsivo: rail de ferramentas e painel de propriedades
  railOpen = true;
  panelOpen = true;

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
  ioMsg = '';
  importing = false;
  libModal = false;
  library: SavedAutomaton[] = [];
  libError = '';
  cmp: Comparison | null = null;
  cmpError = '';
  alphabetError = '';

  private drag: { id: string; dx: number; dy: number } | null = null;
  private marquee: { x1: number; y1: number; x2: number; y2: number } | null = null;
  private pan: { sx: number; sy: number; vx: number; vy: number; kx: number; ky: number } | null = null;

  constructor(
    private automataSvc: AutomataService,
    private editor: EditorStateService,
    public theme: ThemeService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    // no celular, começa com o painel recolhido e a rail visível (só ícones)
    const narrow = typeof window !== 'undefined' && window.innerWidth <= 820;
    this.panelOpen = !narrow;
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
          afd: { kind: 'afd', alphabet: data.afd.alphabet, states: data.afd.states ?? [], transitions: data.afd.transitions ?? [] },
          afn: { kind: 'afn', alphabet: data.afn.alphabet, states: data.afn.states ?? [], transitions: data.afn.transitions ?? [] },
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
    this.alphabetError = '';
  }

  // ---------- alfabeto ----------
  /**
   * Troca Σ do autômato ativo. Todo símbolo de transição fora do novo Σ (os
   * removidos agora e os que já estavam fora, ex.: vindos de import) é tirado
   * das setas, com confirmação, pois apaga setas. ε não é símbolo de Σ e fica.
   */
  applyAlphabet(text: string): void {
    const parsed = parseAlphabet(text);
    if ('error' in parsed) { this.alphabetError = parsed.error; return; }
    this.alphabetError = '';
    const outside = (s: string) => s !== EPS && !parsed.includes(s);
    const affected = this.model.transitions.filter((t) => t.symbols.some(outside));
    const removed = [...new Set(affected.flatMap((t) => t.symbols.filter(outside)))];
    if (affected.length && !confirm(`Remover ${removed.join(', ')} de Σ apaga esse(s) símbolo(s) de ${affected.length} transição(ões). Continuar?`)) return;
    for (const t of affected) t.symbols = t.symbols.filter((s) => !outside(s));
    this.model.transitions = this.model.transitions.filter((t) => t.symbols.length);
    this.model.alphabet = parsed;
    this.selectedEdge = null;
    this.touch();
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
  get afdErrors() { return this.issues.filter((i) => i.severity === 'error'); }
  get afdNotes() { return this.issues.filter((i) => i.severity === 'note'); }
  get sigma(): string[] { return realSymbols(this.model); }
  get pickerSyms(): string[] { return this.space === 'afn' ? [...this.sigma, EPS] : this.sigma; }
  /** No AFN o painel não lista problemas de determinismo, só símbolos fora de Σ. */
  get foreignIssues() { return this.issues.filter((i) => i.kind === 'foreign'); }
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
      // canvas vazio no modo idle: arrastar = mover a vista (pan), tocar = limpar seleção
      this.selected = null; this.selectedEdge = null;
      const rect = this.stageRef.nativeElement.getBoundingClientRect();
      this.pan = {
        sx: evt.clientX, sy: evt.clientY, vx: this.view.x, vy: this.view.y,
        kx: this.view.w / (rect.width || 1), ky: this.view.h / (rect.height || 1),
      };
      this.stageRef.nativeElement.setPointerCapture(evt.pointerId);
    }
  }
  onMove(evt: PointerEvent): void {
    if (this.pan) {
      this.view = {
        ...this.view,
        x: this.pan.vx - (evt.clientX - this.pan.sx) * this.pan.kx,
        y: this.pan.vy - (evt.clientY - this.pan.sy) * this.pan.ky,
      };
      return;
    }
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
    if (this.pan) { this.pan = null; try { this.stageRef.nativeElement.releasePointerCapture(evt.pointerId); } catch { /* noop */ } return; }
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
    if (this.space === 'afd') {
      const r = localTrace(this.model, w);
      if ('error' in r) { this.simHtml = `<p class="verdict no">${esc(r.error)}</p>`; return; }
      const syms = [...w]; // por code point, como o trace lê a palavra
      let h = '<div class="trace">';
      r.path.forEach((p, i) => { h += `<span>${esc(p)}</span>`; if (i < r.path.length - 1) h += `<span class="dim"> --${esc(syms[i])}--&gt; </span>`; });
      h += '</div>';
      if (r.broke) h += `<p class="verdict no">Travou em “${esc(r.finalState)}” (sem saída para “${esc(r.brokeSym)}”).</p>`;
      else if (r.accepted) h += `<p class="verdict ok">Terminou em “${esc(r.finalState)}”, de aceitação → ACEITA${w === '' ? ' a vazia' : ''}.</p>`;
      else h += `<p class="verdict no">Terminou em “${esc(r.finalState)}”, não-aceitação → REJEITA${w === '' ? ' a vazia' : ''}.</p>`;
      this.simHtml = h;
      this.active = r.finalState ? this.model.states.filter((s) => s.name === r.finalState).map((s) => s.id) : [];
    } else {
      const r = simulateNfa(this.model, w);
      if ('error' in r) { this.simHtml = `<p class="verdict no">${esc(r.error)}</p>`; return; }
      let seq = `<div class="setseq"><span class="st">${esc(r.start.label)}</span>`;
      r.steps.forEach((st) => { seq += `<span class="op">--${esc(st.sym)}--&gt;</span><span class="st">${esc(st.label)}</span>`; });
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
    this.automata.afd = { kind: 'afd', ...JSON.parse(JSON.stringify(this.det.afd)) };
    this.detModal = false;
    this.switchSpace('afd');
    this.touch();
  }

  // ---------- export / import ----------
  openExport(): void { this.ioModal = 'export'; this.ioText = JSON.stringify({ kind: this.space, alphabet: this.sigma, states: this.model.states, transitions: this.model.transitions }, null, 2); }
  openImport(): void { this.ioModal = 'import'; this.ioText = ''; this.ioMsg = ''; }
  closeIo(): void { if (!this.importing) this.ioModal = null; }

  /** Carrega um arquivo .json escolhido pelo usuário na caixa de texto. */
  async pickImportFile(input: HTMLInputElement): Promise<void> {
    const file = input.files?.[0];
    if (file) this.ioText = await file.text();
    input.value = '';
  }

  /**
   * Aceita dois formatos:
   * - um autômato exportado ({ kind, alphabet, states, transitions }) → abre na bancada;
   * - uma lista de salvos ([{ name, kind, model }], a Biblioteca exportada) → grava
   *   cada um na Biblioteca, pulando nomes que já existem (reimportar não duplica).
   */
  doImport(): void {
    let data: unknown;
    try { data = JSON.parse(this.ioText); } catch { this.ioMsg = 'JSON inválido: confira se colou o arquivo inteiro.'; return; }
    if (Array.isArray(data)) { void this.importList(data); return; }
    try {
      const model = readModel(data);
      this.automata[model.kind!] = model;
      if (model.kind !== this.space) this.switchSpace(model.kind!); else { this.reset(); this.fit(); }
      this.ioModal = null; this.touch();
    } catch (e) {
      this.ioMsg = `Autômato inválido: ${(e as Error).message}`;
    }
  }

  private async importList(items: unknown[]): Promise<void> {
    // Valida tudo antes de gravar qualquer coisa: lista com erro não entra pela metade.
    const entries: { name: string; model: AutomatonModel }[] = [];
    for (const [i, it] of items.entries()) {
      const rec = it as { name?: unknown; kind?: unknown; model?: unknown };
      const name = typeof rec?.name === 'string' ? rec.name.trim().slice(0, 120) : '';
      if (!name) { this.ioMsg = `Item ${i + 1}: falta o campo "name".`; return; }
      try {
        entries.push({ name, model: readModel({ ...(rec.model as object), kind: rec.kind ?? (rec.model as { kind?: unknown })?.kind }) });
      } catch (e) {
        this.ioMsg = `Item ${i + 1} (“${name}”): ${(e as Error).message}`; return;
      }
    }
    this.importing = true;
    this.ioMsg = `Importando ${entries.length} autômato(s)…`;
    try {
      const existing = new Set((await firstValueFrom(this.automataSvc.list())).map((a) => a.name));
      let created = 0, skipped = 0;
      for (const e of entries) {
        if (existing.has(e.name)) { skipped++; continue; }
        await firstValueFrom(this.automataSvc.create(e.name, e.model.kind!, e.model));
        existing.add(e.name);
        created++;
      }
      this.ioMsg = `${created} gravado(s) na Biblioteca` + (skipped ? `, ${skipped} já existia(m) e foi(ram) pulado(s).` : '.');
      this.ioText = '';
    } catch {
      this.ioMsg = 'Falha ao gravar na Biblioteca — confira se a API (porta 3000) e o Postgres estão no ar. O que já foi gravado fica; reimportar pula os repetidos.';
    } finally {
      this.importing = false;
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
  /** Compara o autômato ativo com um salvo (gabarito) no servidor. */
  compareWith(a: SavedAutomaton, ev: Event): void {
    ev.stopPropagation();
    this.cmp = null; this.cmpError = '';
    this.automataSvc.compare(a.id, this.model).subscribe({
      next: (r) => { this.cmp = r; this.libModal = false; },
      error: (e) => { this.cmpError = e?.error?.message ?? 'Não foi possível comparar — backend offline.'; this.libModal = false; },
    });
  }
  closeCmp(): void { this.cmp = null; this.cmpError = ''; }
  /**
   * Símbolo da testemunha que não existe no Σ do autômato aberto, se houver.
   * A comparação roda sobre Σ(seu) ∪ Σ(referência): a palavra pode conter um
   * símbolo que o seu autômato sequer lê — é justamente por isso que ele rejeita.
   */
  get witnessOutsideSigma(): string | null {
    if (!this.cmp || this.cmp.equivalent) return null;
    return [...this.cmp.witness].find((c) => !this.sigma.includes(c)) ?? null;
  }
  /** Abre a simulação já com a palavra que distingue os dois autômatos. */
  simulateWitness(): void {
    if (!this.cmp || this.cmp.equivalent || this.witnessOutsideSigma) return;
    const w = this.cmp.witness;
    this.closeCmp();
    this.openSim();
    this.simWord = w;
    this.runSim();
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
