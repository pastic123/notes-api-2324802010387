require('dotenv').config();
const mongoose = require('mongoose');
const Note = require('../src/models/note');

const SEED_OWNER = new mongoose.Types.ObjectId('000000000000000000000001');
const TAGS = ['cloud', 'docker', 'nosql', 'security', 'devops', 'java', 'web'];

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  await Note.deleteMany({ owner: SEED_OWNER });
  const docs = Array.from({ length: 2000 }, (_, i) => ({
    title: `Ghi chú mẫu ${i + 1}`,
    content: 'Dữ liệu thử nghiệm',
    tags: [TAGS[i % 7], TAGS[(i * 3) % 7]],
    owner: SEED_OWNER
  }));

  for (let i = 0; i < 10; i++) docs[i * 200].tags.push('rare');
  await Note.insertMany(docs);
  console.log(`Đã chèn ${docs.length} ghi chú`);
  await mongoose.disconnect();
})();
