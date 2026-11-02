/* Testes das regras de datas/níveis do projeto real, sem DOM ou backend.
   Executar: node tests/test-streak.js (na pasta Sonne). */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const code = fs.readFileSync(path.join(__dirname, '..', 'script.js'), 'utf8');

function extract(name) {
  const start = code.indexOf(`function ${name}(`);
  assert(start !== -1, `Função ${name} não encontrada`);
  const first = code.indexOf('{', start);
  let depth = 0;
  for (let i = first; i < code.length; i++) {
    if (code[i] === '{') depth++;
    else if (code[i] === '}' && --depth === 0) return code.slice(start, i + 1);
  }
  throw new Error('Bloco incompleto: ' + name);
}
const functions = ['localDay', 'dayIndex', 'attributeMetrics', 'combinedStreak', 'derive'];
const source = `const DAY_MS = 86400000;\n${functions.map(extract).join('\n')}\n({attributeMetrics, combinedStreak, derive})`;
const { attributeMetrics, combinedStreak, derive } = vm.runInNewContext(source);
const skill = (id, createdAt, completions) => ({ id, name:id, icon:'⚔', color:'#fbbf24', createdAt, completions });

// Um registro ontem mantém a ofensiva viva até o fim do dia de hoje.
const a = skill('treino', '2026-10-01', ['2026-10-01', '2026-10-02']);
assert.equal(attributeMetrics(a, '2026-10-02').streak, 2);
assert.equal(attributeMetrics(a, '2026-10-03').streak, 2);
assert.equal(attributeMetrics(a, '2026-10-03').level, 2);
assert.equal(attributeMetrics(a, '2026-10-04').streak, 0);
assert.equal(attributeMetrics(a, '2026-10-04').level, 1);
assert.equal(attributeMetrics(a, '2026-10-05').level, 0);

// A ofensiva global conta qualquer atributo, não exige o mesmo todos os dias.
const b = skill('estudo', '2026-10-01', ['2026-10-03']);
const result = derive({ attributes:[a,b] }, '2026-10-03');
assert.equal(result.streak, 3);
assert.equal(result.total, 3);
assert.equal(result.last7, 3);
assert.equal(combinedStreak(['2026-10-02','2026-10-03'], '2026-10-04'), 2);
assert.equal(combinedStreak(['2026-10-02','2026-10-03'], '2026-10-05'), 0);
console.log('OK — ofensiva, dias perdidos, nível e soma de atributos.');
