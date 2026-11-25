# MemeBooth Studio — Hướng dẫn Sử dụng, Link Demo & Deploy lên Internet Miễn phí

**MemeBooth Studio** là phòng chụp ảnh Photobooth AI bằng cử chỉ, chạy **100% trên trình duyệt** (không cần server backend, dữ liệu camera & ảnh không rời khỏi máy bạn, hoạt động cả khi mất mạng).

---

## 1. Link Demo Local (Xem ngay trên máy bạn)

Khi server preview đang bật, mở một trong hai đường dẫn sau trên Chrome / Edge / Safari:

- 👉 **http://localhost:48217/** *(khuyên dùng — trình duyệt luôn coi `localhost` là nguồn an toàn để cấp quyền Camera & Micro)*
- 👉 **http://127.0.0.1:48217/**

### Tự khởi động lại bản Demo bất cứ lúc nào
Mở terminal tại thư mục `MemeBooth-Studio` và chạy:

```bash
npm run build
npm run preview
```

*(Nếu đang phát triển/chỉnh sửa code và muốn xem cập nhật tức thì, dùng `npm run dev`.)*

---

## 2. Hướng dẫn Sử dụng Chi tiết

### A. Màn hình chính
- Thử bấm các **chấm màu Vibe** ngay cạnh nút **Bắt đầu** để xem trước 6 phong cách giao diện hiện đại.
- Bấm **Bắt đầu** → chọn **Cho phép Camera** (hoặc chọn **Dùng không cần camera** nếu muốn trải nghiệm bằng chuột/cảm ứng).
- Chờ vài giây lần đầu để AI MediaPipe nạp cục bộ (~12 MB) — sau lần này trình duyệt sẽ lưu sẵn để dùng **offline**.

### B. Nhận diện Cử chỉ AI & Nổ Meme (Chế độ mặc định: `Meme cử chỉ`)
Tính năng **tự động vẽ bằng tay đã được gỡ bỏ** để tránh vẽ nhầm nét thừa. Thay vào đó, AI nhận diện trực tiếp cử chỉ tay & biểu cảm khuôn mặt với độ nhạy cao (kết hợp hình học landmark + MediaPipe):

- **Thanh Radar AI phía trên cùng**: Hiện trực tiếp trạng thái AI đang thấy tay/mặt, tên cử chỉ nhận được và thanh nạp kích hoạt meme.
- **Thanh cử chỉ nhanh phía trên Dock**: Đèn sáng lên ngay khi AI nhận ra cử chỉ, đồng thời bạn có thể **bấm thẳng vào từng thẻ** để bắn meme ngay lập tức!

#### Bảng tra cứu cử chỉ & biểu cảm

| Cử chỉ / Biểu cảm | Cách làm trước camera | Meme & Hiệu ứng |
| --- | --- | --- |
| 👍 **Like** | Nắm 4 ngón, giơ ngón cái hướng lên | **Đỉnh nóc kịch trần** + pháo giấy |
| 👎 **Dislike** | Nắm 4 ngón, giơ ngón cái hướng xuống | **Toang rồi** + mưa mồ hôi |
| ✌️ **Chữ V** | Giơ 2 ngón trỏ & giữa tách chữ V | **Chụp nào!** + nháy flash *(hoặc tự chụp khi bật Chụp rảnh tay)* |
| 🤟 **I Love You** | Giơ ngón cái + ngón trỏ + ngón út | **Iu cả nhà** + tim bay |
| ✊ **Nắm tay** | Nắm chặt cả bàn tay | **Quyết tâm!** + khung lửa |
| 🖐️ **Xoè tay** | Xoè rộng cả 5 ngón tay | **Bye bye** + sóng & bong bóng |
| 🫶 **Tim 2 tay** *(Ultra)* | Ghép 2 đầu ngón trỏ trên + 2 ngón cái dưới | **Trái tim lãng mạn** + mưa tim anime |
| ✌️ + 😉 *(Ultra Combo)* | Giơ chữ V kèm nháy một mắt | **Idol lấp lánh** + sao bay từ mắt |
| 😮 **Há miệng** *(Ultra)* | Há miệng bất ngờ | **Sốc ngang** + rung màn hình + cầu vồng |
| 🤨 + 😮 *(Combo)* | Nhướn mày kèm há miệng | **Hả???** + dấu chấm hỏi |
| 😄 **Cười tươi** | Cười rộng trước camera | **Vầng hào quang** + lấp lánh |
| 😗 **Chu môi** | Chu môi hôn gió | **Môi hôn bay** |
| 🐡 **Phồng má** | Phồng hai má | **Má bóng bay** + bóng bay lên |

> **Mẹo kiểm tra độ chính xác:** Mở **Cài đặt → Hiện khung xương tay AI** để thấy đường khung xương & đầu ngón tay bám trực tiếp trên màn hình.

