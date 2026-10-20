import {
  EPS, checkDerivation, checkTree, compareLanguage, parseGrammar, parseTree, showForm, tokenizeForm,
} from './grammar';
import { AutomatonModel, determinismIssues, equivalence } from './automaton';

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
  /**
   * `count` palavras diferentes que NÃO estão em L(G), uma por linha (ε vale).
   * `lang` decide a pertinência; a conferência do conteúdo valida `lang` contra a gramática.
   */
  | { kind: 'outside'; alphabet: string[]; lang: (w: string) => boolean; count: number }
  /** Construir gramática: L(G) do aluno × linguagem pedida, em todas as palavras até maxLen. */
  | { kind: 'build'; alphabet: string[]; lang: (w: string) => boolean; maxLen: number }
  /**
   * Construir autômato, escrito como texto (ver parseAutomatonText): L(aluno) × L(ref),
   * decidido de forma exata pelo motor. `deterministic` exige um AFD. `exact` exige
   * a mesma estrutura de `ref` (a tradução direta da gramática), a menos dos nomes
   * dos estados: outro autômato com a mesma linguagem, como o AFD da construção de
   * subconjuntos, não é aceito.
   */
  | { kind: 'automaton'; ref: AutomatonModel; deterministic: boolean; exact?: boolean };

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
    case 'outside': return gradeOutside(c, answer);
    case 'choice': {
      const i = Number.parseInt(answer, 10);
      if (!Number.isInteger(i)) return { verdict: 'bad', title: 'Escolha uma opção.', items: [] };
      const ok = i === c.correct;
      return { verdict: ok ? 'ok' : 'bad', title: ok ? 'Correto.' : 'Ainda não.', items: ok ? [] : [{ ok: false, text: `“${c.options[i] ?? '?'}” não é a resposta certa.` }] };
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
    case 'automaton': return gradeAutomaton(c, answer);
  }
}

// ───────────────── autômato escrito como texto ─────────────────

/** Limites para a resposta digitada (entrada não confiável). */
const AUT_LIMITS = { lines: 80, states: 30, transitions: 200, name: 12 };
const NAME = /^[\p{L}\p{N}_']+$/u;

/**
 * Lê um autômato digitado, uma informação por linha:
 *   inicial: S            finais: B, F          (vírgula ou espaço entre nomes)
 *   S a B                 S a,b B               S -a-> B              δ(S, a) = B
 * No AFN, δ(S, a) = {A, B} e o símbolo ε (ou "eps") são aceitos. Linhas
 * vazias e iniciadas por # ou // são ignoradas.
 */
export function parseAutomatonText(text: string, alphabet: string[]): { model: AutomatonModel } | { problems: string[] } {
  const problems: string[] = [];
  const order: string[] = [];
  const seen = new Set<string>();
  const add = (n: string, line: number): boolean => {
    if (n.length > AUT_LIMITS.name || !NAME.test(n)) { problems.push(`Linha ${line}: “${n}” não é um nome de estado válido (letras, números ou _).`); return false; }
    if (!seen.has(n)) {
      if (seen.size >= AUT_LIMITS.states) { problems.push(`Mais de ${AUT_LIMITS.states} estados: simplifique o autômato.`); return false; }
      seen.add(n); order.push(n);
    }
    return true;
  };
  const sym = (s: string) => (s === 'eps' || s === 'ε' || s === 'λ' ? EPS : s);
  let initial: string | null = null;
  const finals = new Set<string>();
  const trans: { from: string; to: string; symbols: string[] }[] = [];

  const lines = text.split('\n').slice(0, AUT_LIMITS.lines);
  lines.forEach((raw, i) => {
    const n = i + 1;
    const l = raw.trim();
    if (!l || l.startsWith('#') || l.startsWith('//')) return;
    const head = /^(inicial|in[ií]cio|finais|final|aceita[çc][aã]o)\s*[:=]?\s*(.*)$/i.exec(l);
    if (head) {
      const names = head[2].replace(/[{}]/g, ' ').split(/[\s,]+/).filter(Boolean);
      if (/^in/i.test(head[1])) {
        if (names.length !== 1) { problems.push(`Linha ${n}: indique exatamente um estado inicial.`); return; }
        if (add(names[0], n)) initial = names[0];
      } else {
        for (const f of names) if (add(f, n)) finals.add(f);
      }
      return;
    }
    // δ(S, a) = B  |  δ(S, a) = {A, B}  |  S -a-> B  |  S --a,b--> B  |  S a B
    const m = /^[δd]\s*\(\s*(\S+?)\s*,\s*(\S+?)\s*\)\s*=\s*\{?\s*([^}]*?)\s*\}?$/.exec(l)
      ?? /^(\S+)\s*-+\s*([^\s>-][^>]*?)\s*-+>\s*(\S+)$/.exec(l)
      ?? /^(\S+)\s+(\S+)\s+(\S+)$/.exec(l);
    if (!m) { problems.push(`Linha ${n}: escreva “origem símbolo destino” (ex.: S a B).`); return; }
    const [, from, symsTxt, toTxt] = m;
    const symbols = symsTxt.split(',').map((s) => sym(s.trim())).filter(Boolean);
    const bad = symbols.filter((s) => s !== EPS && !alphabet.includes(s));
    if (bad.length) { problems.push(`Linha ${n}: “${bad.join(', ')}” não está em Σ = {${alphabet.join(', ')}}.`); return; }
    const tos = toTxt.split(',').map((s) => s.trim()).filter(Boolean);
    if (!symbols.length || !tos.length) { problems.push(`Linha ${n}: falta o símbolo ou o destino.`); return; }
    if (!add(from, n) || !tos.every((t) => add(t, n))) return;
    for (const to of tos) {
      if (trans.length >= AUT_LIMITS.transitions) { problems.push(`Mais de ${AUT_LIMITS.transitions} transições.`); return; }
      trans.push({ from, to, symbols });
    }
  });
  if (text.split('\n').length > AUT_LIMITS.lines) problems.push(`Só as primeiras ${AUT_LIMITS.lines} linhas foram lidas.`);
  if (!initial && !problems.length) problems.push('Falta a linha “inicial: …” com o estado inicial.');
  if (problems.length) return { problems: [...new Set(problems)].slice(0, 6) };
  return {
    model: {
      kind: 'afn',
      alphabet: [...alphabet],
      states: order.map((id) => ({ id, name: id, x: 0, y: 0, initial: id === initial, accepting: finals.has(id) })),
      transitions: trans,
    },
  };
}

