# Đồ đạc trong động phủ — nền trong suốt

Mỗi món ở đây gắn với **một điều kiện mở**. Sắm được là thấy nó xuất hiện ngay
trong phòng — đó là toàn bộ lý do nhóm này tồn tại. Cày cả tuần mà phòng vẫn y
nguyên thì không ai muốn cày.

Thiếu file nào thì món đó đơn giản là không hiện, phòng vẫn chạy bình thường.
Nên cứ vẽ được tới đâu thả vào tới đó, không phải đủ bộ mới dùng được.

## Quy cách

- **PNG nền trong suốt thật** (alpha), không phải nền trắng hay nền ô caro.
- Vuông, tối thiểu 768×768. Thả vào thư mục này rồi `npm run art -- prop`.
- **Cùng một góc nhìn với nền phòng**: nhìn ngang tầm mắt, hơi chếch xuống
  khoảng 10°. Không vẽ kiểu nhìn từ trên xuống.
- **Vẽ cả bóng đổ mờ dưới chân vật** (bóng tối mềm, alpha thấp). Không có bóng
  thì món đồ trông như dán đè lên phòng.
- Vật thể chạm **đáy khung**: app neo chân món đồ vào mặt sàn, nên khoảng trống
  thừa dưới đáy sẽ làm nó lơ lửng.
- Ánh sáng hắt từ **trái sang**, để khớp với luồng sáng trong nền phòng.

## Đợt 1 — cần trước (10 tấm)

| File | Món | Mở khi |
| --- | --- | --- |
| `bo-doan.png` | Bồ đoàn ngồi thiền | Luôn có — món đầu tiên của căn phòng |
| `lo-dan-1.png` | Lò đan đất nung sứt mẻ | Bậc động phủ 1–2 |
| `lo-dan-2.png` | Lò đan đồng ba chân, có lửa | Bậc 3–4 |
| `lo-dan-3.png` | Lò đan cổ bằng ngọc, lửa tím | Bậc 5 |
| `den-long-tat.png` | Đèn lồng chưa thắp, tối | — |
| `den-long-sang.png` | Đèn lồng đang cháy, hào quang ấm | **Mỗi việc xong hôm nay thắp một chiếc** |
| `gia-sach.png` | Giá sách trúc, đựng ngọc giản | Đã chọn công pháp |
| `ngoc-sang.png` | Ngọc sàng (giường đá ngọc) | Bậc động phủ ≥ 4 |
| `linh-tuyen.png` | Hồ linh tuyền nhỏ, nước phát sáng | Bậc động phủ ≥ 3 |
| `gia-kiem.png` | Giá treo kiếm | Cảnh giới ≥ Kim Đan |

**`den-long-tat` và `den-long-sang` phải cùng một cái đèn, cùng góc, cùng kích
thước** — chỉ khác đã thắp hay chưa. App xếp chồng đúng chỗ để đèn sáng dần lên
theo số việc làm xong trong ngày. Lệch nhau một chút là thấy nó nhảy.

## Đợt 2 — thêm cho phong phú

| File | Món | Mở khi |
| --- | --- | --- |
| `thu-an.png` | Án thư, bút nghiên, cuộn giấy | Có ≥ 3 đại nguyện |
| `dinh-tram.png` | Đỉnh trầm toả khói | Nhập định ≥ 10 giờ |
| `chau-linh-thao.png` | Chậu linh thảo cảnh | Đã hái ≥ 10 linh thảo |
| `hom-chua.png` | Chồng hòm gỗ đựng đồ | Đã mở ≥ 5 hòm kỳ ngộ |
| `bia-thanh-tuu.png` | Bia đá khắc chữ | Đạt ≥ 5 thành tựu |
| `tranh-treo.png` | Tranh sơn thuỷ treo vách | Bậc động phủ ≥ 4 |
| `chuong-dong.png` | Chuông đồng treo | Chuỗi ngày ≥ 30 |
| `binh-phong.png` | Bình phong gấp | Bậc động phủ ≥ 5 |

## Đợt 3 — đạo nhân trong phòng (`../chibi/`)

Hiện mới có `idle.png` và `breakthrough.png`. Thêm mấy tư thế này thì nhân vật
mới thật sự **sống trong phòng** chứ không phải đứng yên một kiểu:

| File | Tư thế | Hiện khi |
| --- | --- | --- |
| `ngoi-thien.png` | Ngồi kiết già trên bồ đoàn, mắt nhắm | Đang bế quan |
| `luyen-dan.png` | Đứng bên lò, tay bắt ấn | Đang luyện đan |
| `doc-sach.png` | Ngồi án thư đọc ngọc giản | Đang xem công pháp |
| `ngu.png` | Nằm ngọc sàng, ngủ | Đêm, không còn việc nào |
| `mung.png` | Nhảy lên, tay giơ cao | Vừa xong hết việc trong ngày |

Cùng nhân vật, cùng tỷ lệ, cùng bảng màu với `idle.png` đang có.

## Prompt gợi ý

```
[CHUNG]
single object, isolated on transparent background, Chinese xianxia game asset,
painterly semi-realistic, eye-level view tilted down 10 degrees, soft contact
shadow under the base, light coming from the left, teal and gold palette,
centered, object touching bottom edge of frame, high detail, no text,
no watermark, no background, no scenery
```

- `bo-doan`: `+ woven round meditation cushion, dark blue fabric, gold trim`
- `lo-dan-1`: `+ small chipped clay alchemy furnace, cracked, cold ashes`
- `lo-dan-2`: `+ bronze three-legged alchemy cauldron, orange flame inside, engraved trigrams`
- `lo-dan-3`: `+ ancient jade alchemy cauldron, violet flame, floating runes, ornate`
- `den-long-tat`: `+ hanging paper lantern, unlit, dark, hanging from a cord`
- `den-long-sang`: `+ hanging paper lantern, lit, warm glowing light, soft halo` *(cùng cái đèn với tấm trên)*
- `gia-sach`: `+ bamboo bookshelf with jade slips and scrolls`
- `ngoc-sang`: `+ jade stone bed platform, carved, silk mat`
- `linh-tuyen`: `+ small circular spirit spring pool, glowing cyan water, stone rim`
- `gia-kiem`: `+ wooden sword rack holding a sheathed jian sword`

## Kiểm tra trước khi chốt

Mở file trên nền tối. Nếu quanh vật có viền trắng hay ô caro mờ thì alpha chưa
sạch — chạy `node scripts/strip-labels.mjs public/art/prop/<file> --dry` để soi.
