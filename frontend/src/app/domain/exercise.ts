import {
  EPS, checkDerivation, checkTree, compareLanguage, parseGrammar, parseTree, showForm, tokenizeForm,
} from './grammar';

/**
 * Exercícios corrigíveis — tipos e correção, sem Angular.
 * A resposta do aluno é sempre texto livre (entrada não confiável): passa pelo
 * mesmo motor da página de derivações, com os mesmos limites de tamanho.
 */

export type ExCheck =
  /** Derivação de `word`, na ordem pedida. */
  | { kind: 'derivation'; grammar: string; word: string; order: 'left' | 'right' | 'any' }
  /** Árvore de derivação de `word` (notação com colchetes). */
  | { kind: 'tree'; grammar: string; word: string }
  /** `count` sentenças diferentes de L(G), cada uma com sua derivação (blocos separados por linha em branco). */
  | { kind: 'sentences'; grammar: string; count: number }
  | { kind: 'choice'; options: string[]; correct: number }
  /** Resposta dissertativa: confere se os pontos-chave aparecem (autoavaliação guiada). */
  | { kind: 'concept'; groups: { label: string; terms: string[] }[] }
  /** Construir gramática: L(G) do aluno × linguagem pedida, em todas as palavras até maxLen. */
  | { kind: 'build'; alphabet: string[]; lang: (w: string) => boolean; maxLen: number };

export interface Exercise {
  id: string;          // chave de armazenamento: única e estável
  label: string;       // "a)", "1a — mais à esquerda"
  prompt: string;      // HTML estático escrito por nós
  check: ExCheck;
  answer: string;      // resposta-modelo (texto puro)
  explain?: string;    // HTML estático
}

export type Verdict = 'ok' | 'partial' | 'bad';
export interface FeedbackItem { ok: boolean; text: string }
export interface Feedback { verdict: Verdict; title: string; items: FeedbackItem[] }

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ');
const showWord = (w: string) => (w === '' ? EPS : w);

/** Valor inicial do campo de resposta. */
export function initialAnswer(ex: Exercise): string {
  const c = ex.check;
  if (c.kind === 'derivation' || c.kind === 'tree') return parseGrammar(c.grammar).grammar?.start ?? '';
  return '';
}

export function grade(ex: Exercise, answer: string): Feedback {
  const c = ex.check;
  switch (c.kind) {
    case 'derivation': return gradeDerivation(c.grammar, c.word, c.order, answer);
    case 'tree': return gradeTree(c.grammar, c.word, answer);
    case 'sentences': return gradeSentences(c.grammar, c.count, answer);
    case 'choice': {
      const i = Number.parseInt(answer, 10);
      if (!Number.isInteger(i)) return { verdict: 'bad', title: 'Escolha uma opção.', items: [] };
      const ok = i === c.correct;
      return { verdict: ok ? 'ok' : 'bad', title: ok ? 'Correto.' : 'Ainda não.', items: ok ? [] : [{ ok: false, text: `“${c.options[i] ?? '?'}” não é a classificação desta gramática.` }] };
    }
    case 'concept': {
      const a = norm(answer);
      if (a.trim().length < 10) return { verdict: 'bad', title: 'Escreva a sua definição.', items: [] };
      const items = c.groups.map((g) => ({ ok: g.terms.some((t) => a.includes(norm(t))), text: g.label }));
      const hit = items.filter((i) => i.ok).length;
      const verdict: Verdict = hit === items.length ? 'ok' : hit * 2 >= items.length ? 'partial' : 'bad';
      return { verdict, title: `Pontos-chave cobertos: ${hit} de ${items.length}. Compare com a resposta-modelo.`, items };
    }
    case 'build': return gradeBuild(c, answer);
  }
}

function gradeDerivation(gs: string, ws: string, order: 'left' | 'right' | 'any', answer: string): Feedback {
  const g = parseGrammar(gs).grammar!;
  const w = tokenizeForm(g, ws);
  const word = 'tokens' in w ? w.tokens : null;
  const d = checkDerivation(g, answer, word);
  const items: FeedbackItem[] = [];
  items.push({ ok: d.startsAtStart, text: `Começa no símbolo de partida ${g.start}.` });
  const firstErr = d.steps.find((s) => s.status === 'error' && s.line);
  items.push({ ok: d.allValid, text: d.allValid ? 'Todos os passos aplicam uma regra.' : `Linha ${firstErr?.line ?? '?'}: ${firstErr?.message ?? 'passo inválido.'}` });
  items.push({ ok: d.endsInSentence, text: d.endsInSentence ? 'Termina numa sentença.' : 'Ainda sobra não terminal na última forma.' });
  items.push({ ok: !!d.matchesWord, text: `Chega na palavra pedida (${ws}).` });
  if (order !== 'any') {
    const want = order === 'left' ? 'leftmost' : 'rightmost';
    const ok = d[want];
    const bad = d.steps.find((s) => s.status === 'ok' && !(order === 'left' ? s.leftmost : s.rightmost));
    items.push({
      ok,
      text: ok ? `É mais à ${order === 'left' ? 'esquerda' : 'direita'} em todos os passos.`
        : `Não é mais à ${order === 'left' ? 'esquerda' : 'direita'}${bad ? `: na linha ${bad.line} havia outro não terminal mais à ${order === 'left' ? 'esquerda' : 'direita'} para trocar` : ''}.`,
    });
  }
  return summarize(items, d.allValid && d.startsAtStart);
}

