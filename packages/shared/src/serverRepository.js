import { gatewayRequest } from './gateway.js';
import { API_STATUS_EVENT } from './storage.js';

export function createServerRepository({ path, event, validate, request = gatewayRequest }) {
  let rows = [];
  let pending = Promise.resolve();

  function notify() {
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(event));
  }

  function report(online, message = '') {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(API_STATUS_EVENT, { detail: { online, message } }));
    }
  }

  function run(action) {
    const job = pending.then(async () => {
      try {
        const result = await action();
        report(true);
        return result;
      } catch (error) {
        report(false, error.message);
        throw error;
      }
    });
    pending = job.catch(() => {});
    return job;
  }

  return {
    remote: true,
    read: () => rows,
    refresh: () => run(async () => {
      const result = await request(path);
      if (!Array.isArray(result) || !result.every(validate)) {
        throw new Error('Dados da API em formato inválido.');
      }
      rows = result;
      notify();
      return rows;
    }),
    save: item => run(async () => {
      if (!validate(item)) throw new Error('Dados inválidos. Revise os campos antes de salvar.');
      const previous = rows.some(row => row.id === item.id);
      const result = await request(previous ? `${path}/${encodeURIComponent(item.id)}` : path, {
        method: previous ? 'PUT' : 'POST', body: item
      });
      if (!validate(result)) throw new Error('A resposta da gravação veio em formato inválido.');
      rows = [result, ...rows.filter(row => row.id !== result.id)];
      notify();
      return rows;
    }),
    remove: id => run(async () => {
      await request(`${path}/${encodeURIComponent(id)}`, { method: 'DELETE' });
      rows = rows.filter(row => row.id !== id);
      notify();
      return rows;
    })
  };
}