function gradeAutomaton(c: Extract<ExCheck, { kind: 'automaton' }>, answer: string): Feedback {
  const alphabet = c.ref.alphabet?.length ? c.ref.alphabet : ['0', '1'];
  const p = parseAutomatonText(answer, alphabet);
  if ('problems' in p) return { verdict: 'bad', title: 'O autômato não foi lido.', items: p.problems.map((t) => ({ ok: false, text: t })) };
  const eq = equivalence(p.model, c.ref);
  if ('error' in eq) return { verdict: 'bad', title: eq.error, items: [] };
  const items: FeedbackItem[] = [];
  if (eq.equivalent) items.push({ ok: true, text: 'Aceita exatamente a mesma linguagem da resposta-modelo (conferido em todas as palavras, não só nas curtas).' });
  else items.push({ ok: false, text: eq.acceptedBy === 'a'
    ? `Aceita ${showWord(eq.witness)}, que não está na linguagem (é a menor palavra em que difere).`
    : `Rejeita ${showWord(eq.witness)}, que está na linguagem (é a menor palavra em que difere).` });
  let det = true;
  if (c.deterministic) {
    const errs = determinismIssues({ ...p.model, kind: 'afd' }).filter((i) => i.severity === 'error');
    det = !errs.length;
    items.push(det ? { ok: true, text: 'É determinístico: no máximo uma saída por símbolo, sem ε.' } : { ok: false, text: `Não é um AFD: ${errs[0].message}` });
  }
  if (c.exact && eq.equivalent) {
    if (sameShape(p.model, c.ref)) {
      items.push({ ok: true, text: 'É a tradução direta da gramática: os mesmos estados, inicial, finais e transições (nomes à parte).' });
    } else {
      const n = p.model.states.length, refN = c.ref.states.length;
      const isDet = (m: AutomatonModel) => !determinismIssues({ ...m, kind: 'afd' }).some((i) => i.severity === 'error');
      const refDet = isDet(c.ref);
      // AFD no lugar do AFN: a tradução é não determinística, ou tem outro número de estados
      if (isDet(p.model) && (!refDet || n !== refN)) {
        items.push({ ok: false, text: refDet
          ? `É um AFD com ${n} estados (como o da construção de subconjuntos, ou com estado morto). A disciplina pede o AFN da tradução direta, que tem ${refN} estados: um por não terminal, mais o final F quando há regra A → a.`
          : `É determinístico, mas a tradução direta desta gramática é um AFN: algum estado tem duas saídas pelo mesmo símbolo. A disciplina pede esse AFN, com ${refN} estados: um por não terminal, mais o final F quando há regra A → a.` });
        return { verdict: 'bad', title: 'Isso é um AFD. A resposta esperada é o AFN da tradução direta.', items };
      }
      const m = countEdges(p.model), refM = countEdges(c.ref);
      items.push({ ok: false, text: `A tradução direta tem ${refN} estados e ${refM} transições; o seu tem ${n} e ${m}. Cada regra A → xB vira A —x→ B, cada A → x vira A —x→ F (final novo) e A → ε torna A final.` });
      return { verdict: 'partial', title: 'Quase: a linguagem está certa, mas não é a tradução direta da gramática.', items };
    }
  }
  const ok = eq.equivalent && det;
  return { verdict: ok ? 'ok' : eq.equivalent ? 'partial' : 'bad', title: ok ? 'Correto.' : eq.equivalent ? 'Quase: a linguagem está certa, mas a questão pede um AFD.' : 'Ainda não.', items };
}

