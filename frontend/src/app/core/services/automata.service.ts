import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { AutomatonKind, AutomatonModel, Comparison, Determinization, SavedAutomaton } from '../models/api.model';
import { determinize as domainDeterminize, equivalence as domainEquivalence } from '../../domain/automaton';
import { REVISAO } from '../revisao';

/**
 * Biblioteca de autômatos, determinização e comparação — TUDO no navegador.
 *
 * Não há backend: a persistência é `localStorage` (cache local, por navegador)
 * e os cálculos usam o motor puro de `domain/`. As assinaturas continuam
 * devolvendo `Observable` para os componentes não precisarem mudar; quando o
 * backend existir, basta trocar esta classe por uma que fale HTTP.
 */
const STORE = 'bancada-lib-v1';
const SEEDED = 'bancada-lib-seeded-v1';

@Injectable({ providedIn: 'root' })
export class AutomataService {
  constructor() { this.seedOnce(); }

  /** Semeia a lista da prova na Biblioteca uma vez por navegador. */
  private seedOnce(): void {
    try {
      if (localStorage.getItem(SEEDED)) return;
      const items = this.read();
      const base = Date.now();
      REVISAO.forEach((it, i) => {
        // createdAt decrescente → mantém a ordem Q1, Q2, … na listagem (desc).
        const ts = new Date(base - i * 1000).toISOString();
        items.push({
          id: this.uid(), name: it.name, kind: it.kind,
          stateCount: it.model.states.length,
          model: { ...it.model }, createdAt: ts, updatedAt: ts,
        });
      });
      this.write(items);
      localStorage.setItem(SEEDED, '1');
    } catch { /* modo privado / storage bloqueado: segue sem semear */ }
  }

  // ---------- persistência local ----------
  private read(): SavedAutomaton[] {
    try {
      const raw = localStorage.getItem(STORE);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }
  private write(items: SavedAutomaton[]): void {
    try { localStorage.setItem(STORE, JSON.stringify(items)); } catch { /* modo privado etc. */ }
  }
  private uid(): string {
    try { return crypto.randomUUID(); } catch { return 'a' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  }

  // ---------- biblioteca (CRUD local) ----------
  list(kind?: AutomatonKind): Observable<SavedAutomaton[]> {
    const all = this.read().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    return of(kind ? all.filter((a) => a.kind === kind) : all);
  }
  get(id: string): Observable<SavedAutomaton> {
    const item = this.read().find((a) => a.id === id);
    return item ? of(item) : throwError(() => ({ error: { message: `Autômato ${id} não encontrado.` } }));
  }
  create(name: string, kind: AutomatonKind, model: AutomatonModel): Observable<SavedAutomaton> {
    const now = new Date().toISOString();
    const item: SavedAutomaton = {
      id: this.uid(), name, kind: kind ?? model.kind ?? 'afd',
      stateCount: model.states.length,
      model: { ...model, kind: kind ?? model.kind ?? 'afd' },
      createdAt: now, updatedAt: now,
    };
    const items = this.read();
    items.push(item);
    this.write(items);
    return of(item);
  }
  update(id: string, patch: { name?: string; kind?: AutomatonKind; model?: AutomatonModel }): Observable<SavedAutomaton> {
    const items = this.read();
    const item = items.find((a) => a.id === id);
    if (!item) return throwError(() => ({ error: { message: `Autômato ${id} não encontrado.` } }));
    if (patch.name !== undefined) item.name = patch.name;
    if (patch.kind !== undefined) item.kind = patch.kind;
    if (patch.model !== undefined) {
      item.model = { ...patch.model, kind: patch.kind ?? patch.model.kind ?? item.kind };
      item.kind = item.model.kind ?? item.kind;
      item.stateCount = patch.model.states.length;
    }
    item.updatedAt = new Date().toISOString();
    this.write(items);
    return of(item);
  }
  remove(id: string): Observable<void> {
    const items = this.read().filter((a) => a.id !== id);
    this.write(items);
    return of(void 0);
  }

  // ---------- determinização (motor local) ----------
  determinize(model: AutomatonModel): Observable<Determinization> {
    const r = domainDeterminize(model);
    return 'error' in r ? throwError(() => ({ error: { message: r.error } })) : of(r);
  }

  // ---------- comparação de linguagens (motor local) ----------
  /** Diz se `model` aceita a mesma linguagem que o autômato salvo `id`. */
  compare(id: string, model: AutomatonModel): Observable<Comparison> {
    const ref = this.read().find((a) => a.id === id);
    if (!ref) return throwError(() => ({ error: { message: `Autômato ${id} não encontrado.` } }));
    // mesma ordem do backend: equivalence(SEU modelo, referência salva).
    const r = domainEquivalence(model, ref.model);
    if ('error' in r) return throwError(() => ({ error: { message: r.error } }));
    return of({ ...r, reference: ref.name });
  }
}
