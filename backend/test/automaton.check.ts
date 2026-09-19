/**
 * Checagem executável do motor: `npm run check:domain`.
 * Compara `equivalence` com força bruta em AFNs aleatórios e cobre parseAlphabet.
 */
import { strict as assert } from 'node:assert';
import {
  AutomatonModel, EPS, equivalence, parseAlphabet, simulateNfa,
} from '../src/domain/automaton';

function acceptsAny(m: AutomatonModel, w: string): boolean {
  const r = simulateNfa(m, w);
  if ('error' in r) throw new Error(r.error);
  return r.accepted;
}

function words(sigma: string[], maxLen: number): string[] {
  const out = [''];
  for (let i = 0; i < out.length; i++)
    if (out[i].length < maxLen) for (const s of sigma) out.push(out[i] + s);
  return out; // em ordem de tamanho
}

let seed = 42;
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);

function randomNfa(sigma: string[]): AutomatonModel {
  const n = 1 + Math.floor(rand() * 3);
  const states = Array.from({ length: n }, (_, i) => ({
    id: 's' + i, name: 'q' + i, initial: i === 0, accepting: rand() < 0.4, x: 0, y: 0,
  }));
  const transitions: AutomatonModel['transitions'] = [];
  for (const from of states)
    for (const to of states) {
      const symbols = [...sigma, EPS].filter(() => rand() < 0.3);
      if (symbols.length) transitions.push({ from: from.id, to: to.id, symbols });
    }
  return { kind: 'afn', alphabet: sigma, states, transitions };
}

// 1) Equivalência x força bruta
const sigma = ['a', 'b'];
const all = words(sigma, 9);
for (let i = 0; i < 3000; i++) {
  const a = randomNfa(sigma), b = randomNfa(sigma);
  const r = equivalence(a, b);
  if ('error' in r) throw new Error(r.error);
  const firstDiff = all.find((w) => acceptsAny(a, w) !== acceptsAny(b, w));
  if (r.equivalent) {
    assert.equal(firstDiff, undefined, `disse equivalente, mas diverge em "${firstDiff}"`);
  } else {
    assert.notEqual(acceptsAny(a, r.witness), acceptsAny(b, r.witness), 'testemunha não diverge');
    assert.equal(acceptsAny(a, r.witness), r.acceptedBy === 'a');
    if (firstDiff !== undefined) assert.equal(r.witness.length, firstDiff.length, 'testemunha não é mínima');
  }
}

// 2) Alfabetos diferentes: símbolo desconhecido por um lado = rejeição nesse lado
const onlyA: AutomatonModel = {
  alphabet: ['a'], transitions: [{ from: 's0', to: 's0', symbols: ['a'] }],
  states: [{ id: 's0', name: 'q0', initial: true, accepting: true, x: 0, y: 0 }],
};
const aOrB: AutomatonModel = {
  alphabet: ['a', 'b'], transitions: [{ from: 's0', to: 's0', symbols: ['a', 'b'] }],
  states: [{ id: 's0', name: 'q0', initial: true, accepting: true, x: 0, y: 0 }],
};
assert.deepEqual(equivalence(onlyA, aOrB), { equivalent: false, alphabet: ['a', 'b'], witness: 'b', acceptedBy: 'b' });

// 3) parseAlphabet
assert.deepEqual(parseAlphabet('a, b, c'), ['a', 'b', 'c']);
assert.deepEqual(parseAlphabet('01'), ['0', '1']);
assert.ok('error' in (parseAlphabet('a, bb') as object));
assert.ok('error' in (parseAlphabet('a,a') as object));
assert.ok('error' in (parseAlphabet(`a,${EPS}`) as object));
assert.ok('error' in (parseAlphabet(' ') as object));

console.log('automaton.check: ok');