### C. Thanh công cụ nhanh trên cùng (1 chạm)
- **Chế độ (`Meme cử chỉ` / `Vẽ chuột`)**: Mặc định là `Meme cử chỉ`. Khi muốn vẽ thủ công bằng chuột/cảm ứng, chuyển sang `Vẽ chuột` (phím `M`).
- **Đổi Vibe**: Chuyển nhanh qua 6 bộ chủ đề (*Kawaii Pastel, Retro Y2K, Chaotic Meme, Cyber Neon, Seoul Film, Aura Dream*).
- **⚡ Máy nhẹ**: Tối ưu mạnh cho máy cấu hình yếu / laptop văn phòng / điện thoại (độ phân giải 1x, giảm tải AI & GPU, tắt blur nặng).
- **✋ Chụp rảnh tay (`Hand`)**: Bật để **giữ chữ V ✌️ khoảng 1 giây** là máy tự đếm ngược và chụp bộ ảnh Photobooth!
- **☀️ Đèn trợ sáng (`Ring Light`)**: Bật viền phát sáng quanh màn hình (*Tắt → Trắng Studio → Hồng phấn → Ấm hoàng hôn*) giúp sáng mặt khi chụp buổi tối (không bị dính viền vào ảnh xuất ra).
- **↔️ Lật gương** & **🔊 Bật/Tắt tiếng**: Chuyển nhanh ngay trên thanh trên cùng.

### D. Ngăn kéo tính năng bên phải
1. **🎨 Vibe & Studio Beauty**:
   - Thanh trượt **Làm mịn & sáng da (GPU Beauty Glow)** chạy mượt 60 fps.
   - Chọn **Đèn trợ sáng màn hình**, nhập **Chữ in trên khung ảnh** (ví dụ: `Bestie 2026 ✨`) và nút **Ngẫu nhiên ✨** đổi trọn bộ Vibe + Phụ kiện AR.
2. **🕶️ Phụ kiện AR (10 mẫu)**: Tai mèo, Tai thỏ Pastel, Kính râm meme, Kính trái tim Y2K, Vương miện, Hào quang thiên thần, Nơ hồng Coquette, Má hồng, Râu mèo, Sừng quỷ nhỏ — kèm nút **Phối ngẫu nhiên** và **Xoá hết**.
3. **😂 Kho Meme**: Có tab lọc **Tất cả / Ultra ⭐ / Tay ✋ / Mặt 😄**, bấm vào thẻ bất kỳ để nổ meme.
4. **✨ Tạo Meme**: Tự upload ảnh (PNG/JPG/WebP) + ghi âm 3 giây hoặc chọn nhạc + gán cử chỉ kích hoạt riêng, xuất/nhập gói meme.
5. **😊 Sticker & Chữ**: Gắn sticker & chữ lên khung hình. Bạn có thể **kéo bằng chuột** hoặc **chụm ngón tay 🤏 trước camera** để gắp, xoay, phóng to/thu nhỏ; kéo vào góc dưới phải để xoá.
6. **🖌️ Cọ vẽ**: 7 loại cọ (Pastel, Neon, Cầu vồng, Lấp lánh, Phấn màu, Nét đứt, Nét đậm) — chọn cọ sẽ tự chuyển sang chế độ **Vẽ chuột**.
7. **📖 Photo Book 3D**: Xem lại toàn bộ ảnh/video đã lưu dưới dạng cuốn sổ lật trang 3D, viết chú thích, tải cả cuốn `.zip` hoặc dựng video **Highlight Reel 1-Click**.
8. **⚙️ Cài đặt**: Bật/tắt Máy nhẹ, Lật gương, Chụp rảnh tay ✌️, Khung xương tay AI, Nhảy theo âm thanh micro, Giảm nhấp nháy, xem dung lượng bộ nhớ.

### E. Chụp ảnh Photobooth, Quay video & Thử thách
- **Thanh Dock bên dưới**:
  - **Khung ảnh**: Đổi giữa `Polaroid`, `Strip 4x1`, `Lưới 2x2`, `Ảnh đơn 16:9`.
  - **⏱ Hẹn giờ**: Đổi nhanh `3s` → `1s` → `Ngay` (chụp tức thì).
  - **📸 Chụp (`Space`)**: Chụp xong có thể **Tải PNG**, **Tải JPEG**, **📋 Sao chép ảnh vào Clipboard** (dán thẳng vào Zalo/Messenger/Discord!), **Tải GIF động**, **Chia sẻ QR** hoặc **Lưu vào Photo Book**.
  - **🎥 Quay (`R`)**: Quay video kèm trọn vẹn tiếng hiệu ứng meme.
  - **🏆 Thử thách (Pose Challenge)**: Chơi 5 lượt tạo dáng tính điểm & xuất photo strip kỷ lục.

