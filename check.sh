#!/usr/bin/env bash
B=${BASE:-http://localhost:3000}
J='Content-Type: application/json'
code() { curl -s -o /dev/null -w "%{http_code}" "$@"; }

if [ "$(code $B/)" = "000" ]; then
  echo "Server chưa chạy. Mở terminal khác chạy: npm start"; exit 1
fi

echo "== 25 lần đăng nhập sai (429 từ lần 21):"
for i in $(seq 1 25); do code -X POST $B/auth/login -H "$J" -d '{"email":"a@b.cc","password":"saimatkhau"}'; echo -n " "; done; echo
echo "(Nếu đã hết hạn mức, các bước dưới sẽ trả 429: tắt/bật lại server rồi chạy lại các bước 1-4 bằng tay.)"

U1=sv1$RANDOM@tdmu.edu.vn; U2=sv2$RANDOM@tdmu.edu.vn
reg() { curl -s -X POST $B/auth/register -H "$J" -d "{\"email\":\"$1\",\"password\":\"matkhau123\"}" >/dev/null; }
tok() { curl -s -X POST $B/auth/login -H "$J" -d "{\"email\":\"$1\",\"password\":\"matkhau123\"}" | node -pe "try{JSON.parse(require('fs').readFileSync(0)).token||''}catch{''}"; }
reg $U1; T1=$(tok $U1); reg $U2; T2=$(tok $U2)
[ -z "$T1" ] && echo "Không lấy được token (có thể đã bị 429, khởi động lại server)" && exit 1

echo "Không token (mong đợi 401):   $(code $B/notes)"
echo "Có token (mong đợi 200):      $(code $B/notes -H "Authorization: Bearer $T1")"
echo "Gửi {\$gt} (mong đợi 401):     $(code -X POST $B/auth/login -H "$J" -d '{"email":{"$gt":""},"password":"x"}')"
ID=$(curl -s -X POST $B/notes -H "$J" -H "Authorization: Bearer $T1" -d '{"title":"bi mat cua sv1"}' | node -pe "try{JSON.parse(require('fs').readFileSync(0))._id}catch{''}")
echo "sv2 đọc ghi chú sv1 (mong đợi 404): $(code $B/notes/$ID -H "Authorization: Bearer $T2")"
