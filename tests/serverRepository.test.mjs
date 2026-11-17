import test from 'node:test';
import assert from 'node:assert/strict';
import { createServerRepository } from '../packages/shared/src/serverRepository.js';

const path = '/api/treinos';
const record = { id: 'ficha-1', name: 'Treino A' };
const validate = row => typeof row?.id === 'string';

test('só reflete uma gravação após confirmação do Gateway', async () => {
  const calls = [];
  let confirm;
  const result = new Promise(resolve => { confirm = resolve; });
  const repo = createServerRepository({ path, validate, request: (url, options) => {
    calls.push({ url, ...options });
    return result;
  } });

  const saving = repo.save(record);
  assert.deepEqual(repo.read(), []);
  confirm(record);
  await saving;
  assert.deepEqual(repo.read(), [record]);
  assert.deepEqual(calls, [{ url: path, method: 'POST', body: record }]);
});

test('rejeição da API preserva os dados exibidos e permite tentar novamente', async () => {
  let failed = true;
  const repo = createServerRepository({ path, validate, request: async (_url, options) => {
    if (!options) return [record];
    if (failed) throw new Error('A API respondeu HTTP 401.');
  } });

  await repo.refresh();
  await assert.rejects(repo.remove(record.id), /HTTP 401/);
  assert.deepEqual(repo.read(), [record]);
  failed = false;
  await repo.remove(record.id);
  assert.deepEqual(repo.read(), []);
});
