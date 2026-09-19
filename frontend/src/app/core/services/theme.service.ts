import { Injectable } from '@angular/core';

type Theme = 'dark' | 'light';
const KEY = 'bancada-aut-theme';

/** Tema (claro/escuro) persistido em localStorage e refletido em data-theme. */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  constructor() {
    const saved = this.read();
    if (saved) document.documentElement.setAttribute('data-theme', saved);
  }

  private read(): Theme | null {
    try {
      const v = localStorage.getItem(KEY);
      return v === 'dark' || v === 'light' ? v : null;
    } catch {
      return null;
    }
  }

  toggle(): void {
    const cur =
      document.documentElement.getAttribute('data-theme') ??
      (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const next: Theme = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* ignora (modo privado etc.) */
    }
  }
}
