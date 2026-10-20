import { Injectable, signal } from '@angular/core';
import { NOVIDADES } from '../novidades';

const KEY = 'bancada-novidades-visto';

/**
 * Aviso de novidades: abre sozinho uma vez por versão (guardada em
 * localStorage) e pode ser reaberto pela página inicial. Sem storage (modo
 * privado etc.) o aviso volta a aparecer, mas nada quebra.
 */
@Injectable({ providedIn: 'root' })
export class NovidadesService {
  readonly aberto = signal(false);

  /** Abre se esta versão ainda não foi vista neste navegador. */
  abrirSeNovo(): void {
    if (this.lerVisto() !== NOVIDADES.versao) this.aberto.set(true);
  }

  abrir(): void { this.aberto.set(true); }

  fechar(): void {
    this.aberto.set(false);
    try {
      localStorage.setItem(KEY, NOVIDADES.versao);
    } catch {
      /* ignora (modo privado etc.) */
    }
  }

  private lerVisto(): string | null {
    try {
      return localStorage.getItem(KEY);
    } catch {
      return null;
    }
  }
}
