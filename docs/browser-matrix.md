# Kiểm tra trình duyệt

Bản 1.0, Windows, ngày 24/11/2026. Các bài Playwright trong `tests/browser/` chạy trên bản production, service worker thật và hồ sơ trình duyệt mới. Bài chụp/quay dùng camera giả của Chrome (`--use-fake-device-for-media-stream`). Máy thử không có webcam và GPU thật.

## Kết quả tự động

| Bài kiểm tra                                                  | Chrome 157.0.8103.79 | Edge 158.0.4370.33 |
| ------------------------------------------------------------- | -------------------- | ------------------ |
| Ngoại tuyến: tải lại, sân khấu, bảng D, 6 tệp AI đúng SHA-256 | Đạt                  | Đạt                |
| Request lỗi / ra ngoài origin                                 | 0 / 0                | 0 / 0              |
| Vẽ bằng chuột, hướng dẫn 3 bước, nổ meme, đổi vibe            | Đạt                  | Đạt                |
| Photobooth: đếm ngược, chụp, tải PNG/JPEG                     | Đạt                  | Đạt                |
| Video: quay, dừng, tải về với đuôi theo mime thật             | Đạt (WebM)           | Đạt (WebM)         |
| Lưu sổ, tạo meme, F5 vẫn còn, lật trang, xuất Highlight Reel  | Đạt                  | Đạt                |
| Pose Challenge 5 lượt, bảng điểm, strip, modal chia sẻ có QR  | Đạt                  | Đạt                |

Đo thêm trên Chrome:

- Lighthouse desktop, màn hình chính: Performance 100, Accessibility 100, Best Practices 100.
- Nhận diện trong worker với GPU delegate: 16 lần/giây.
- Render khi đứng yên 60 fps; khi nổ 20 meme liên tiếp 46–49 fps (GPU giả lập bằng phần mềm).
- File video chứa VP9 + Opus.

## Chưa kiểm tra (cần thiết bị)

| Trình duyệt     | Trạng thái    |
| --------------- | ------------- |
| Firefox desktop | Chưa kiểm tra |
| Safari macOS    | Chưa kiểm tra |
| Safari iOS      | Chưa kiểm tra |
| Chrome Android  | Chưa kiểm tra |

## Checklist kiểm tra tay

1. Mở bản production trong hồ sơ mới. Kiểm tra font và dấu tiếng Việt.
2. Cho phép camera. Nhấn `D`: worker hay main, GPU hay CPU, FPS render và inference.
3. Giơ tay phải: nhãn trong bảng `D` phải là `Right`. Kiểm tra con trỏ trùng đầu ngón trỏ, kể cả ở mép khung.
4. Thử từng trigger 10 lần (ghi số lần đúng). Ngồi yên 60 giây, ghi số lần kích nhầm.
5. Từ chối camera: phải thấy hướng dẫn và nút **Dùng không cần camera**. Rút webcam khi đang dùng: phải thấy **Kết nối lại**.
6. Chụp Strip 4 tấm, tải PNG/JPEG/GIF. Quay video 10 giây có nổ meme, kiểm tra tiếng và đuôi file (Safari: `.mp4` hoặc thông báo lý do).
7. Lưu vào sổ, tải lại trang (F5), mở Photo Book, lật trang: clip phải phát kèm tiếng meme.
8. Chơi Pose Challenge đủ 5 lượt bằng tay thật.
9. Ngắt mạng sau khi thấy **Sẵn sàng ngoại tuyến**, tải lại và lặp lại bước 2.
10. Ghi trình duyệt, phiên bản, thiết bị và kết quả vào bảng trên.
