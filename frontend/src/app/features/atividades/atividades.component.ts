import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ATIVIDADES, Atividade } from '../../core/atividades';
import { DockMode, PdfWindowService } from '../../core/services/pdf-window.service';
import { ThemeService } from '../../core/services/theme.service';

/** Lista de atividades em PDF: baixar ou abrir na janela lateral/flutuante. */
@Component({
  selector: 'app-atividades',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './atividades.component.html',
  styleUrl: './atividades.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AtividadesComponent {
  readonly theme = inject(ThemeService);
  readonly pdf = inject(PdfWindowService);
  readonly items = ATIVIDADES;

  open(a: Atividade, mode: DockMode): void {
    this.pdf.setMode(mode);
    this.pdf.open(a);
  }
  isOpen(a: Atividade): boolean { return this.pdf.doc()?.id === a.id; }
}
