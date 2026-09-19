import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE } from '../config';
import { AutomatonKind, AutomatonModel, Determinization, SavedAutomaton } from '../models/api.model';

/** Acesso à biblioteca de autômatos (CRUD) e à determinização no backend. */
@Injectable({ providedIn: 'root' })
export class AutomataService {
  private readonly url = `${API_BASE}/automata`;
  constructor(private http: HttpClient) {}

  list(kind?: AutomatonKind): Observable<SavedAutomaton[]> {
    const q = kind ? `?kind=${kind}` : '';
    return this.http.get<SavedAutomaton[]>(`${this.url}${q}`);
  }
  get(id: string): Observable<SavedAutomaton> {
    return this.http.get<SavedAutomaton>(`${this.url}/${id}`);
  }
  create(name: string, kind: AutomatonKind, model: AutomatonModel): Observable<SavedAutomaton> {
    return this.http.post<SavedAutomaton>(this.url, { name, kind, model });
  }
  update(id: string, patch: { name?: string; kind?: AutomatonKind; model?: AutomatonModel }): Observable<SavedAutomaton> {
    return this.http.patch<SavedAutomaton>(`${this.url}/${id}`, patch);
  }
  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
  /** Determiniza um AFN no servidor (fonte de verdade). */
  determinize(model: AutomatonModel): Observable<Determinization> {
    return this.http.post<Determinization>(`${this.url}/determinize`, { model });
  }
}
