
process.env.JWT_SECRET = 'khoa-thu-nghiem-chi-dung-trong-test';
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const path = require('path');

let seq = 0;
const oid = () => String(++seq).padStart(24, '0');
const users = [];
const notes = [];
const match = (doc, f) => Object.entries(f).every(([k, v]) => String(doc[k]) === String(v) || (k === 'tags' && doc.tags?.includes(v)));

const User = {
  exists: async (f) => users.find((u) => match(u, f)) ?? null,
  create: async (d) => { const u = { _id: oid(), ...d }; users.push(u); return u; },
  findOne: async (f) => users.find((u) => match(u, f)) ?? null
};
const Note = {
  create: async (d) => {
    if (!d.title) { const e = new Error('title bắt buộc'); e.name = 'ValidationError'; throw e; }
    const n = { _id: oid(), ...d }; notes.push(n); return n;
  },
  find: (f) => ({ sort: () => ({ limit: async () => notes.filter((n) => match(n, f)) }) }),
  findOne: async (f) => notes.find((n) => match(n, f)) ?? null,
  findOneAndUpdate: async (f, u) => { const n = notes.find((x) => match(x, f)); return n ? Object.assign(n, u) : null; },
  findOneAndDelete: async (f) => { const i = notes.findIndex((x) => match(x, f)); return i < 0 ? null : notes.splice(i, 1)[0]; }
};
const stub = (rel, exports) => {
  const file = require.resolve(path.join('..', rel));
  require.cache[file] = { id: file, filename: file, loaded: true, exports };
};
stub('src/models/user.js', User);
stub('src/models/note.js', Note);
stub('src/storage.js', { bucket: () => ({}) });

const app = require('../src/app');
let server, base;
before(() => { server = app.listen(0); base = `http://127.0.0.1:${server.address().port}`; });
after(() => server.close());

const call = (method, url, body, token) => fetch(base + url, {
  method,
  headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
  body: body === undefined ? undefined : JSON.stringify(body)
});
async function signup(email) {
  await call('POST', '/auth/register', { email, password: 'matkhau123' });
  const r = await call('POST', '/auth/login', { email, password: 'matkhau123' });
  return (await r.json()).token;
}

test('đăng ký, trùng email -> 409, đầu vào sai -> 400', async () => {
  assert.strictEqual((await call('POST', '/auth/register', { email: 'a@x.vn', password: 'matkhau123' })).status, 201);
  assert.strictEqual((await call('POST', '/auth/register', { email: 'A@x.vn', password: 'matkhau123' })).status, 409);
  assert.strictEqual((await call('POST', '/auth/register', { email: 'b@x.vn', password: 'ngan' })).status, 400);
});

test('mật khẩu được băm, không lưu thô', () => {
  assert.ok(users[0].passwordHash.startsWith('$2'));
  assert.notStrictEqual(users[0].passwordHash, 'matkhau123');
});

test('không token -> 401, token sai -> 401, có token -> 200', async () => {
  assert.strictEqual((await call('GET', '/notes')).status, 401);
  assert.strictEqual((await call('GET', '/notes', undefined, 'abc.def.ghi')).status, 401);
  const t = await signup('sv1@tdmu.edu.vn');
  assert.strictEqual((await call('GET', '/notes', undefined, t)).status, 200);
});

test('gửi đối tượng {"$gt":""} thay cho email -> 401', async () => {
  const r = await call('POST', '/auth/login', { email: { $gt: '' }, password: 'x' });
  assert.strictEqual(r.status, 401);
});

test('token ký bằng khóa khác hoặc alg=none -> 401', async () => {
  const jwt = require('jsonwebtoken');
  const fake = jwt.sign({ sub: '1' }, 'khoa-khac');
  assert.strictEqual((await call('GET', '/notes', undefined, fake)).status, 401);
  const none = Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url') + '.' + Buffer.from('{"sub":"1"}').toString('base64url') + '.';
  assert.strictEqual((await call('GET', '/notes', undefined, none)).status, 401);
});

test('người dùng B không đọc/sửa/xóa được ghi chú của A (404, không phải 403)', async () => {
  const a = await signup('a1@tdmu.edu.vn');
  const b = await signup('b1@tdmu.edu.vn');
  const created = await call('POST', '/notes', { title: 'bí mật của A', tags: ['x'] }, a);
  assert.strictEqual(created.status, 201);
  const { _id } = await created.json();

  assert.strictEqual((await call('GET', `/notes/${_id}`, undefined, a)).status, 200);
  assert.strictEqual((await call('GET', `/notes/${_id}`, undefined, b)).status, 404);
  assert.strictEqual((await call('PUT', `/notes/${_id}`, { title: 'hack' }, b)).status, 404);
  assert.strictEqual((await call('DELETE', `/notes/${_id}`, undefined, b)).status, 404);

  const listB = await (await call('GET', '/notes', undefined, b)).json();
  assert.ok(listB.every((n) => n.title !== 'bí mật của A'));
  assert.strictEqual((await call('DELETE', `/notes/${_id}`, undefined, a)).status, 204);
});

test('thiếu title -> 400; JSON hỏng -> 400', async () => {
  const t = await signup('c1@tdmu.edu.vn');
  assert.strictEqual((await call('POST', '/notes', { content: 'x' }, t)).status, 400);
  const r = await fetch(base + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{hong' });
  assert.strictEqual(r.status, 400);
});

test('helmet bật; payload > 100kb bị từ chối', async () => {
  const r = await fetch(base + '/');
  assert.ok(r.headers.get('x-content-type-options'));
  assert.ok(!r.headers.get('x-powered-by'));
  const big = await call('POST', '/auth/login', { email: 'a@b.cc', password: 'x'.repeat(200 * 1024) });
  assert.strictEqual(big.status, 413);
});

test('giới hạn tốc độ: các lần đăng nhập sau hạn mức nhận 429', async () => {
  const codes = [];
  for (let i = 0; i < 25; i++) codes.push((await call('POST', '/auth/login', { email: 'a@b.cc', password: 'saimatkhau' })).status);
  assert.ok(codes.includes(429), codes.join(' '));
  assert.strictEqual(codes[codes.length - 1], 429);
});
