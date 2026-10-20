import { ChangeDetectionStrategy, Component, ElementRef, HostListener, afterNextRender, effect, inject, untracked, viewChild } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NOVIDADES } from '../core/novidades';
import { NovidadesService } from '../core/services/novidades.service';

const FOCAVEIS = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Janela de novidades (o que mudou de lugar e o que é novo). Fica na casca do
 * app, acima de todas as páginas. Fecha com Entendi, ✕, Esc, clique fora ou ao
 * seguir um dos links; o foco fica preso na janela e volta para onde estava.
 */
@Component({
  selector: 'app-novidades',
  standalone: true,
  imports: [RouterLink, NgTemplateOutlet],
  templateUrl: './novidades.component.html',
  styleUrl: './novidades.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NovidadesComponent {
  readonly svc = inject(NovidadesService);
  readonly n = NOVIDADES;
  private readonly dlg = viewChild<ElementRef<HTMLElement>>('dlg');
  private antes: HTMLElement | null = null;

  constructor() {
    afterNextRender(() => this.svc.abrirSeNovo());

    effect(() => {
      const aberto = this.svc.aberto();
      const dlg = this.dlg()?.nativeElement;
      untracked(() => {
        // página por trás não rola enquanto a janela está aberta
        document.documentElement.style.overflow = aberto ? 'hidden' : '';
        if (aberto && dlg) {
          this.antes = document.activeElement as HTMLElement | null;
          dlg.focus(); // leitor de tela anuncia o título; Tab segue para os botões
        } else if (!aberto && this.antes) {
          this.antes.focus?.();
          this.antes = null;
        }
      });
    });
  }

  fechar(): void { this.svc.fechar(); }

  /** Clique no fundo escuro (fora da janela) fecha. */
  fundo(e: MouseEvent): void {
    if (e.target === e.currentTarget) this.fechar();
  }

  @HostListener('document:keydown.escape')
  esc(): void { if (this.svc.aberto()) this.fechar(); }

  /** Tab circula só dentro da janela. */
  prender(e: KeyboardEvent): void {
    if (e.key !== 'Tab') return;
    const dlg = this.dlg()?.nativeElement;
    if (!dlg) return;
    const els = Array.from(dlg.querySelectorAll<HTMLElement>(FOCAVEIS));
    if (!els.length) return;
    const primeiro = els[0], ultimo = els[els.length - 1];
    if (e.shiftKey && (document.activeElement === primeiro || document.activeElement === dlg)) { e.preventDefault(); ultimo.focus(); }
    else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro.focus(); }
  }
}
