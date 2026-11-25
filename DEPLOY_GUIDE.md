# Hướng dẫn Deploy MemeBooth Studio lên Internet (Miễn phí 100%)

MemeBooth Studio chạy **100% trên trình duyệt** (React + Vite + MediaPipe WebAssembly + IndexedDB), **không cần máy chủ backend** và không tốn chi phí thuê server. Bạn chỉ cần host thư mục tĩnh `dist/` lên một dịch vụ có **HTTPS miễn phí** (trình duyệt bắt buộc HTTPS để mở Webcam `getUserMedia`).

Dự án đã được cấu hình sẵn:
- `vite.config.ts` với `base: './'` (chạy được cả tên miền gốc lẫn subpath như GitHub Pages).
- `vercel.json` và `public/_headers` (cấu hình cache dài hạn cho model AI ~12 MB, tự động cập nhật `sw.js`, và header quyền `camera=(self), microphone=(self)`).
- Service Worker tự động lưu bộ nhớ đệm ngoại tuyến sau lần tải đầu tiên.

---

## Chuẩn bị chung (làm 1 lần)

1. Đẩy mã nguồn dự án lên một repository trên **GitHub** (công khai hoặc riêng tư đều được):
   ```bash
   cd MemeBooth-Studio
   git add .
   git commit -m "Optimize performance, UI polish, and deployment config"
   git push origin main
   ```
2. Đảm bảo đã cài đặt và kiểm tra build cục bộ không lỗi:
   ```bash
   npm ci
   npm run build
   ```
   > **Lưu ý về Node.js trên nền tảng deploy:** Dự án dùng Node.js 22+ (khuyến nghị **Node 22 LTS** hoặc **Node 24 LTS**). Trong bước `npm ci`, script `postinstall` sẽ tự động tải 2 model AI (`gesture_recognizer.task` & `face_landmarker.task`) và sao chép WASM vào `public/mediapipe/`.

---

## Cách 1: Cloudflare Pages (Khuyên dùng — Băng thông không giới hạn, miễn phí)

Cloudflare Pages là lựa chọn tốt nhất cho MemeBooth Studio vì **miễn phí băng thông không giới hạn** (rất hợp khi nhiều người tải 12 MB model AI) và tự động đọc file `public/_headers` đã cấu hình sẵn.

