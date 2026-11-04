/* Regressão: quatro conquistas novas e marcos existentes.
   Executar: node tests/test-achievements.js (na pasta Habitous). */
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
const functions = ['dayIndex', 'attributeMetrics', 'combinedStreak', 'derive', 'awardAchievements'];
const source = `const DAY_MS = 86400000;
const localDay = () => '2026-11-04';
${functions.map(extract).join('\n')}
({attributeMetrics, derive, awardAchievements})`;
const { attributeMetrics, derive, awardAchievements } = vm.runInNewContext(source);
const day = offset => new Date(Date.UTC(2026, 9, 1 + offset)).toISOString().slice(0, 10);
const skill = (id, dates) => ({ id, name: id, createdAt: day(0), completions: dates });

// Três dias seguidos na mesma atividade, com data real de desbloqueio.
const first = skill('treino', [day(0), day(1), day(2)]);
const onlyOne = { attributes: [first], achievements: {} };
assert.equal(awardAchievements(onlyOne), true);
assert.equal(onlyOne.achievements['ritmo-firme'], day(2));
assert.equal(onlyOne.achievements['primeiro-passo'], day(0));
assert.equal(onlyOne.achievements['trinta-vitorias'], undefined);
assert.equal(onlyOne.achievements['dia-produtivo'], undefined);
assert.equal(onlyOne.achievements['constancia-imparavel'], undefined);
assert.equal(awardAchievements(onlyOne), false);

// Exatamente três hábitos diferentes no mesmo dia.
const three = { attributes: [skill('treino', [day(3)]), skill('estudo', [day(3)]), skill('leitura', [day(3)])], achievements: {} };
awardAchievements(three);
assert.equal(three.achievements['dia-produtivo'], day(3));

// Trinta conclusões globais: marco real é no dia 28 (2 extras no dia 3).
// Uma sequência de 30 dias em um único hábito tem sua própria data.
const thirtyDays = Array.from({ length: 30 }, (_, i) => day(i));
const long = { attributes: [skill('treino', thirtyDays), skill('estudo', [day(2)]), skill('leitura', [day(2)])], achievements: {} };
awardAchievements(long);
assert.equal(long.achievements['ritmo-firme'], day(2));
assert.equal(long.achievements['persistente'], day(6));
assert.equal(long.achievements['disciplinado'], day(9));
assert.equal(long.achievements['dia-produtivo'], day(2));
assert.equal(long.achievements['trinta-vitorias'], day(27));
assert.equal(long.achievements['constancia-imparavel'], day(29));

// Os desbloqueios persistem, mesmo quando o atributo é removido.
long.attributes = [];
assert.equal(awardAchievements(long), false);
assert.equal(long.achievements['constancia-imparavel'], day(29));
console.log('OK — quatro novas conquistas e persistência dos desbloqueios.');
