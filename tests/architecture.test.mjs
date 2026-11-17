import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = file => readFile(new URL(file, import.meta.url), 'utf8');

test('o shell compõe os dois microfrontends por Module Federation', async () => {
  const shell = await read('../apps/shell/src/App.jsx');
  const webpack = await read('../scripts/webpack.common.cjs');
  assert.match(shell, /import\('workouts\/App'\)/);
  assert.match(shell, /import\('progress\/App'\)/);
  assert.match(shell, /gatewayRequest\('\/api\/bff\/dashboard'/);
  assert.match(webpack, /new ModuleFederationPlugin/);
});

test('cada microfrontend usa seu contrato do Gateway sem importar o outro domínio', async () => {
  for (const [directory, route, other] of [
    ['workouts', '/api/treinos', 'progress'],
    ['progress', '/api/sessoes', 'workouts']
  ]) {
    const app = await read(`../apps/${directory}/src/App.jsx`);
    const api = await read(`../apps/${directory}/src/api.js`);
    assert.ok(api.includes(`path: '${route}'`));
    assert.match(api, /createServerRepository/);
    assert.doesNotMatch(app + api, new RegExp(`(?:\.\./)+${other}/|azurewebsites\\.net|localhost:808[12]`));
  }
});
