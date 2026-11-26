require('dotenv').config();
const mongoose = require('mongoose');
const Note = require('../src/models/note');

const pick = (r) => (Array.isArray(r) ? r[0] : r).executionStats;

async function compare(tag) {
  const scan = pick(await Note.find({ tags: tag }).hint({ $natural: 1 }).explain('executionStats'));
  const idx = pick(await Note.find({ tags: tag }).explain('executionStats'));
  console.log(`\nTruy vấn tags = "${tag}"  (tỉ số docsExamined: ${(scan.totalDocsExamined / Math.max(idx.totalDocsExamined, 1)).toFixed(1)} lần)`);
  console.table({
    'Quét toàn bộ': { docsExamined: scan.totalDocsExamined, returned: scan.nReturned, ms: scan.executionTimeMillis },
    'Dùng chỉ mục': { docsExamined: idx.totalDocsExamined, returned: idx.nReturned, ms: idx.executionTimeMillis }
  });
}

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  await Note.syncIndexes();
  await compare('docker');
  await compare('rare');
  await mongoose.disconnect();
})();
