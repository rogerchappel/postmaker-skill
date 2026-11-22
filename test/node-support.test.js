import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url)));
const workflow = await readFile(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8');
const readme = await readFile(new URL('../README.md', import.meta.url), 'utf8');

test('package engine range, CI matrix, and README agree on supported Node majors', () => {
  const engine = packageJson.engines.node;
  const engineRange = engine.match(/^>=(\d+)\s+<([\d]+)$/);
  assert.ok(engineRange, `expected a simple inclusive/exclusive Node range, got ${engine}`);
  const [, minimum, exclusiveMaximum] = engineRange;
  const supported = [];
  for (let major = Number(minimum); major < Number(exclusiveMaximum); major += 1) supported.push(major);

  const matrix = workflow.match(/node-version:\s*\[([^\]]+)\]/);
  assert.ok(matrix, 'CI must declare a Node version matrix');
  const ciMajors = matrix[1].split(',').map((version) => Number(version.trim()));
  const readmeSection = readme.match(/## Supported Node\.js versions\n([\s\S]*?)(?=\n## |$)/);
  assert.ok(readmeSection, 'README must document supported Node.js versions');
  const documented = [...readmeSection[1].matchAll(/\b(20|22|24)\b/g)].map((match) => Number(match[1]));
  assert.deepEqual(ciMajors, supported.filter((major) => ciMajors.includes(major)), 'CI majors must be within package engine range');
  assert.deepEqual([...new Set(documented)].sort((a, b) => a - b), ciMajors.slice().sort((a, b) => a - b));
});

test('the declared Node engine range rejects its exclusive upper bound', () => {
  const engine = packageJson.engines.node;
  const engineRange = engine.match(/^>=(\d+)\s+<([\d]+)$/);
  assert.ok(engineRange, `expected a simple inclusive/exclusive Node range, got ${engine}`);
  const exclusiveMaximum = Number(engineRange[2]);
  const node25 = `${exclusiveMaximum}.0.0`;
  const node25Major = Number(node25.split('.')[0]);
  assert.ok(node25Major >= exclusiveMaximum, `Node ${node25} must be at or above the exclusive bound`);
  assert.match(engine, new RegExp(`<${exclusiveMaximum}(?:\\s|$)`),
    `expected ${engine} to exclude Node ${node25}`);
});
