# Thư mục ảnh

Thả file **đúng tên** vào **đúng thư mục** rồi chạy `npm run art` là xong — code đã
có đường lùi nên thiếu file thì web dùng ảnh tạm, không vỡ giao diện.

Mô tả chi tiết từng ảnh → [`docs/art-brief.md`](../../docs/art-brief.md)

## Đã có

| Thư mục | Có | Quy cách sau xử lý |
|---|---|---|
| `realm/` | 10/10 nền cảnh giới | 1280×1280 JPG · 78–208 KB |
| `chibi/` | 2/2 đạo nhân | 512×512 PNG alpha · 62–70 KB |
| `encounter/` | 6/6 tranh kỳ ngộ | 1024×576 JPG · 21–64 KB |
| `element/` | 5/5 ngũ hành | 512×512 PNG alpha · 44–106 KB |
| `banner/` | 8/8 dải đầu bảng | 1200×240 JPG (5:1) · 18–35 KB |
| `award/` | 16/16 huy hiệu | 512×512 PNG alpha · 102–132 KB |
| `avatar/` | 4/4 ảnh đại diện | 256×256 PNG · 43–45 KB |
| `rail/` | 11/11 icon hai cột hub | 256×256 PNG alpha · 24–34 KB |
| `sky/` | 4/4 panorama trời cho lớp 3D | 2048×1024 webp · 71–115 KB |
| `media/` | 5 video + 1 audio | `thien-loi` 2,0 MB · `do-kiep-chibi` 1,7 MB · `dot-pha` 1,3 MB · `phi-thang` 792 KB · `be-quan` 380 KB · `ambient.mp3` 4,1 MB |
| `beast/` | 18 linh thú | có sẵn từ đầu |
| `pill/` `icon/` `page/` `scene/` `media/` `ui/` | ảnh nền, icon, video | có sẵn từ đầu |

Ba file icon ứng dụng nằm ở `public/` (không phải ở đây): `favicon.png`,
`apple-touch-icon.png`, `og.jpg`. Riêng `og.jpg` do `scripts/make-og.mjs` dựng
từ `art-src/og-bg.png` — chữ ghép bằng code nên đổi khẩu hiệu chỉ cần chạy lại.

## Không còn thiếu gì

121 file ảnh, video và audio đã đủ. Chỉ `media/ambient.mp3` còn là đồ mượn —
sẽ thay bằng nhạc tổng hợp WebAudio, không phải việc art.

## Quy trình khi thả ảnh mới

```bash
npm run art                 # chuẩn hoá tất cả nhóm (chạy lại nhiều lần vô hại)
npm run art award avatar    # hoặc chỉ nhóm cần
npm run art:check award     # dựng bảng soi ảnh → /tmp/art-check.jpg
```

Gửi nhiều ảnh dồn trong **một file ảnh ghép** cũng được — cắt rời trước rồi mới
chuẩn hoá, tên truyền vào theo thứ tự đọc trái→phải, trên→dưới:

```bash
# các ô cách nhau bằng rãnh màu phẳng → dò tự động
node scripts/slice-sheet.mjs public/art/award/sheet.png first-step ten-tasks ...

# các ô DÍNH LIỀN không có rãnh → phải chỉ định lưới
node scripts/slice-sheet.mjs public/art/avatar/sheet.png --grid 2x2 avatar-1 avatar-2 avatar-3 avatar-4

# ảnh ghép NỀN TRONG SUỐT, ô chạm nhau hoặc hàng cuối lệch giữa
node scripts/slice-alpha.mjs public/art/beast/sheet.png --dry            # xem lưới dò được
node scripts/slice-alpha.mjs public/art/beast/sheet.png --ink 120 a b c  # nâng ngưỡng nếu ô dính nhau

# sheet có nung tên file dưới mỗi hình
node scripts/strip-labels.mjs art-src/beast/sheet.png

npm run art award avatar
```

`npm run art` tự làm những việc sau, nên **không cần xuất đúng kích thước từ đầu**:
đổi PNG nặng sang JPG, thu nhỏ về đúng cỡ, tách nền trắng hoặc nền ô caro thành
alpha thật, cắt lề trong suốt rồi đặt vào khung vuông.

Bản gốc được sao vào `art-src/` (ngoài `public/` nên không vào bản build, và đã
nằm trong `.gitignore`).

Đặt file vào `public/art/…`, **không phải `dist/art/…`** — `dist/` là thư mục
build, bị xoá mỗi lần build lại.

Hai điều script **không** tự sửa được:
1. **Chữ nung trong ảnh** — phải vẽ lại.
2. **Vùng trắng nằm kín trong lòng chủ thể**: script mặc định coi là chi tiết của
   tranh và giữ lại. Icon dạng rỗng cần thông lòng thì thêm tên file vào danh
   sách `HOLLOW` trong `scripts/prepare-art.mjs` (hiện có `element/kim.png`).
