/**
 * Conteúdo do aviso de novidades. Para a próxima atualização: troque `versao`
 * (quem já viu a anterior vê de novo) e edite as listas.
 */
export type NovidadeIcone = 'exercicios' | 'barra' | 'separar' | 'resolucao' | 'automato' | 'teoria' | 'pdf' | 'arvore';

export interface Novidade {
  icone: NovidadeIcone;
  titulo: string;
  texto: string;
  link?: { path: string; label: string };
}

export const NOVIDADES = {
  versao: '2026-10-20',
  quando: 'Outubro de 2026',
  mudou: [
    {
      icone: 'exercicios',
      titulo: 'Exercícios resolvidos têm página própria',
      texto: 'Saíram da Teoria: uma aba por lista, na ordem do PDF. Links antigos continuam valendo.',
      link: { path: '/exercicios', label: 'Abrir' },
    },
    {
      icone: 'barra',
      titulo: 'Mesma barra em todas as páginas',
      texto: 'As cinco páginas sempre no topo. No celular, ficam no botão ⋯.',
    },
    {
      icone: 'separar',
      titulo: 'GLC: questões 5 a 8 separadas',
      texto: 'Antes eram um bloco só; agora cada uma tem correção. Respostas mantidas.',
      link: { path: '/exercicios/ex-glc-q5', label: 'Ver' },
    },
    {
      icone: 'resolucao',
      titulo: 'Resolução comentada fica fechada',
      texto: 'Tente primeiro: a resolução de cada questão abre em “mostrar”.',
    },
  ] as Novidade[],
  novo: [
    {
      icone: 'automato',
      titulo: 'Correção em todas as listas',
      texto: 'Gramáticas e Gramáticas Regulares ganharam campo de resposta, inclusive para AF/AFD.',
      link: { path: '/exercicios/lista-gramaticas', label: 'Testar' },
    },
    {
      icone: 'teoria',
      titulo: '“Dúvida?” leva à teoria da questão',
      texto: 'Cada exercício tem atalho para a seção que explica o assunto. Três seções novas.',
    },
    {
      icone: 'pdf',
      titulo: 'PDF com as suas anotações',
      texto: 'Nas Atividades, baixe a lista com o que você escreveu com a caneta.',
      link: { path: '/atividades', label: 'Abrir' },
    },
    {
      icone: 'arvore',
      titulo: 'Derivações passo a passo',
      texto: 'Clique no não-terminal, escolha a regra, gere o gabarito e monte a árvore.',
      link: { path: '/derivacoes', label: 'Abrir' },
    },
  ] as Novidade[],
};
