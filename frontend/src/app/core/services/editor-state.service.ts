import { Injectable } from '@angular/core';
import { AutomatonKind, AutomatonModel } from '../models/api.model';

/**
 * Estado leve compartilhado entre o portal e a bancada: qual espaço abrir
 * (afd/afn) e, opcionalmente, um autômato "pendente" para a bancada carregar
 * (quando o usuário abre um da biblioteca).
 */
@Injectable({ providedIn: 'root' })
export class EditorStateService {
  /** Espaço a abrir quando a bancada montar. */
  space: AutomatonKind = 'afd';

  private pending: { kind: AutomatonKind; model: AutomatonModel } | null = null;

  queueModel(kind: AutomatonKind, model: AutomatonModel): void {
    this.pending = { kind, model: JSON.parse(JSON.stringify(model)) };
  }
  takePending(): { kind: AutomatonKind; model: AutomatonModel } | null {
    const p = this.pending;
    this.pending = null;
    return p;
  }
}
