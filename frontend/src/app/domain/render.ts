import { AutomatonModel, AutomatonState, AutomatonTransition, EPS, getState } from './automaton';

export const R = 28; // raio do estado (unidades SVG)

export interface EdgeGeom {
  key: string;
  d: string;
  lx: number;
  ly: number;
  label: string;
  labelW: number;
  selected: boolean;
  eps: boolean; // true quando a transição inclui ε (aresta tracejada)
}

export interface NodeGeom {
  id: string;
  x: number;
  y: number;
  name: string;
  accepting: boolean;
  selected: boolean;
  pending: boolean;
  active: boolean; // destaque durante a simulação
}

export interface Layout {
  viewBox: string;
  edges: EdgeGeom[];
  nodes: NodeGeom[];
  start?: { x1: number; y1: number; x2: number; y2: number };
}

function edgeGeom(m: AutomatonModel, t: AutomatonTransition): { d: string; lx: number; ly: number } | null {
  const a = getState(m, t.from);
  const b = getState(m, t.to);
  if (!a || !b) return null;
  if (t.from === t.to) {
    const cx = a.x, cy = a.y;
    return {
      d: `M ${cx - 13} ${cy - R + 3} C ${cx - 40} ${cy - R - 42} ${cx + 40} ${cy - R - 42} ${cx + 13} ${cy - R + 3}`,
      lx: cx, ly: cy - R - 40,
    };
  }
  const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
  const rev = m.transitions.some((q) => q.from === t.to && q.to === t.from);
  if (rev) {
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, px = -uy, py = ux, off = 34;
    const cxp = mx + px * off, cyp = my + py * off;
    return {
      d: `M ${a.x + ux * R} ${a.y + uy * R} Q ${cxp} ${cyp} ${b.x - ux * R} ${b.y - uy * R}`,
      lx: cxp, ly: cyp - 2,
    };
  }
  const x1 = a.x + ux * R, y1 = a.y + uy * R, x2 = b.x - ux * R, y2 = b.y - uy * R;
  return { d: `M ${x1} ${y1} L ${x2} ${y2}`, lx: (x1 + x2) / 2 - uy * 12, ly: (y1 + y2) / 2 + ux * 12 };
}

/** Calcula o layout para desenhar o autômato. `view` opcional força o viewBox (bancada). */
export function computeLayout(
  m: AutomatonModel,
  opts: {
    selectedNode?: string; selectedEdge?: string; multi?: string[];
    pendingFrom?: string; view?: string; active?: string[];
  } = {},
): Layout {
  const multi = opts.multi ?? [];
  const active = opts.active ?? [];
  const edges: EdgeGeom[] = [];
  for (const t of m.transitions) {
    if (!t.symbols.length) continue;
    const g = edgeGeom(m, t);
    if (!g) continue;
    const label = t.symbols.slice().sort().join(',');
    const key = `${t.from}>${t.to}`;
    edges.push({
      key, d: g.d, lx: g.lx, ly: g.ly, label, labelW: label.length * 7.7 + 6,
      selected: opts.selectedEdge === key, eps: t.symbols.includes(EPS),
    });
  }
  const nodes: NodeGeom[] = m.states.map((s: AutomatonState) => ({
    id: s.id, x: s.x, y: s.y, name: s.name, accepting: s.accepting,
    selected: opts.selectedNode === s.id || multi.includes(s.id),
    pending: opts.pendingFrom === s.id,
    active: active.includes(s.id),
  }));
  const init = m.states.find((s) => s.initial);
  const start = init ? { x1: init.x - R - 34, y1: init.y, x2: init.x - R - 3, y2: init.y } : undefined;

  let viewBox = opts.view;
  if (!viewBox) {
    if (!m.states.length) viewBox = '0 0 1200 800';
    else {
      const xs = m.states.map((s) => s.x), ys = m.states.map((s) => s.y), pad = R + 50;
      const minX = Math.min(...xs) - pad, maxX = Math.max(...xs) + pad;
      const minY = Math.min(...ys) - pad, maxY = Math.max(...ys) + pad;
      viewBox = `${minX} ${minY} ${Math.max(300, maxX - minX)} ${Math.max(220, maxY - minY)}`;
    }
  }
  return { viewBox, edges, nodes, start };
}
