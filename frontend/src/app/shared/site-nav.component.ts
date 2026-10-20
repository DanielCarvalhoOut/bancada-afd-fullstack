import { ChangeDetectionStrategy, Component, ElementRef, HostListener, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

interface NavItem { key: 'bancada' | 'teoria' | 'exercicios' | 'derivacoes' | 'atividades'; path: string; label: string }

/** As páginas do site, sempre na mesma ordem em todas as barras. */
const ITEMS: NavItem[] = [
  { key: 'bancada', path: '/bancada', label: 'Bancada' },
  { key: 'teoria', path: '/teoria', label: 'Teoria' },
  { key: 'exercicios', path: '/exercicios', label: 'Exercícios' },
  { key: 'derivacoes', path: '/derivacoes', label: 'Derivações' },
  { key: 'atividades', path: '/atividades', label: 'Atividades' },
];

/**
 * Navegação entre as páginas, usada na barra de cada uma. A página atual fica
 * destacada. Pela largura útil: ícone + nome, só ícones e, no estreito, um
 * botão “⋯” com menu. Com a classe `compact` (barra cheia, como a da bancada)
 * fica só com ícones e vira menu mais cedo.
 */
@Component({
  selector: 'app-site-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, NgTemplateOutlet],
  templateUrl: './site-nav.component.html',
  styleUrl: './site-nav.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SiteNavComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly items = ITEMS;
  readonly open = signal(false);

  toggle(): void { this.open.update((v) => !v); }
  close(): void { this.open.set(false); }

  /** Clique fora do menu fecha. */
  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(e.target as Node)) this.close();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void { this.close(); }
}