### F. Phím tắt tiện lợi
| Phím tắt | Tác dụng |
| --- | --- |
| `Space` | Chụp ảnh Photobooth |
| `R` | Bắt đầu / Dừng quay video |
| `M` | Đổi giữa `Meme cử chỉ` và `Vẽ chuột` |
| `Ctrl + Z` / `Ctrl + Shift + Z` | Hoàn tác / Làm lại |
| `D` | Mở/đóng bảng thông số kỹ thuật (FPS, điểm từng cử chỉ, chỉnh ngưỡng) |
| `Esc` | Đóng hộp thoại / Huỷ chụp |
| `←` / `→` | Lật trang trong Photo Book |

---

## 3. Hướng dẫn Deploy lên Internet (Miễn phí 100%)

Vì MemeBooth Studio chạy **100% ở phía trình duyệt**, bạn không cần thuê server backend. Dự án đã cấu hình sẵn `vite.config.ts` (`base: './'`), `vercel.json` và `public/_headers` (cache bất biến cho model AI + cấp quyền camera HTTPS).

### Chuẩn bị: Đẩy mã nguồn lên GitHub (làm 1 lần)
```bash
cd MemeBooth-Studio
git add .
git commit -m "Upgrade MemeBooth Studio 2026: AI gestures, Beauty, AR props, Lite mode"
git push origin main
```

---

### Cách 1: Cloudflare Pages *(Khuyên dùng — Miễn phí băng thông không giới hạn)*
Cloudflare Pages không giới hạn băng thông miễn phí (cực tốt vì model AI nặng ~12 MB) và tự nhận file `public/_headers`.

1. Đăng nhập miễn phí tại **[dash.cloudflare.com](https://dash.cloudflare.com/)**.
2. Chọn **Workers & Pages** → **Create** → tab **Pages** → **Connect to Git**.
3. Chọn repository `MemeBooth-Studio`.
4. Điền thông số build:
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
5. Mở **Environment variables** → thêm:
   - `NODE_VERSION` = `22`
6. Bấm **Save and Deploy** → nhận ngay link HTTPS `https://<ten-du-an>.pages.dev`.

---

### Cách 2: Vercel *(1-Click từ GitHub, tự nhận `vercel.json`)*
1. Đăng nhập **[vercel.com](https://vercel.com/)** bằng tài khoản GitHub.
2. Bấm **Add New… → Project** → Import `MemeBooth-Studio`.
3. Kiểm tra thiết lập:
   - **Framework Preset**: `Vite`
   - **Install Command**: `npm ci`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Trong **Settings → General → Node.js Version**, chọn **22.x** (hoặc **24.x**).
5. Bấm **Deploy** → nhận link HTTPS `https://<ten-du-an>.vercel.app`.

---

### Cách 3: Netlify *(Kéo-thả thư mục `dist/` không cần Git, hoặc nối GitHub)*
- **Kéo thả nhanh 30 giây:** Chạy `npm run build` trên máy → mở **[app.netlify.com/drop](https://app.netlify.com/drop)** → kéo nguyên thư mục `dist/` thả vào trình duyệt là có ngay link HTTPS!
- **Hoặc nối GitHub:** Vào **[app.netlify.com](https://app.netlify.com/)** → **Import from Git** → Build command `npm run build`, Publish directory `dist`, biến môi trường `NODE_VERSION=22`.

---

### Cách 4: GitHub Pages *(Miễn phí trực tiếp trên GitHub)*
1. Tạo file `.github/workflows/deploy.yml` trong dự án:
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
2. Push lên nhánh `main` → vào **Settings → Pages → Source** chọn **GitHub Actions**.
3. Truy cập tại `https://<username>.github.io/MemeBooth-Studio/`.

---

## 4. Checklist Kiểm tra sau khi Deploy

- [ ] Link mở ra có **HTTPS** (`https://...`) để trình duyệt cho phép bật Camera & Micro.
- [ ] Ở màn hình chính, góc dưới hiện **"Sẵn sàng ngoại tuyến"** sau lần tải đầu; tắt Wi-Fi và bấm F5 vẫn chạy bình thường.
- [ ] Thử giơ 👍, ✌️, 🤟, ✊, 😮, 🫶 trước camera — thanh Radar phía trên sáng và meme nổ mượt.
- [ ] Thử mở trên điện thoại / máy yếu và bật **⚡ Máy nhẹ** để trải nghiệm FPS mượt tối đa.

> **Lưu ý khi gặp sự cố:**
> - Nếu build trên cloud báo thiếu model AI: đảm bảo nền tảng chạy `npm ci` (không dùng `--ignore-scripts`) để `scripts/fetch-assets.mjs` tự tải model.
> - Nếu cập nhật bản mới nhưng trình duyệt vẫn hiện bản cũ do cache Service Worker: đóng hết tab cũ rồi mở lại, hoặc bấm `Ctrl + Shift + R`.
