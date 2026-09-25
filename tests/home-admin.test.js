import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../assets/home-admin.js', import.meta.url), 'utf8');
const tick = () => new Promise(resolve => setImmediate(resolve));
function mount(client) {
  const card = { hidden: true };
  let authChanged;
  client.auth.onAuthStateChange = callback => { authChanged = callback; };
  vm.runInNewContext(source, {
    document: { getElementById: () => card }, supabaseClient: client,
    window: { addEventListener() {} }, setTimeout,
  });
  return { card, changed: () => authChanged() };
}
test('home map entry requires a verified user and successful admin check', async () => {
  for (const [user, data, error, visible] of [
    [null, true, null, false], [{ id: 'user' }, false, null, false],
    [{ id: 'admin' }, true, null, true], [{ id: 'admin' }, true, { message: 'offline' }, false],
  ]) {
    const { card } = mount({ auth: { getUser: async () => ({ data: { user } }) }, rpc: async () => ({ data, error }) });
    await tick();
    assert.equal(!card.hidden, visible);
  }
});
test('sign-out invalidates an in-flight admin response immediately', async () => {
  let resolveRole;
  const client = { auth: { getUser: async () => ({ data: { user: { id: 'admin' } } }) },
    rpc: () => new Promise(resolve => { resolveRole = resolve; }) };
  const { card, changed } = mount(client);
  await tick();
  client.auth.getUser = async () => ({ data: { user: null } });
  changed();
  resolveRole({ data: true });
  await tick();
  assert.equal(card.hidden, true);
});
