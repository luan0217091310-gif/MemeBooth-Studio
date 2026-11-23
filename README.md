# MemeBooth Studio

MemeBooth Studio là phòng chụp ảnh bằng cử chỉ chạy trong trình duyệt. **Phiên bản 0.1 hoàn thành giai đoạn 0**. Bạn có thể mở sân khấu tiếng Việt, xem thông tin kỹ thuật và mở lại toàn bộ bản production khi mất kết nối. Camera, vẽ trên không, chụp ảnh và quay video nằm ở các giai đoạn sau.

## Mở trên máy của bạn

Dùng Node.js 24 LTS và npm. Môi trường nghiệm thu dùng Node 24.14.1 trên Windows. Cần kết nối Internet ở lần cài đầu để lấy các gói npm và hai model.

```sh
git clone https://github.com/luan0217091310-gif/MemeBooth-Studio.git
cd MemeBooth-Studio
npm ci
npm run build
npm run preview
```

Mở **[MemeBooth Studio trên localhost](http://127.0.0.1:48217/)** trong trình duyệt cùng máy. Giữ tiến trình preview chạy trong lúc dùng. Nếu cổng 48217 đang bận, chọn cổng khác và mở đúng URL Vite in ra. Bộ nhớ ngoại tuyến gắn với từng địa chỉ và cổng.

1. Bấm **Bắt đầu** để mở khung ngắm. Nút **Quay lại** đưa bạn về màn hình đầu. Ở mốc này trình duyệt chưa yêu cầu quyền camera hay micro.
2. Nhấn **D** hoặc chọn **Thông tin studio** để xem phiên bản MediaPipe, số tệp đã chuẩn bị và trạng thái ngoại tuyến. Nhấn **Esc** để đóng.
3. Đợi dòng **Sẵn sàng ngoại tuyến** ở chân trang. Trong DevTools chọn Network → Offline rồi tải lại tab. Thử mở lại khung ngắm và bảng thông tin.

Khi sửa mã, dùng `npm run dev` và mở URL Vite in ra. Service worker chỉ được đăng ký ở bản production. Dùng `npm run build` và `npm run preview` để kiểm tra chế độ ngoại tuyến. Triển khai file tĩnh từ thư mục `dist/` tại gốc một origin HTTPS; localhost cũng hỗ trợ service worker.

## Các lệnh của dự án

| Lệnh                   | Công việc                                                                                          |
| ---------------------- | -------------------------------------------------------------------------------------------------- |
| `npm ci`               | Cài đúng lockfile, sau đó tự chạy bước chuẩn bị tài nguyên.                                        |
| `npm run fetch-assets` | Kiểm tra và khôi phục model, đối chiếu WASM với SDK đã cài, ghi lại manifest.                      |
| `npm run dev`          | Chạy Vite với cập nhật nóng.                                                                       |
| `npm run typecheck`    | Kiểm tra TypeScript strict và truy cập mảng với `noUncheckedIndexedAccess`.                        |
| `npm run lint`         | Chạy ESLint trên mã ứng dụng, script và test.                                                      |
| `npm test`             | Chạy Vitest cho luồng mở sân khấu, trạng thái ngoại tuyến và tính toàn vẹn của tài nguyên.         |
| `npm run build`        | Kiểm tra type, tạo bản production và sinh service worker từ danh sách tệp thực tế.                 |
| `npm run preview`      | Phục vụ bản đã build trên máy.                                                                     |
| `npm run test:offline` | Sau khi build, chạy Playwright với Chrome đã cài. Test tự mở hoặc dùng lại preview tại cổng 48217. |
| `npm run format`       | Định dạng mã bằng Prettier.                                                                        |

Để chạy cùng bài kiểm tra trên Edge trong một phiên PowerShell:

```powershell
$env:BROWSER_CHANNEL = 'msedge'
npm run test:offline
Remove-Item Env:BROWSER_CHANNEL
```

## Model, WASM và hoạt động ngoại tuyến

`scripts/fetch-assets.mjs` tải hai model float16 phiên bản 1 của Google vào `public/mediapipe/models/`. Script kiểm tra SHA-256 trước khi ghi tệp. Lần chạy tiếp theo tái sử dụng model có đúng mã băm. Model bị thiếu hoặc hỏng được tải lại. Loader JavaScript và WASM được sao chép từ chính phiên bản `@mediapipe/tasks-vision` trong lockfile vào `public/mediapipe/wasm/`. Manifest ghi phiên bản SDK, đường dẫn và mã băm từng tệp. [Gesture Recognizer](https://ai.google.dev/edge/mediapipe/solutions/vision/gesture_recognizer) · [Face Landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker)

Hai model, runtime và manifest chiếm khoảng **40,2 MiB**. Repo lưu script và lockfile để dựng lại các tệp nhị phân này khi cài đặt. Khi mở bản production lần đầu, trình duyệt lưu cả ứng dụng, font tiếng Việt, hình minh họa và tài nguyên AI từ cùng origin. Service worker chỉ báo sẵn sàng sau khi cache đã cài và trang đã nằm dưới quyền điều khiển của worker. Mỗi bản build có mã cache dựa trên nội dung. Việc xóa dữ liệu trang hoặc trình duyệt thu hồi dung lượng sẽ yêu cầu tải lại.

Bản hiện tại chạy hoàn toàn client-side, dùng SVG gốc và font đóng gói cục bộ. Sân khấu không gửi ảnh, âm thanh hoặc landmark. Giai đoạn 0 chưa khởi tạo model nhận diện nên chưa có FPS hay số đo inference.

## Kiến trúc và điểm mở rộng

| Đường dẫn                                      | Trách nhiệm hiện tại                                                                  |
| ---------------------------------------------- | ------------------------------------------------------------------------------------- |
| `src/app/`                                     | Khung sân khấu Responsive, token màu Kawaii, theo dõi service worker.                 |
| `src/components/common/`                       | Hộp thoại thông tin và màn hình khôi phục lỗi React.                                  |
| `src/store/session.ts`                         | Trạng thái phiên, hộp thoại và ngoại tuyến trong Zustand.                             |
| `src/types/`                                   | Hợp đồng về landmark, snapshot, trigger, meme, vibe, trang sổ và chia sẻ theo mục 11. |
| `src/assets/stickers/`, `src/config/assets.ts` | SVG gốc và registry hình ảnh.                                                         |
| `src/core/audio/engine.ts`                     | Mở hoặc tiếp tục AudioContext sau tương tác Bắt đầu.                                  |
| `src/i18n/vi.ts`                               | Chuỗi tiếng Việt cho giao diện và thông báo khởi động.                                |
| `scripts/`                                     | Chuẩn bị tài nguyên, tạo danh sách precache và service worker production.             |
| `tests/`                                       | Test ứng dụng, mã băm và bài kiểm tra trình duyệt ngoại tuyến.                        |

Các giai đoạn sau dùng một sân khấu chung. Theo thiết kế, worker AI gửi snapshot mới nhất, vòng render đọc store qua ref và ghép các lớp camera, nội dung sáng tạo và hiệu ứng. HUD nằm ngoài compositor để ảnh và video xuất ra chỉ chứa nội dung sân khấu.

**Cách thêm nội dung theo lộ trình**

- **Hình minh họa hiện tại** — đặt SVG gốc trong `src/assets/stickers/`, import URL vào `src/config/assets.ts` và dùng mục registry trong component. Bản build đưa hình vào cache ngoại tuyến.
- **Meme ở giai đoạn 3** — định nghĩa `MemeDef` với hình, caption, `soundId` và `TriggerRule`. Rule có điều kiện, thời gian giữ, cooldown và độ ưu tiên. Đăng ký qua `config/memes.ts` sau khi combo engine được triển khai.
- **Âm thanh ở giai đoạn 3** — thêm synth vào `core/audio/synths/`, đăng ký ID trong `soundRegistry.ts` và phát qua master bus chung cho loa và ghi hình. Dùng cùng ID trong định nghĩa meme.
- **AR prop ở giai đoạn 3** — tạo SVG, khai báo điểm neo face mesh, offset và hệ số kích thước trong `config/props.ts`. Kiểm tra khi nghiêng đầu và khi khuôn mặt rời khung.
- **Vibe ở giai đoạn 4** — thêm một `VibePreset` vào `config/vibes.ts` với token UI, tham số filter, cọ, hạt, âm thanh, khung ảnh và bìa sổ. Chuyển preset giữ nguyên scene.

Các module được thêm khi đến giai đoạn tương ứng. React được giữ ở 18.3.1 theo yêu cầu tương thích với Photo Book. TypeScript ghim ở 6.0.3 trong dải hỗ trợ của typescript-eslint. Các phụ thuộc được ghim phiên bản chính xác.

## Lộ trình và nghiệm thu

| Giai đoạn | Phạm vi                                              | Trạng thái                           |
| --------- | ---------------------------------------------------- | ------------------------------------ |
| 0         | Khung dự án, type, AI assets, ngoại tuyến, kiểm thử  | Đã triển khai và tự kiểm             |
| 1         | Camera, shader, AI worker, làm mượt và HUD           | Đã triển khai, chờ đo trên máy thật  |
| 2         | Vẽ trên không, tẩy vector, sticker và chữ            | Đã triển khai, chờ thử bằng tay thật |
| 3         | Meme, combo, hạt, AR và âm thanh                     | Dự kiến                              |
| 4         | Vibe Sync, onboarding và điều khiển                  | Dự kiến                              |
| 5         | Photobooth, Live Photo, GIF và video                 | Dự kiến                              |
| 6         | IndexedDB, meme tự tạo, Photo Book và Highlight Reel | Dự kiến                              |
| 7         | Pose Challenge, chia sẻ, QR và nghiệm thu toàn bộ    | Dự kiến                              |

Mốc 0 đạt typecheck, lint, 3 bài unit test và build. JavaScript ban đầu **52,28 kB gzip** theo Vite. Bản build đưa **23 tệp** vào danh sách dùng ngoại tuyến. Bài kiểm tra trình duyệt ngắt mạng, tải lại, mở sân khấu và bảng thông tin, đọc lại 6 tệp AI, đối chiếu SHA-256 và kiểm tra các request lỗi hoặc ra ngoài origin. [Kết quả theo trình duyệt](docs/browser-matrix.md)

## Khi gặp lỗi

- **Tải model thất bại khi cài** — xác nhận máy có thể truy cập npm registry và `storage.googleapis.com`, sau đó chạy lại `npm ci`. Nếu đã cài thư viện, `npm run fetch-assets` sẽ sửa tệp thiếu hoặc sai mã băm.
- **Thông báo thiếu manifest** — chạy `npm run fetch-assets` từ thư mục repo. Với production, build lại để cập nhật cả manifest trong `dist/`.
- **Chưa sẵn sàng ngoại tuyến** — dùng bản preview qua localhost hoặc HTTPS. Kiểm tra còn dung lượng lưu trữ cho origin và chờ báo sẵn sàng trước khi ngắt mạng.
- **Thấy bản cũ sau cập nhật** — đóng các tab đang dùng studio rồi mở lại khi đang kết nối. Service worker mới kích hoạt khi những tab của bản trước đã đóng.
- **Mở localhost trên điện thoại** — localhost trỏ tới chính điện thoại. Để thử trên thiết bị khác, phục vụ `dist/` qua địa chỉ HTTPS mà thiết bị đó truy cập được.
