import type { PdfDoc } from './services/pdf-window.service';

/** Atividades em PDF servidas pelo próprio app (pasta public/atividades). */
export interface Atividade extends PdfDoc {
  subject: string;
  description: string;
  pages: number;
  size: string;
  topics: string[];
  /** Questões em Exercícios (/exercicios/<section>) com a resolução comentada. */
  solutions: { label: string; section: string }[];
}

export const ATIVIDADES: Atividade[] = [
  {
    id: 'lista-gramaticas',
    title: 'Lista de Atividades — Gramáticas',
    fileName: 'Lista-Gramaticas-LFA.pdf',
    url: '/atividades/lista-gramaticas-lfa.pdf',
    subject: 'Gramáticas · Gramáticas Regulares',
    description: 'Derivação, palavras geradas e não geradas, sentença × forma sentencial, linguagem gerada e conversões entre gramática regular e autômato finito.',
    pages: 2,
    size: '89 KB',
    topics: ['derivação ⇒ / ⇒*', 'árvore', 'GR → AFD', 'AFD → GR', 'DTE'],
    solutions: [
      { label: 'Gramáticas Q1–Q5', section: 'ex-gram-q1' },
      { label: 'Regulares Q1–Q5', section: 'ex-gr-q1' },
    ],
  },
  {
    id: 'lista-glc',
    title: 'Lista de Atividades — Gramáticas Livres de Contexto',
    fileName: 'Lista-GLC-LFA.pdf',
    url: '/atividades/lista-glc-lfa.pdf',
    subject: 'Gramáticas Livres de Contexto',
    description: 'Derivações mais à esquerda e à direita, árvores de derivação, tipo 2 × tipo 3, ambiguidade, GLC ε-livre e construção de gramáticas para linguagens dadas.',
    pages: 2,
    size: '88 KB',
    topics: ['mais à esquerda / direita', 'árvore', 'ambiguidade', 'ε-livre', 'construir G'],
    solutions: [
      { label: 'GLC Q1–Q12', section: 'ex-glc-q1' },
    ],
  },
];