/** Transições contadas símbolo a símbolo (A —a,b→ B vale 2). */
const edgeKeys = (m: AutomatonModel, name: (id: string) => string = (id) => id) =>
  new Set(m.transitions.flatMap((t) => t.symbols.map((s) => `${name(t.from)}\u0001${s}\u0001${name(t.to)}`)));
const countEdges = (m: AutomatonModel) => edgeKeys(m).size;

/**
 * Mesma estrutura, a menos dos nomes: existe uma bijeção entre os estados que
 * preserva inicial, finais e todas as transições. Só é chamada com o mesmo
 * número de estados da referência (no máximo 5 nas listas), então a busca é pequena.
 */
function sameShape(a: AutomatonModel, b: AutomatonModel): boolean {
  if (a.states.length !== b.states.length) return false;
  const eb = edgeKeys(b);
  if (countEdges(a) !== eb.size) return false;
  const map = new Map<string, string>(), used = new Set<string>();
  const go = (i: number): boolean => {
    if (i === a.states.length) return [...edgeKeys(a, (id) => map.get(id)!)].every((k) => eb.has(k));
    const x = a.states[i];
    for (const y of b.states) {
      if (used.has(y.id) || y.initial !== x.initial || y.accepting !== x.accepting) continue;
      map.set(x.id, y.id); used.add(y.id);
      if (go(i + 1)) return true;
      used.delete(y.id);
    }
    map.delete(x.id);
    return false;
  };
  return go(0);
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

function gradeOutside(c: Extract<ExCheck, { kind: 'outside' }>, answer: string): Feedback {
  const lines = answer.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).slice(0, 20);
  const items: FeedbackItem[] = [];
  const found = new Set<string>();
  for (const raw of lines) {
    // ε, eps, λ e "vazia" representam a palavra vazia; espaços entre símbolos são ignorados
    const w = /^(ε|eps|λ|vazia)$/i.test(raw) ? '' : raw.replace(/\s+/g, '');
    if (w.length > 40) { items.push({ ok: false, text: `“${raw.slice(0, 20)}…” é longa demais (máx. 40 símbolos).` }); continue; }
    const bad = [...w].find((s) => !c.alphabet.includes(s));
    if (bad) { items.push({ ok: false, text: `“${raw}”: o símbolo “${bad}” não está no alfabeto {${c.alphabet.join(', ')}}.` }); continue; }
    if (found.has(w)) { items.push({ ok: false, text: `${showWord(w)} repete uma palavra anterior.` }); continue; }
    if (c.lang(w)) { items.push({ ok: false, text: `${showWord(w)} é gerada pela gramática: está em L(G).` }); continue; }
    found.add(w);
    items.push({ ok: true, text: `${showWord(w)} ∉ L(G).` });
  }
  const n = found.size;
  items.push({ ok: n >= c.count, text: `${n} de ${c.count} palavras fora de L(G).` });
  const title = n >= c.count ? 'Correto.' : !lines.length ? `Escreva ${c.count} palavras, uma por linha.` : 'Ainda faltam palavras que não estejam em L(G).';
  return { verdict: n >= c.count ? 'ok' : n > 0 ? 'partial' : 'bad', title, items };
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

