# MemeBooth Studio

Phòng chụp ảnh bằng cử chỉ, chạy **100% trên trình duyệt**. Dùng tay và khuôn mặt để vẽ trên không, nổ meme AR, trang trí sticker và chữ, chụp photobooth, quay video có tiếng, giữ kỷ niệm trong cuốn Photo Book lật trang 3D và chơi Pose Challenge. Camera, ảnh và âm thanh không rời khỏi máy bạn. Sau lần tải đầu, ứng dụng chạy được khi mất mạng.

**Phiên bản 1.0**: đã triển khai đủ giai đoạn 0–7. Xem phần [Nghiệm thu](#nghiệm-thu) để biết tiêu chí nào đã đo trên máy thử và tiêu chí nào cần kiểm tra trên thiết bị thật.

## Cài đặt và chạy

Cần Node.js 24 LTS và npm. Lần cài đầu cần Internet để tải gói npm và hai model AI.

```sh
git clone https://github.com/luan0217091310-gif/MemeBooth-Studio.git
cd MemeBooth-Studio
npm ci            # tự chạy fetch-assets ở bước postinstall
npm run build
npm run preview   # http://127.0.0.1:48217/
```

`getUserMedia` chỉ chạy trên HTTPS hoặc `localhost`. Để thử trên điện thoại, triển khai thư mục `dist/` lên một địa chỉ HTTPS mà điện thoại truy cập được.

Khi phát triển, dùng `npm run dev`. Service worker chỉ đăng ký ở bản production.

### `npm run fetch-assets`

`scripts/fetch-assets.mjs` tải một lần `gesture_recognizer.task` và `face_landmarker.task` vào `public/mediapipe/models/` và kiểm tra SHA-256. Script cũng sao chép WASM từ `node_modules/@mediapipe/tasks-vision/wasm` vào `public/mediapipe/wasm/` và ghi phiên bản cùng mã băm vào `public/mediapipe/manifest.json`. Khi chạy, ứng dụng không tải gì từ CDN. Chạy lại lệnh này nếu model bị thiếu hoặc hỏng.

### Các lệnh

| Lệnh                   | Công việc                                                                                 |
| ---------------------- | ----------------------------------------------------------------------------------------- |
| `npm run dev`          | Vite với cập nhật nóng                                                                    |
| `npm run build`        | Typecheck, build production và sinh service worker từ danh sách tệp thật                  |
| `npm run preview`      | Phục vụ bản build tại cổng 48217                                                          |
| `npm run typecheck`    | TypeScript strict, `noUncheckedIndexedAccess`                                             |
| `npm run lint`         | ESLint, không có `any` ngầm                                                               |
| `npm test`             | 70 unit test (Vitest)                                                                     |
| `npm run test:offline` | 6 test trình duyệt (Playwright, camera giả của Chrome); `BROWSER_CHANNEL=msedge` cho Edge |
| `npm run fetch-assets` | Tải/kiểm tra model và WASM                                                                |

## Cách dùng nhanh

1. Bấm **Bắt đầu** rồi cho phép camera, hoặc chọn **Dùng không cần camera** để dùng chuột/cảm ứng.
2. **Vẽ**: giơ 1 ngón để vẽ, 2 ngón để tẩy, chụm ngón để gắp sticker, xoè tay 2 giây để xoá bảng (có Hoàn tác).
3. **Meme** (phím `M`): giơ ngón cái 👍, chữ V, há miệng, tim bằng 2 tay… Hoặc mở **Kho Meme** và bấm vào thẻ.
4. **Chụp** (`Space`) và **Quay** (`R`) ở dock bên dưới. Chọn khung Polaroid, Strip, Lưới hoặc 16:9 bằng nút bên trái dock.
5. Ngăn kéo bên phải: Cọ vẽ, Sticker & Chữ, Kho Meme, Tạo Meme, Phụ kiện AR, Vibe, Photo Book, Cài đặt.
6. **Thử thách**: 5 lượt, mỗi lượt 5 giây. Chọn Dễ hoặc Khó.

Phím tắt: `Space` chụp · `R` quay · `M` đổi chế độ · `D` thông tin kỹ thuật · `Ctrl+Z` / `Ctrl+Shift+Z` · `Esc` đóng/huỷ · `←` `→` lật sổ. Có thể bấm nút bằng tay: trỏ ngón vào nút và giữ 0,8 giây.

## Kiến trúc tóm tắt

```text
Camera (getUserMedia) --> Layer 0: WebGL2 filter, lật gương (lớp duy nhất được lật)
   |
   +--> 15-20 fps, 480p ImageBitmap --> Web Worker: GestureRecognizer + FaceLandmarker
                                          (xen kẽ, 1 frame in-flight, GPU -> CPU -> main thread)
                                                   | RawResult
   toDisplay() (lật đúng một lần) --> nội suy + One Euro --> PerceptionSnapshot (60 fps)
                |                         |                    |
         Draw FSM / PINCH          Combo engine          AR props, FX
                v                         v                    v
           Layer 1 (vector)          Layer 2 (meme, hạt, frame, props)     Layer 3 HUD (chỉ màn hình)
                \_________________________/
                 Compositor (L0+L1+L2) --> ảnh, Live Photo, GIF, video (+ audio master bus)
```

- **Hai vòng lặp**: render 60 fps (`core/canvas/renderLoop.ts`) và inference trong worker (`core/ai/vision.worker.ts`). Hai vòng chỉ gặp nhau qua snapshot mới nhất. React chỉ vẽ DOM và đọc store tối đa 10 lần/giây.
- **Toạ độ**: mọi thứ ở display space [0..1]. Chỉ `toDisplay()` chuyển toạ độ từ MediaPipe và chỉ Layer 0 lật canvas, nên chữ không bao giờ bị ngược. Mọi chuyển đổi sang pixel đi qua `core/canvas/viewport.ts`.
- **Compositor** (`core/canvas/compositor.ts`) có bản sao riêng của các lớp 0–2 và vẽ ở độ phân giải xuất. Compositor không có tham chiếu tới HUD, nên HUD không thể lọt vào file.
- **Âm thanh**: một `AudioContext`; `masterGain → limiter → loa` và `→ MediaStreamDestination` để ghi hình. Micro không bao giờ ra loa.
- **Lưu trữ**: `core/storage/repo.ts` là cổng duy nhất vào IndexedDB (các store `memes`, `books`, `pages`, `settings`, `meta`), có migration và xử lý `QuotaExceededError`.
- **Tải theo nhu cầu**: MediaPipe, sân khấu live, Photo Book, GIF encoder và Highlight Reel là các chunk riêng.

| Thư mục               | Nội dung                                                                   |
| --------------------- | -------------------------------------------------------------------------- |
| `src/core/ai/`        | worker, client (backpressure, fallback), filters, gestures, combo engine   |
| `src/core/canvas/`    | render loop, viewport, layers, brushes, particles, props, fx, compositor   |
| `src/core/audio/`     | engine, synths, sound registry, mic analyser, recorder (chọn mime)         |
| `src/core/capture/`   | photobooth/video controller, layouts, GIF worker, Highlight Reel           |
| `src/core/challenge/` | logic game (thuần) và controller vòng chơi                                 |
| `src/core/share/`     | `LocalShareProvider`, `UploadShareProvider` (tắt mặc định)                 |
| `src/core/storage/`   | repo IndexedDB, migrations, meme tự tạo, gói meme, đồng bộ cài đặt         |
| `src/config/`         | `vibes`, `gestures`, `memes`, `effects`, `props`, `stickers`, `challenges` |
| `src/store/`          | các slice Zustand                                                          |
| `src/i18n/vi.ts`      | toàn bộ chuỗi giao diện tiếng Việt                                         |

## Thêm nội dung mới

- **Meme**: thêm một `MemeDef` vào `src/config/memes.ts`, gồm hình SVG gốc, caption, `soundId`, `includeInChallenge` và `TriggerRule`. Rule có các trường `all` (điều kiện), `holdMs`, `windowMs`, `cooldownMs`, `priority`, `effect`. Hiệu ứng (hạt, khung, rung, flash, vị trí thẻ) khai báo trong `src/config/effects.ts`. Meme tự xuất hiện trong Kho Meme và Thử thách. Người dùng cũng có thể tạo meme ngay trong ứng dụng (**Tạo Meme**).
- **Âm thanh**: viết hàm synth `(ctx, dest, t, params) => duration` trong `src/core/audio/synths/index.ts` rồi đăng ký ID trong `soundRegistry.ts`. Muốn dùng file thật thì gọi `registerBuffer(id, audioBuffer)` với cùng ID.
- **Vibe**: thêm một `VibePreset` vào `src/config/vibes.ts` (token `--mb-*`, tham số shader, cọ, bảng màu, hạt, gói âm thanh, nhạc nền, khung ảnh, bìa sổ). Gói thay thế âm thanh khai báo trong `soundPacks`. Không cần sửa component.
- **AR prop**: thêm `{ anchor, offset, scaleFactor, aspect, yawSquash, svg }` vào `src/config/props.ts`.
- **Sticker**: thêm SVG vào `src/config/stickers.ts`.
- **Cử chỉ / ngưỡng**: `src/config/gestures.ts` (bảng debug `D` có thanh trượt chỉnh trực tiếp).

## Quyền riêng tư và chia sẻ

- Không backend, không analytics. Bài test ngoại tuyến xác nhận không có request nào ra ngoài origin.
- **Chia sẻ** mặc định qua `LocalShareProvider`: tải về, hoặc Web Share API nếu thiết bị chia sẻ được file. Mã QR chỉ mở ứng dụng trên máy khác, không chứa ảnh.
- `UploadShareProvider` **tắt mặc định**. Chỉ khi bạn bật trong Cài đặt và nhập máy chủ HTTPS của riêng bạn thì ảnh mới được gửi đi. Máy chủ nhận `POST` multipart với trường `file` và trả `{"url": "https://…"}`; khi đó mới có QR trỏ tới ảnh.

## Nghiệm thu

Đo trên Windows, Chrome 157 và Edge 158. Máy thử không có webcam và GPU thật: camera là camera giả của Chrome, đồ hoạ render bằng CPU. [Chi tiết theo trình duyệt](docs/browser-matrix.md)

| Tiêu chí                                             | Kết quả                                                                                |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------- |
| typecheck, lint, test, build                         | Đạt (70 unit test, 6 test trình duyệt trên cả Chrome và Edge)                          |
| Lighthouse desktop, màn hình chính                   | **Performance 100**, Accessibility 100, Best Practices 100                             |
| JS ban đầu (gzip, chưa gồm MediaPipe)                | 65 KB (ngân sách 300 KB)                                                               |
| Ngoại tuyến                                          | Tải lại khi mất mạng, đọc lại 6 tệp AI đúng SHA-256, 0 request ra ngoài                |
| Nhận diện chạy trong worker                          | 16 lần/giây, GPU delegate (đo trên camera giả)                                         |
| Render khi đứng yên / khi nổ 20 meme liên tiếp       | 60 fps / 46–49 fps (render bằng CPU; **cần đo lại trên laptop có GPU**, mục tiêu ≥ 50) |
| Đổi vibe                                             | 9–14 ms, giữ nguyên nét vẽ (yêu cầu < 300 ms)                                          |
| Ảnh/video không chứa HUD, chữ không bị ngược         | Đạt (kiểm tra ảnh xuất)                                                                |
| Video có tiếng meme                                  | Đạt: WebM VP9 + Opus                                                                   |
| F5 không mất sổ ảnh và meme; meme mới dùng được ngay | Đạt (Playwright)                                                                       |
| Pose Challenge chơi hết 5 lượt                       | Đạt (Playwright, chế độ tự chấm khi không có camera)                                   |
| Từ chối camera hoặc micro không làm hỏng app         | Đạt                                                                                    |

**Cần kiểm tra trên thiết bị thật** (máy thử không làm được):

- Độ lệch giữa con trỏ và đầu ngón trỏ; mỗi trigger kích đúng ≥ 8/10 lần; ngồi yên 60 giây không kích nhầm (đã có unit test với dữ liệu giả lập).
- FPS trên laptop có GPU và trên điện thoại tầm trung.
- Safari (macOS, iOS) xuất MP4; Firefox; Chrome Android.
- Hai người chưa từng dùng làm xong 3 bước hướng dẫn mà không cần giải thích thêm.

## Giới hạn đã biết

- **Cử chỉ**: GestureRecognizer chỉ có 7 cử chỉ dựng sẵn. 1 ngón, chụm, 2 ngón và tim 2 tay được tính bằng hình học từ landmark, nên có thể cần chỉnh ngưỡng theo ánh sáng và bàn tay thật.
- **Nhãn tay trái/phải** được chuẩn hoá trong `toDisplay.ts` theo giả định ảnh không lật. Hãy kiểm tra bằng cách giơ tay phải và xem nhãn trong bảng `D`.
- **Video**: Chrome/Firefox ghi WebM (có thể thiếu thời lượng trong metadata), Safari ghi MP4. Ứng dụng không chuyển đổi định dạng. Trình duyệt không có MediaRecorder sẽ được báo rõ lý do.
- **Ghi hình và Highlight Reel** dừng khi tab bị ẩn, vì `requestAnimationFrame` không chạy ở tab ẩn. Reel mất thời gian bằng độ dài video (khoảng 13,5 giây).
- **IndexedDB** có hạn mức và trình duyệt có thể tự xoá dữ liệu. Ứng dụng gọi `storage.persist()`, hiện dung lượng đã dùng và cảnh báo khi trên 80%. Nên tải sổ về (`.zip`) để giữ lâu dài.
- **Photo Book** về trang bìa khi đổi kích thước cửa sổ, vì react-pageflip chỉ đọc kích thước lúc khởi tạo.
- **Pose Challenge** khi không có camera dùng chế độ tự chấm (độ khớp cố định 60%). Chế độ 2 người thi đấu chưa làm (tuỳ chọn trong spec).
- **Hiệu năng hạt**: canvas 2D. Nếu máy yếu vẫn dưới 50 fps khi nổ liên tục, bước tiếp theo là chuyển hạt sang WebGL. Hiện tại app tự giảm mật độ hạt khi FPS dưới 50 trong 2 giây.
- Chưa hỗ trợ vuốt tay để lật trang sổ (tuỳ chọn).

## Khi gặp lỗi

- **Tải model thất bại khi cài**: kiểm tra mạng tới npm registry và `storage.googleapis.com`, rồi chạy `npm run fetch-assets`.
- **Không mở được camera**: dùng HTTPS/localhost, cấp quyền theo hướng dẫn trong app, đóng ứng dụng khác đang dùng webcam, hoặc chọn **Dùng không cần camera**.
- **Nhận diện nạp lâu**: sau 10 giây có nút **Thử lại** và **Chạy chế độ CPU**.
- **Thấy bản cũ sau cập nhật**: đóng hết các tab studio rồi mở lại khi đang có mạng.
- **Bộ nhớ đầy**: xoá bớt trang/sổ trong Photo Book (tải `.zip` về trước).
