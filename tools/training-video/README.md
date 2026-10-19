# Tự quay video hướng dẫn

Công cụ này tự quay các cảnh màn hình trong [kịch bản v2](../../docs/video/kich-ban-product-warehouses-orders.md) bằng Playwright.
- Cảnh 0 và cảnh 10 là title card và sơ đồ, nên dựng ở hậu kỳ chứ không quay.
- Mỗi cảnh chạy trong một browser context mới. Vì vậy dữ liệu demo luôn sạch, không cần xoá localStorage hay bấm *Restart prototype* giữa các lần quay.

## Chạy

```bash
npm run dev:web                                   # terminal 1, app ở 127.0.0.1:5177
node tools/training-video/record.mjs              # quay tất cả: 1 2 3 3b 4 5 6 7 8a 8b 9 9b
node tools/training-video/record.mjs 8a 8b        # chỉ quay lại vài cảnh
node tools/training-video/record.mjs --pace=0.3   # chạy thử nhanh để kiểm selector
node tools/training-video/record.mjs --headed     # mở cửa sổ để xem trực tiếp
```

Các tuỳ chọn khác:

| Tuỳ chọn | Mặc định | Tác dụng |
|---|---|---|
| `--base=<url>` | `http://127.0.0.1:5177` | Đổi địa chỉ app (hoặc dùng biến môi trường `BASE_URL`) |
| `--out=<thư mục>` | `outputs/training-video` | Đổi thư mục lưu clip |
| `--channel=<tên>` | `chrome` | Chọn trình duyệt. Mặc định dùng Google Chrome đã cài trên máy |

**Cần cài sẵn:**
- Google Chrome.
- `ffmpeg` (`brew install ffmpeg`) để cắt phần tải trang ở đầu clip và chuyển sang MP4.
- Bản ffmpeg riêng của Playwright dùng để quay: `cd apps/web && npx playwright install ffmpeg`.

## Kết quả

Clip nằm trong `outputs/training-video/` (thư mục này đã được gitignore):

- `<cảnh>.mp4`: 1920×1080, 30 fps, đã cắt bỏ phần tải trang ở đầu.
- `<cảnh>.markers.json`: các mốc highlight, gồm thời điểm (giây, tính từ đầu clip), nhãn và vùng `{x, y, w, h}`. Dùng file này để zoom vào đúng chỗ khi dựng bằng Remotion.
- `<cảnh>.error.png`: chỉ có khi cảnh bị lỗi, là ảnh chụp màn hình lúc lỗi.

Nếu một cảnh lỗi, script tự quay lại cảnh đó một lần. Nếu vẫn lỗi thì cảnh đó được báo trong dòng tổng kết cuối cùng.

## Lồng tiếng tiếng Việt (ElevenLabs)

`voiceover.mjs` đọc phần **Lời thoại** của từng cảnh trong kịch bản và tạo file giọng đọc kèm phụ đề.

**Cách script xử lý lời thoại:**
- Mỗi chỗ `(ngừng)` thành một khoảng lặng thật, mặc định 0,7 giây.
- Mỗi chỗ `/` thành một dòng phụ đề riêng.

### Thiết lập lần đầu

1. **Tạo API key** tại elevenlabs.io → *Developers → API Keys*. Bật 2 quyền: *Text to Speech* và *Voices: Read*.
2. **Tạo file `tools/training-video/.env`** (đã gitignore):
   ```
   ELEVENLABS_API_KEY=sk_...
   ```
3. **Chọn giọng.** Lệnh dưới đây liệt kê giọng có sẵn trong tài khoản và giọng tiếng Việt trong Voice Library, kèm link nghe thử:
   ```bash
   node tools/training-video/voiceover.mjs voices
   ```
   Giọng lấy từ Voice Library phải được *Add to my voices* trên web trước khi dùng. Chọn xong thì thêm vào `.env`:
   ```
   ELEVENLABS_VOICE_ID=...
   ```

### Chạy

