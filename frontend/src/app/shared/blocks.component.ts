import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { EditorStateService } from '../core/services/editor-state.service';
import { AutomatonModel } from '../domain/automaton';
import { computeLayout, Layout, R } from '../domain/render';
import type { Block, NoteKind } from '../features/teoria/teoria.content';
import { ExerciseComponent, TheoryLink } from './exercise.component';

type FigLayout = Layout & { w: number; h: number };
const LAYOUTS = new WeakMap<AutomatonModel, FigLayout>();

/**
 * O viewBox padrão do motor tem folga para edição; numa figura de livro isso
 * vira faixa vazia. Recorta para o que é desenhado: estados, laços (acima do
 * estado), rótulos das arestas (que ficam no ponto de controle da curva) e a
 * seta de início.
 */
function tight(l: Layout): FigLayout {
  const xs: number[] = [], ys: number[] = [];
  for (const n of l.nodes) { xs.push(n.x - R, n.x + R); ys.push(n.y - R, n.y + R); }
  for (const e of l.edges) { xs.push(e.lx - e.labelW / 2, e.lx + e.labelW / 2); ys.push(e.ly - 10, e.ly + 10); }
  if (l.start) xs.push(l.start.x1);
  if (!xs.length) return { ...l, w: 0, h: 0 };
  const pad = 14;
  const x = Math.min(...xs) - pad, y = Math.min(...ys) - pad;
  const w = Math.max(...xs) + pad - x, h = Math.max(...ys) + pad - y;
  return { ...l, viewBox: `${x} ${y} ${w} ${h}`, w, h };
}

const NOTE_LABEL: Record<NoteKind, string> = { def: 'Definição', tip: 'Dica', warn: 'Cuidado', ex: 'Exemplo', q: 'Enunciado' };
let uid = 0;

/**
 * Desenha os blocos de conteúdo (texto, listas, tabelas, notas, figuras e
 * exercícios). Usado pela teoria e pelos exercícios resolvidos, para os dois
 * mostrarem o mesmo conteúdo do mesmo jeito. As figuras são autômatos reais,
 * abríveis na bancada.
 */
@Component({
  selector: 'app-blocks',
  standalone: true,
  imports: [ExerciseComponent],
  templateUrl: './blocks.component.html',
  styleUrl: './blocks.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BlocksComponent {
  private readonly router = inject(Router);
  private readonly editor = inject(EditorStateService);

  readonly blocks = input.required<Block[]>();
  /** Seções de teoria sobre o assunto: viram o atalho “Dúvida?” de cada exercício. */
  readonly theory = input<TheoryLink[]>([]);

  readonly noteLabel = NOTE_LABEL;
  /** Id da ponta de seta, único por instância (várias listas de blocos na mesma página). */
  readonly arrowId = `fig-ah-${++uid}`;

  layout(m: AutomatonModel): FigLayout {
    let l = LAYOUTS.get(m);
    if (!l) { l = tight(computeLayout(m, {})); LAYOUTS.set(m, l); }
    return l;
  }

  /** Abre a figura no painel de referência da bancada — não mexe no que está em edição. */
  asReference(m: AutomatonModel, caption: string): void {
    this.editor.queueReference(caption, m.kind ?? 'afd', m);
    void this.router.navigate(['/bancada']);
  }

  /** Carrega a figura como o autômato em edição (substitui o atual daquele espaço). */
  toEdit(m: AutomatonModel): void {
    const kind = m.kind ?? 'afd';
    if (!confirm(`Isso substitui o ${kind.toUpperCase()} que está na bancada. Para não perder nada, use "Referência". Continuar?`)) return;
    this.editor.space = kind;
    this.editor.queueModel(kind, m);
    void this.router.navigate(['/bancada']);
  }
}
