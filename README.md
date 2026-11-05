# notes-api – Bài 1: Hello Cloud API

API Node.js/Express nhỏ trả về thông tin máy chủ đang chạy.

## Chạy

```bash
npm install
npm start      # http://localhost:3000
npm test
```

## Cấu trúc

- `src/app.js` – ứng dụng Express (tách riêng để bài 5 đưa lên serverless)
- `src/server.js` – tệp khởi động, lắng nghe cổng
- `test/app.test.js` – kiểm thử GET /
- `docs/index.html` – trang kết quả, xuất bản bằng GitHub Pages (main → /docs)
