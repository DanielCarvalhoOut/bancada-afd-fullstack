/**
 * Conteúdo do aviso de novidades. Para a próxima atualização: troque `versao`
 * (quem já viu a anterior vê de novo) e edite as listas.
 */
export type NovidadeIcone = 'exercicios' | 'barra' | 'separar' | 'automato' | 'teoria' | 'pdf' | 'arvore';

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
      texto: 'Saíram de dentro da Teoria. Uma aba por lista, todas as questões na ordem do PDF. Links antigos continuam funcionando.',
      link: { path: '/exercicios', label: 'Abrir' },
    },
    {
      icone: 'barra',
      titulo: 'Mesma barra em todas as páginas',
      texto: 'Bancada, Teoria, Exercícios, Derivações e Atividades sempre no topo. No celular, no botão ⋯.',
    },
    {
      icone: 'separar',
      titulo: 'GLC: questões 5 a 8 separadas',
      texto: 'Antes eram um bloco só; agora cada uma tem sua correção. Suas respostas foram mantidas.',
      link: { path: '/exercicios/ex-glc-q5', label: 'Ver' },
    },
  ] as Novidade[],
  novo: [
    {
      icone: 'automato',
      titulo: 'Correção de autômatos',
      texto: 'Gramáticas Regulares Q2–Q5: escreva o AF/AFD e veja na hora a palavra que mostra o erro.',
      link: { path: '/exercicios/ex-gr-q2', label: 'Testar' },
    },
    {
      icone: 'teoria',
      titulo: '“Dúvida?” leva à teoria da questão',
      texto: 'Cada exercício tem um atalho para a seção que explica o assunto. Três seções novas de GLC.',
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
