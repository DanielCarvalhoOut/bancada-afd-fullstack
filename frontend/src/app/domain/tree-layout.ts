import { EPS, Grammar, TreeNode, TreeReport, isNT } from './grammar';

/** Geometria da árvore de derivação, pura (usada pela página de derivações e pelos exercícios). */
export interface LNode {
  path: string;      // "0.2.1": estável entre edições do texto (o id do parser não é)
  id: number;
  sym: string;
  x: number;
  y: number;
  w: number;
  kind: 'nt' | 't' | 'eps';
  err: string | null;
  open: boolean;     // não terminal ainda sem filhos
}
export interface LEdge { key: string; x1: number; y1: number; x2: number; y2: number; err: boolean }
export interface TreeView { nodes: LNode[]; edges: LEdge[]; w: number; h: number }

const NODE_W = 46;
const LEVEL_H = 64;
const PAD = 26;

export const symWidth = (s: string) => Math.max(28, [...s].length * 8.6 + 16);

/**
 * Desenho "arrumado": folhas em colunas consecutivas (largura conforme o
 * símbolo), pai centrado sobre o primeiro e o último filho. O(n).
 */
export function layoutTree(g: Grammar, root: TreeNode, rep: TreeReport | null): TreeView {
  const nodes: LNode[] = [];
  const edges: LEdge[] = [];
  let cursor = 0;
  let depthMax = 0;
  const place = (n: TreeNode, path: string, depth: number): { x: number; y: number } => {
    depthMax = Math.max(depthMax, depth);
    const y = PAD + depth * LEVEL_H;
    const pts = (n.children ?? []).map((c, i) => place(c, `${path}.${i}`, depth + 1));
    let x: number;
    if (!pts.length) {
      const w = Math.max(NODE_W, symWidth(n.sym) + 10);
      x = PAD + cursor + w / 2;
      cursor += w;
    } else {
      x = (pts[0].x + pts[pts.length - 1].x) / 2;
    }
    const err = rep?.issueById.get(n.id) ?? null;
    pts.forEach((p, i) => edges.push({ key: `${path}>${i}`, x1: x, y1: y + 14, x2: p.x, y2: p.y - 14, err: !!err }));
    const kind = n.sym === EPS ? 'eps' : isNT(g, n.sym) ? 'nt' : 't';
    nodes.push({ path, id: n.id, sym: n.sym, x, y, w: symWidth(n.sym), kind, err, open: kind === 'nt' && !n.children });
    return { x, y };
  };
  place(root, '0', 0);
  return { nodes, edges, w: PAD * 2 + Math.max(cursor, NODE_W), h: PAD * 2 + depthMax * LEVEL_H };
}

export function nodeAt(root: TreeNode, path: string): TreeNode | null {
  let n: TreeNode | null = root;
  for (const k of path.split('.').slice(1)) n = n?.children?.[+k] ?? null;
  return n;
}
