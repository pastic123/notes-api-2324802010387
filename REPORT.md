# Bài 4 – Bảo mật

Họ tên / MSSV: ………………………………

## Phần A – Bí mật (tự thực hiện, chụp ảnh)
- [ ] Bước 1: `git log --all -p | grep -iE "mongodb\+srv|supabase|secret"` (kết quả: ……)
- [ ] Bước 2: Codespaces Secrets đã tạo và cấp cho repo (ảnh)
- [ ] Bước 3: Push protection + Dependabot alerts đã bật (ảnh)

## Phần B – Kiểm thử (điền mã thực tế khi chạy với Atlas)
| Kiểm thử | Mong đợi | Thực tế |
|---|---|---|
| GET /notes không token | 401 | |
| GET /notes có token | 200 | |
| Login với `{"email":{"$gt":""}}` | 401 | |
| 25 lần đăng nhập sai | 429 từ lần 21 | |
| B đọc ghi chú của A | 404 | |

(Bộ test tự động `npm test`: 9/9 đạt với model giả.)

## Phần C – Quét lỗ hổng
`npm audit --omit=dev`: (dán kết quả thật sau khi chạy)

| Image | Kích thước | HIGH | CRITICAL |
|---|---|---|---|
| node:22-alpine | | | |
| node:22 | | | |

## Phần D – Atlas mở 0.0.0.0/0
| Mục | Nội dung |
|---|---|
| Rủi ro cụ thể | Mọi IP trên Internet đều kết nối được tới cổng cluster: dò mật khẩu (brute-force), khai thác lỗ hổng dịch vụ chưa vá, gây quá tải kết nối. Lộ chuỗi kết nối thì không còn lớp chặn theo mạng. |
| Biện pháp bù trừ | Người dùng chỉ có `readWrite` trên một CSDL; mật khẩu ngẫu nhiên; TLS bắt buộc của Atlas; bí mật nằm trong Codespaces Secrets, không nằm trong mã (có Push protection). |
| Phương án tốt hơn | IP tĩnh (NAT gateway) rồi chỉ cho phép IP đó; tốt nhất là Private Endpoint/VPC peering. Chi phí: tiền hạ tầng, cấu hình phức tạp; Vercel serverless không có IP cố định nên cần add-on. |

## Câu hỏi phản biện
**1. JWT bị lộ trong 1 giờ.** Máy chủ không lưu trạng thái nên không thu hồi được; kẻ giữ token đóng vai chủ tài khoản đến khi hết hạn. Khắc phục: (a) denylist theo `jti` (Redis), chi phí là thêm kho lưu trữ, một lần tra cứu mỗi request và mất tính stateless; hoặc (b) access token 5–15 phút + refresh token lưu trong CSDL để thu hồi, chi phí là logic phức tạp hơn và thêm lượt gọi làm mới.

**2. Alpine ít lỗ hổng hơn?** Alpine tối giản (musl, busybox), ít gói cài sẵn nên bề mặt tấn công nhỏ và ít thành phần bị báo CVE. Nhưng ít lỗ hổng được báo cáo không đồng nghĩa an toàn hơn: Trivy chỉ đếm lỗ hổng đã biết trong gói nhận diện được, không thấy lỗi logic, cấu hình sai hay lỗ hổng chưa công bố; mỗi bản phân phối có chính sách vá/đánh dấu CVE khác nhau; số lượng không nói lên mức nghiêm trọng hay khả năng khai thác.

**3. Trách nhiệm chia sẻ.**
| MongoDB Atlas / Supabase | Nhóm phát triển |
|---|---|
| Hạ tầng vật lý, máy chủ, hệ điều hành | Network Access, quyền người dùng CSDL |
| Vá lỗi và vận hành dịch vụ | Quản lý bí mật (chuỗi kết nối, khóa, `JWT_SECRET`) |
| TLS khi truyền, mã hóa lưu trữ, sao lưu | Mã ứng dụng: xác thực, phân quyền, chống NoSQL injection, rate limit |
| Tính sẵn sàng của nền tảng | Phụ thuộc và image: `npm audit`, Trivy, cập nhật gói |
