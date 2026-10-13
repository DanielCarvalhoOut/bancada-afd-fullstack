import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { Grammar, Production, checkTree, expandLeaf, isNT, parseTree, replaceNode, serializeTree, showProd } from '../domain/grammar';
import { layoutTree, nodeAt, symWidth } from '../domain/tree-layout';

/**
 * Desenho interativo da árvore: o texto (notação com colchetes) é a fonte da
 * verdade; clicar num não terminal oferece as regras dele e devolve o texto novo.
 * Usado na página de derivações e nos exercícios.
 */
@Component({
  selector: 'app-tree-editor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (view(); as tv) {
      <div class="canvas" role="group" aria-label="Árvore de derivação; clique num nó para expandir ou corrigir">
        <svg [attr.viewBox]="'0 0 ' + tv.w + ' ' + tv.h" [attr.width]="tv.w" [attr.height]="tv.h">
          @for (e of tv.edges; track e.key) {
            <line [attr.x1]="e.x1" [attr.y1]="e.y1" [attr.x2]="e.x2" [attr.y2]="e.y2" class="edge" [class.err]="e.err"></line>
          }
          @for (n of tv.nodes; track n.path) {
            <g class="tn" [class.ro]="readonly()" [attr.data-k]="n.kind" [class.err]="n.err" [class.open]="n.open" [class.sel]="sel() === n.path"
               (click)="select(n.path)" (keydown.enter)="select(n.path)" (keydown.space)="select(n.path); $event.preventDefault()"
               tabindex="0" role="button" [attr.aria-label]="n.sym + (n.err ? ', com erro' : n.open ? ', não expandido' : '')">
              <rect [attr.x]="n.x - n.w / 2" [attr.y]="n.y - 14" [attr.width]="n.w" height="28" rx="14"></rect>
              <text [attr.x]="n.x" [attr.y]="n.y + 4.5" text-anchor="middle">{{ n.sym }}</text>
            </g>
          }
        </svg>
      </div>
      @if (selNode(); as n) {
        <div class="selbox">
          <div class="mono"><b>{{ n.sym }}</b> selecionado</div>
          @if (selIssue(); as m) { <div class="m-err">{{ m }}</div> }
          <div class="opts">
            @for (p of options(); track p.index) { <button type="button" class="opt mono" (click)="expand(p)">{{ prodText(p) }}</button> }
            @if (n.children) { <button type="button" class="opt" (click)="collapse()">Recolher (apagar filhos)</button> }
          </div>
          @if (!options().length && !n.children) { <p class="hint">Terminal: é folha, não se expande.</p> }
        </div>
      }
    }
  `,
  styles: [`
    :host{ display:block; }
    .canvas{ margin-top:10px; overflow:auto; max-height:520px; border:1px solid var(--line-soft); border-radius:10px; background-color:var(--bg); background-image:radial-gradient(var(--grid) 1.2px, transparent 1.2px); background-size:18px 18px; }
    .canvas svg{ display:block; margin:0 auto; }
    .edge{ stroke:var(--ink-faint); stroke-width:1.4; }
    .edge.err{ stroke:var(--trap); }
    .tn{ cursor:pointer; outline:none; }
    .tn.ro{ cursor:default; }
    .tn rect{ fill:var(--surface); stroke:var(--line); stroke-width:1.3; }
    .tn text{ font-family:"IBM Plex Mono",monospace; font-size:13.5px; fill:var(--ink); pointer-events:none; }
    .tn[data-k="nt"] rect{ stroke:var(--accent); fill:var(--accent-soft); }
    .tn[data-k="nt"] text{ font-weight:600; }
    .tn[data-k="eps"] text{ fill:var(--ink-faint); font-style:italic; }
    .tn.open rect{ stroke:var(--afn); stroke-dasharray:4 3; fill:transparent; }
    .tn.err rect{ stroke:var(--trap); fill:var(--trap-fill); stroke-width:2; }
    .tn.sel rect{ stroke-width:2.6; }
    .tn:hover rect, .tn:focus-visible rect{ stroke-width:2.4; }
    .selbox{ margin-top:10px; padding:10px 12px; border:1px dashed var(--accent); border-radius:8px; font-size:13px; font-family:"IBM Plex Sans", system-ui, sans-serif; }
    .m-err{ margin-top:6px; padding:6px 10px; border-radius:7px; background:var(--trap-fill); border-left:3px solid var(--trap); }
    .opts{ display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
    .opt{ font-size:13px; padding:5px 10px; border-radius:7px; border:1px solid var(--line); background:var(--bg); color:var(--ink); }
    .opt:hover{ border-color:var(--accent); color:var(--accent); }
    .hint{ margin:6px 0 0; font-size:12.5px; color:var(--ink-dim); }
  `],
})
export class TreeEditorComponent {
  readonly grammar = input.required<Grammar | null>();
  readonly text = input.required<string>();
  readonly word = input<string[] | null>(null);
  /** Só mostra (resposta-modelo): sem seleção nem edição. */
  readonly readonly = input(false);
  readonly textChange = output<string>();

  readonly sel = signal<string | null>(null);
  private readonly root = computed(() => { const g = this.grammar(); return g ? parseTree(g, this.text()).root : null; });
  private readonly report = computed(() => { const g = this.grammar(), r = this.root(); return g && r ? checkTree(g, r, this.word()) : null; });
  readonly view = computed(() => { const g = this.grammar(), r = this.root(); return g && r ? layoutTree(g, r, this.report()) : null; });
  readonly selNode = computed(() => { const r = this.root(), p = this.sel(); return r && p ? nodeAt(r, p) : null; });
  readonly options = computed<Production[]>(() => {
    const g = this.grammar(), n = this.selNode();
    return g && n && isNT(g, n.sym) ? g.byLhs.get(n.sym) ?? [] : [];
  });
  readonly selIssue = computed(() => { const n = this.selNode(), r = this.report(); return n && r ? r.issueById.get(n.id) ?? null : null; });
  readonly symWidth = symWidth;

  select(path: string): void {
    if (!this.readonly()) this.sel.set(this.sel() === path ? null : path);
  }
  prodText(p: Production): string { return showProd(this.grammar(), p); }
  expand(p: Production): void {
    const r = this.root(), n = this.selNode();
    if (r && n) this.textChange.emit(serializeTree(replaceNode(r, n.id, (old) => expandLeaf(old, p))));
  }
  collapse(): void {
    const r = this.root(), n = this.selNode();
    if (r && n) this.textChange.emit(serializeTree(replaceNode(r, n.id, (old) => ({ ...old, children: null }))));
  }
}
