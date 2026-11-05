const { test } = require('node:test');
const assert = require('node:assert');
const app = require('../src/app');

test('GET / trả JSON có host, cpus, memoryGB', async () => {
  const server = app.listen(0);
  try {
    const { port } = server.address();
    const res = await fetch(`http://127.0.0.1:${port}/`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.ok(body.host);
    assert.ok(body.cpus > 0);
    assert.ok(body.memoryGB > 0);
  } finally {
    server.close();
  }
});
