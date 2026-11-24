import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url)));
const lock = JSON.parse(await readFile(new URL('../package-lock.json', import.meta.url)));
assert.equal(lock.packages?.['']?.engines?.node, packageJson.engines?.node,
  'package-lock.json root Node engine must match package.json');