function gradeTree(gs: string, ws: string, answer: string): Feedback {
  const g = parseGrammar(gs).grammar!;
  const w = tokenizeForm(g, ws);
  const word = 'tokens' in w ? w.tokens : null;
  const t = parseTree(g, answer);
  if (!t.root) return { verdict: 'bad', title: t.error ?? 'Monte a árvore a partir da raiz.', items: [] };
  const r = checkTree(g, t.root, word);
  const items: FeedbackItem[] = [
    { ok: t.root.sym === g.start, text: `A raiz é o símbolo de partida ${g.start}.` },
    ...(r.issues.length ? r.issues.slice(0, 4).map((i) => ({ ok: false, text: i.message })) : [{ ok: true, text: 'Cada nó interno usa uma regra da gramática.' }]),
    { ok: r.complete, text: r.complete ? 'Todas as folhas são terminais (ou ε).' : `Faltam ${r.incomplete.length} não terminal(is) para expandir.` },
    { ok: !!r.matchesWord, text: `Fronteira: ${showForm(g, r.frontier)} ${r.matchesWord ? '=' : '≠'} ${ws}.` },
  ];
  return summarize(items, r.valid);
}

function gradeSentences(gs: string, count: number, answer: string): Feedback {
  const g = parseGrammar(gs).grammar!;
  const blocks = answer.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean).slice(0, 12);
  const items: FeedbackItem[] = [];
  const found = new Set<string>();
  blocks.forEach((b, i) => {
    const d = checkDerivation(g, b, null);
    const last = [...d.steps].reverse().find((s) => s.tokens)?.tokens ?? null;
    const w = last ? last.join('') : '?';
    if (d.allValid && d.startsAtStart && d.endsInSentence) {
      const dup = found.has(w);
      found.add(w);
      items.push({ ok: !dup, text: dup ? `${i + 1}ª derivação: ${showWord(w)} repete uma cadeia anterior.` : `${i + 1}ª derivação: ${showWord(w)} ∈ L(G), ${d.count} passo(s).` });
    } else {
      const e = d.steps.find((s) => s.status === 'error');
      const where = e ? ` — “${e.text}”: ${e.message}` : d.endsInSentence ? '' : ' — ainda sobra não terminal.';
      items.push({ ok: false, text: `${i + 1}ª derivação inválida${where}` });
    }
  });
  const n = found.size;
  items.push({ ok: n >= count, text: `${n} de ${count} cadeias diferentes com derivação correta.` });
  const title = n >= count ? 'Correto.'
    : blocks.length < count ? `Faltam derivações: escreva ${count}, separadas por uma linha em branco.`
    : 'Ainda faltam cadeias diferentes com derivação correta.';
  return { verdict: n >= count ? 'ok' : n > 0 ? 'partial' : 'bad', title, items };
}

function gradeBuild(c: Extract<ExCheck, { kind: 'build' }>, answer: string): Feedback {
  const p = parseGrammar(answer);
  if (!p.grammar) return { verdict: 'bad', title: 'A gramática não foi lida.', items: p.problems.map((x) => ({ ok: false, text: (x.line ? `Linha ${x.line}: ` : '') + x.message })) };
  const g = p.grammar;
  const diff = compareLanguage(g, c.alphabet, c.lang, c.maxLen);
  if (diff.badSymbols.length) {
    return { verdict: 'bad', title: 'Símbolos fora do alfabeto.', items: [{ ok: false, text: `Terminais que não estão em Σ = {${c.alphabet.join(', ')}}: ${diff.badSymbols.join(', ')}. (Não terminal precisa ter regra própria.)` }] };
  }
  const items: FeedbackItem[] = [];
  items.push({ ok: !diff.extra.length, text: diff.extra.length ? `Gera palavras que não deveria: ${diff.extra.map(showWord).join(', ')}.` : 'Não gera nenhuma palavra fora da linguagem.' });
  items.push({ ok: !diff.missing.length, text: diff.missing.length ? `Não gera palavras da linguagem: ${diff.missing.map(showWord).join(', ')}.` : 'Gera todas as palavras da linguagem.' });
  const ok = !diff.extra.length && !diff.missing.length;
  const scope = `conferido em todas as ${diff.tested} palavras de Σ* com até ${c.maxLen} símbolos${diff.complete ? '' : ' (busca parcial: gramática muito ramificada)'}`;
  return { verdict: ok ? 'ok' : 'bad', title: ok ? `Correto — ${scope}.` : `Ainda não — ${scope}.`, items };
}

function summarize(items: FeedbackItem[], structural: boolean): Feedback {
  const all = items.every((i) => i.ok);
  return { verdict: all ? 'ok' : structural ? 'partial' : 'bad', title: all ? 'Correto.' : structural ? 'Quase: a estrutura está certa, falta algo.' : 'Ainda não.', items };
}

