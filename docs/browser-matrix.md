# Kiểm tra trình duyệt

Giai đoạn 0, Windows, ngày 23/11/2026. Bài Playwright dùng hồ sơ trình duyệt mới, bản production và service worker thật.

| Trình duyệt                   | Tải lại khi offline | Mở sân khấu, hộp thoại D và Esc | Đọc 6 tệp AI offline, đúng SHA-256 | Request lỗi / khác origin |
| ----------------------------- | ------------------- | ------------------------------- | ---------------------------------- | ------------------------- |
| Chrome 157.0.8103.79, Windows | Đạt                 | Đạt                             | Đạt                                | 0 / 0                     |
| Edge 158.0.4370.33, Windows   | Đạt                 | Đạt                             | Đạt                                | 0 / 0                     |
| Firefox desktop               | Chưa kiểm tra       | Chưa kiểm tra                   | Chưa kiểm tra                      | Chưa đo                   |
| Safari macOS                  | Chưa kiểm tra       | Chưa kiểm tra                   | Chưa kiểm tra                      | Chưa đo                   |
| Safari iOS                    | Chưa kiểm tra       | Chưa kiểm tra                   | Chưa kiểm tra                      | Chưa đo                   |
| Chrome Android                | Chưa kiểm tra       | Chưa kiểm tra                   | Chưa kiểm tra                      | Chưa đo                   |

Đã xem bố cục Chrome trên Windows ở 1150 × 730 và ở viewport 390 × 844. Ở viewport nhỏ, chiều rộng tài liệu đo được là 390 px. Thử nghiệm này chỉ xác minh bố cục trên desktop mô phỏng kích thước màn hình điện thoại.

## Kiểm tra tay cho từng trình duyệt

1. Mở bản production trong hồ sơ mới. Kiểm tra font và dấu tiếng Việt ở tiêu đề, nút và chân trang.
2. Mở sân khấu bằng chuột hoặc bàn phím. Mở thông tin studio, đóng bằng nút Đóng hoặc Esc.
3. Chờ trạng thái sẵn sàng ngoại tuyến. Ngắt mạng và tải lại. Mở lại sân khấu và bảng thông tin.
4. Kiểm tra Network và Console. Ghi trình duyệt, phiên bản, thiết bị và kết quả thực tế vào bảng.

Từ giai đoạn 1, bổ sung cấp và từ chối quyền camera, ngắt thiết bị, CPU fallback, FPS render, inference và độ lệch con trỏ. Từ giai đoạn 5, bổ sung kiểm tra ảnh xuất, âm thanh và MIME của video bằng file ghi thực tế trên từng trình duyệt.
