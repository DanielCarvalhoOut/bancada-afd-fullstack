import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export interface Sym { s: string; label?: string }

/**
 * Botões que inserem símbolos difíceis de digitar (ε, →) no campo de texto
 * indicado, na posição do cursor (substituindo a seleção, se houver). O campo
 * recebe um evento `input`, então o estado da página atualiza como se a pessoa
 * tivesse digitado. `typed` lista as formas de teclado aceitas (eps, ->).
 */
@Component({
  selector: 'app-sym-bar',
  standalone: true,
  template: `
    <div class="bar" role="toolbar" aria-label="Inserir símbolo">
      @for (x of syms(); track x.s) {
        <!-- mousedown sem foco: o cursor e a seleção do campo continuam onde estavam -->
        <button type="button" class="sym" (mousedown)="$event.preventDefault()" (click)="put(x.s)"
                [title]="'Inserir ' + x.s" [attr.aria-label]="'Inserir ' + x.s + (x.label ? ' (' + x.label + ')' : '')">
          {{ x.s }}@if (x.label) { <small>{{ x.label }}</small> }
        </button>
      }
      @if (typed().length) {
        <span class="tip">ou digite @for (t of typed(); track t; let last = $last) {<code>{{ t }}</code>@if (!last) { e }}</span>
      }
    </div>
  `,
  styles: `
    :host{ display:block; }
    .bar{ display:flex; align-items:center; flex-wrap:wrap; gap:6px; margin:10px 0 6px; }
    .sym{ display:inline-flex; align-items:center; gap:6px; min-width:34px; height:32px; padding:0 10px; justify-content:center;
          border-radius:8px; border:1px solid var(--line); background:var(--surface-2); color:var(--ink);
          font:500 15px "IBM Plex Mono", monospace; cursor:pointer; }
    .sym:hover{ border-color:var(--accent); color:var(--accent); }
    .sym small{ font:11px "IBM Plex Sans", system-ui, sans-serif; color:var(--ink-faint); }
    .tip{ margin-left:auto; font:12px "IBM Plex Sans", system-ui, sans-serif; color:var(--ink-faint); }
    .tip code{ font-family:"IBM Plex Mono", monospace; font-size:11.5px; color:var(--ink-dim); background:var(--surface-2);
               border:1px solid var(--line-soft); padding:0 4px; border-radius:4px; }
    :focus-visible{ outline:2px solid var(--accent); outline-offset:2px; }
    @media (pointer:coarse){ .sym{ min-width:40px; height:40px; } }
    @container app (max-width:480px){ .tip{ margin-left:0; flex-basis:100%; } }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SymBarComponent {
  readonly target = input.required<HTMLTextAreaElement>();
  readonly syms = input<Sym[]>([]);
  readonly typed = input<string[]>([]);

  put(s: string): void {
    const t = this.target();
    const a = t.selectionStart ?? t.value.length;
    const z = t.selectionEnd ?? a;
    t.setRangeText(s, a, z, 'end');
    t.dispatchEvent(new Event('input', { bubbles: true }));
    t.focus();
  }
}
