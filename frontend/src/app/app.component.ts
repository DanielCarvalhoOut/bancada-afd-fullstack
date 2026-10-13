import { Component, effect, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PdfWindowComponent } from './core/components/pdf-window.component';
import { PdfWindowService } from './core/services/pdf-window.service';

/**
 * Casca do app: as rotas + a janela de PDF, que fica fora do <router-outlet>
 * para continuar aberta ao trocar de página. Quando a janela está encaixada,
 * as variáveis --dock-l / --dock-r reservam a faixa dela e o conteúdo encolhe.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, PdfWindowComponent],
  template: `
    <div class="app-shell"><router-outlet /></div>
    @if (pdf.doc()) { <app-pdf-window /> }
  `,
})
export class AppComponent {
  readonly pdf = inject(PdfWindowService);

  constructor() {
    effect(() => {
      const { left, right } = this.pdf.inset();
      const root = document.documentElement.style;
      root.setProperty('--dock-l', `${left}px`);
      root.setProperty('--dock-r', `${right}px`);
    });
  }
}