1. Tạo tài khoản miễn phí tại [dash.cloudflare.com](https://dash.cloudflare.com/).
2. Vào menu **Workers & Pages** → **Create** → chọn tab **Pages** → **Connect to Git**.
3. Chọn repository `MemeBooth-Studio` trên GitHub.
4. Điền thông số build:
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
5. Mở mục **Environment variables (advanced)** → thêm biến:
   - `NODE_VERSION` = `22`
6. Bấm **Save and Deploy**.
7. Sau ~1–2 phút, bạn sẽ nhận được đường link HTTPS dạng `https://memebooth-studio.pages.dev` để mở ngay trên máy tính và điện thoại.

---

## Cách 2: Vercel (Nhanh nhất, tự động nhận `vercel.json`)

1. Đăng nhập miễn phí tại [vercel.com](https://vercel.com/) bằng tài khoản GitHub.
2. Bấm **Add New…** → **Project** → chọn repository `MemeBooth-Studio`.
3. Kiểm tra cấu hình (Vercel tự nhận diện Vite):
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm ci`
4. Trong **Project Settings → General → Node.js Version**, chọn **22.x** (hoặc **24.x**).
5. Bấm **Deploy**.
6. Xong! Truy cập link HTTPS `https://<ten-du-an>.vercel.app`.

*(Mỗi lần bạn `git push` lên GitHub, Vercel sẽ tự động build và cập nhật bản mới.)*

---

## Cách 3: Netlify (Có thể kéo-thả thư mục `dist/` không cần Git)

### Cách 3A — Kéo thả nhanh (không cần GitHub)
1. Chạy `npm run build` trên máy bạn để tạo thư mục `dist/`.
2. Vào [app.netlify.com/drop](https://app.netlify.com/drop).
3. Kéo thả toàn bộ thư mục `dist/` vào trình duyệt.
4. Nhận ngay link HTTPS miễn phí trong 30 giây (tự động áp dụng file `dist/_headers`).

### Cách 3B — Kết nối GitHub tự động cập nhật
1. Đăng nhập [app.netlify.com](https://app.netlify.com/) → **Add new site** → **Import an existing project**.
2. Chọn GitHub → `MemeBooth-Studio`.
3. Cấu hình:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
   - **Environment variable**: `NODE_VERSION` = `22`
4. Bấm **Deploy site**.

---

## Cách 4: GitHub Pages (Miễn phí ngay trên GitHub)

Vì `vite.config.ts` đã cấu hình `base: './'`, dự án chạy hoàn hảo trên đường dẫn phụ `https://<username>.github.io/MemeBooth-Studio/`.

1. Tạo file `.github/workflows/deploy.yml` trong thư mục gốc dự án với nội dung:
   ```yaml
   name: Deploy to GitHub Pages

   on:
     push:
       branches: [main]
     workflow_dispatch:

   permissions:
     contents: read
     pages: write
     id-token: write

   jobs:
     build-and-deploy:
       environment:
         name: github-pages
         url: ${{ steps.deployment.outputs.page_url }}
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-node@v4
           with:
             node-version: 22
             cache: npm
         - run: npm ci
         - run: npm run build
         - uses: actions/upload-pages-artifact@v3
           with:
             path: dist
         - id: deployment
           uses: actions/deploy-pages@v4
   ```
2. Đẩy file lên nhánh `main`.
3. Trên GitHub, vào **Settings → Pages → Build and deployment → Source**, chọn **GitHub Actions**.
4. Chờ workflow chạy xanh là xong!

---

## Kiểm tra sau khi Deploy (Checklist)

Sau khi mở đường link HTTPS mới của bạn:

- [ ] **Kiểm tra HTTPS**: Thanh địa chỉ có biểu tượng ổ khoá.
- [ ] **Kiểm tra Offline**: Ở màn hình chính, dòng trạng thái góc dưới hiện **"Sẵn sàng ngoại tuyến"** sau vài giây. Thử tắt Wi-Fi và bấm F5 — app vẫn mở và chạy bình thường.
- [ ] **Kiểm tra Camera & AI**: Bấm **Bắt đầu** → cho phép camera → chờ thanh tiến trình nạp AI đạt 100%.
- [ ] **Kiểm tra trên máy yếu / điện thoại**: Bật nút **Máy nhẹ** (biểu tượng tia sét ⚡ trên thanh trên cùng hoặc trong **Cài đặt**) để giới hạn độ phân giải 1x, tắt hiệu ứng mờ nền và giảm tải AI.
- [ ] **Kiểm tra Debug (tuỳ chọn)**: Bấm phím `D` để xem FPS render, FPS nhận diện AI, luồng `worker` và bộ xử lý `GPU`/`CPU`.

---

## Khắc phục sự cố thường gặp khi Deploy

| Vấn đề | Nguyên nhân & Cách xử lý |
| --- | --- |
| Build lỗi thiếu model AI | Đảm bảo lệnh cài đặt là `npm ci` hoặc `npm install` (không thêm cờ `--ignore-scripts`) để `postinstall` chạy `scripts/fetch-assets.mjs`. |
| Mở trên điện thoại không bật được camera | Kiểm tra đường link phải bắt đầu bằng `https://`. Trên iOS Safari, vào **Cài đặt → Safari → Camera → Hỏi / Cho phép**. |
| Cập nhật code mới nhưng trình duyệt vẫn hiện bản cũ | Do Service Worker đang cache bản cũ: đóng tất cả các tab đang mở web rồi mở lại, hoặc bấm `Ctrl + Shift + R`. |
| Muốn chia sẻ ảnh bằng mã QR trực tiếp tới file ảnh | Mặc định ứng dụng giữ ảnh 100% trên máy để bảo vệ quyền riêng tư. Nếu muốn upload ảnh lấy QR, bạn có thể tự triển khai 1 endpoint `POST` multipart (nhận trường `file`, trả về JSON `{"url": "https://..."}`) rồi nhập vào mục **Cài đặt → Chia sẻ**. |