```bash
node tools/training-video/voiceover.mjs --dry-run      # xem các đoạn sẽ đọc + số ký tự, không gọi API
node tools/training-video/voiceover.mjs                # tất cả cảnh 0–10
node tools/training-video/voiceover.mjs 8 9            # chỉ đọc lại vài cảnh
node tools/training-video/voiceover.mjs --speed=0.95   # đọc chậm lại một chút
```

Các tuỳ chọn khác:

| Tuỳ chọn | Mặc định | Tác dụng |
|---|---|---|
| `--model=` | `eleven_v4` | Model đọc. Các model có tiếng Việt: `eleven_v4`, `eleven_v4_turbo`, `eleven_v3`, `eleven_flash_v2_5` |
| `--stability=` | `0.45` | Thấp hơn thì ngữ điệu biến hoá hơn, cao hơn thì đều giọng hơn |
| `--style=` | `0.25` | Mức nhấn nhá, cảm xúc |
| `--pause=` | `0.7` | Độ dài khoảng lặng thay cho mỗi `(ngừng)`, tính bằng giây |
| `--language=vi` | không đặt | Ép đọc theo tiếng Việt. Mặc định không ép, để các thuật ngữ tiếng Anh như *Product Master* hay *Prepare shipment* được đọc đúng |

### Kết quả

File nằm trong `outputs/training-video/voice/`:
- `<cảnh>.mp3`: giọng đọc của từng cảnh.
- `<cảnh>.srt`: phụ đề, thời gian khớp theo từng ký tự.
- `timing.json`: thời lượng của từng cảnh và từng đoạn.

Các đoạn đã tạo được lưu cache trong `voice/.cache/`. Chạy lại chỉ tốn phí cho những câu đã sửa. Toàn bộ kịch bản khoảng 4.200 ký tự.

> Lưu ý: `.gitignore` có dòng `.env*`, nên `.env.example` cũng bị bỏ qua và không được commit. Hướng dẫn trong README này thay cho file đó.

## Dựng video hoàn chỉnh (ffmpeg, miễn phí)

```bash
node tools/training-video/record.mjs --fit          # quay lại, kéo giãn nhịp từng cảnh theo độ dài lời thoại
node tools/training-video/compose.mjs               # dựng → outputs/training-video/final/
node tools/training-video/compose.mjs --music=nhac.mp3   # thêm nhạc nền (âm lượng 8%)
```

`compose.mjs` ghép các phần sau:
- Title card và mục lục (cảnh 0).
- Thẻ chương `01–04`.
- Sơ đồ 4 mắt xích (đầu cảnh 8) và sơ đồ tổng kết (cảnh 10).
- Các clip quay màn hình, mỗi clip được tăng hoặc giảm tốc trong khoảng 0,75–1,35x cho khớp lời thoại.
- Zoom mượt vào các vùng nhỏ được highlight, lấy từ file `markers.json`.
- Phụ đề chồng thẳng lên hình. Khi vùng highlight nằm sát đáy màn hình, phụ đề tự chuyển lên trên.

Ngoài file `.mp4`, script xuất thêm file `.srt` riêng để tải lên Google Drive hoặc YouTube. Card và phụ đề được vẽ bằng Chrome, nên không cần bản ffmpeg có `drawtext`/`libass`.

Các tuỳ chọn khác:

| Tuỳ chọn | Tác dụng |
|---|---|
| `--no-zoom` | Bỏ hiệu ứng zoom |
| `--no-subtitles` | Không chồng phụ đề lên hình |
| `--keep-work` | Giữ lại các file trung gian trong `final/.work` để kiểm tra |

## Chỉnh nhịp cho khớp lời thoại

Mỗi thao tác đều có thời gian dừng, tính bằng ms (đối số cuối của `hover`, `click`, `type`, `highlight`). Khi đã có file lồng tiếng, chỉnh các số này trong `record.mjs` để clip dài bằng đoạn lời thoại tương ứng. Có thể dùng `--pace` để co giãn toàn bộ cùng lúc.

## Lưu ý

- **Selector:** script tìm phần tử theo chữ trên giao diện (tên nút, label, aria-label). Đổi chữ trên UI thì phải sửa selector tương ứng trong `record.mjs`.
