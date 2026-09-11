# Yêu cầu ảnh — Đạo Trình

Web app tu tiên, giao diện **vàng kim trên đen nâu**. Mọi chữ và thành phần UI do
web vẽ đè lên → ảnh chỉ là **nền và minh hoạ**.

**Tình trạng: xong toàn bộ art. Chỉ còn `ambient.mp3` là đồ mượn, sẽ tổng hợp bằng code.**

| Nhóm | Tình trạng |
|---|---|
| `realm/` nền 10 cảnh giới | ✅ xong |
| `chibi/` 2 đạo nhân | ✅ xong |
| `encounter/` 6 tranh kỳ ngộ | ✅ xong |
| `element/` 5 ngũ hành | ✅ xong |
| `banner/` 8 dải đầu bảng | ✅ xong |
| `award/` 16 huy hiệu | ✅ xong |
| `avatar/` 4 ảnh đại diện | ✅ xong |
| `media/thien-loi.mp4` | ✅ xong |
| icon ứng dụng (3 file) | ✅ xong |
| `rail/` 11 icon hai cột hub | ✅ xong |
| video mốc lớn 2 file | ✅ xong |
| video bế quan chibi | ✅ xong |
| `elder/` 13 chân dung tiền bối | ⭕ nên có → mục C1 |
| `empty/` 5 minh hoạ trạng thái trống | ⭕ nên có → mục C2 |

Tên file rút gọn + quy trình xử lý: [`public/art/README.md`](../public/art/README.md)

---

# A. Quy chuẩn — gửi kèm một lần cho cả bộ

## A1. Những thứ KHÔNG cần lo — script tự sửa

Sau khi thả ảnh vào, tôi chạy `npm run art`. Script tự làm hết những việc sau, nên
**đừng mất thời gian chỉnh tay**:

| Việc | Script làm gì |
|---|---|
| Sai định dạng | PNG nặng → JPG; giữ PNG cho nhóm cần alpha |
| Sai kích thước | Thu nhỏ/cắt về đúng cỡ web cần |
| Nặng vài MB | Nén xuống 40–210 KB |
| **Nền trắng đặc** | Tách thành alpha thật, gỡ luôn viền bạc |
| **Nền ô vuông kẻ caro** (hoạ tiết trong suốt bị nung vào pixel) | Tách thành alpha thật |
| Lề trống quanh chủ thể | Cắt sát rồi đặt lại vào khung vuông |
| Ảnh vuông trong khi khung hiển thị là ngang | Cắt, và tôi neo điểm cắt trong code |
| **Nhiều ảnh xếp thành lưới trong MỘT file** | `scripts/slice-sheet.mjs` dò rãnh phân cách rồi cắt rời |

Nói cách khác: **xuất ảnh ở chất lượng cao nhất mà tool cho, đừng nén, đừng resize.**
Càng nhiều pixel càng tốt. Nền trắng cũng được, nền caro cũng được.

**Gửi ảnh ghép cũng được.** Nếu tool xuất nhiều ảnh dồn vào một file (kiểu 2 cột ×
4 hàng), cứ để nguyên — script tự dò rãnh phân cách và cắt rời, miễn là:
- Các ô xếp thành **lưới đều**, không so le.
- Rãnh phân cách là **màu phẳng**, sáng hẳn hoặc tối hẳn.
- Anh nói rõ **thứ tự đọc** (trái→phải, trên→dưới) ứng với ô nào là ảnh nào.

Bộ `banner/` vừa rồi được gửi kiểu này: một file 1983×793 chứa 8 ô, cắt bằng
`node scripts/slice-sheet.mjs public/art/banner/banner.png today week month goals focus cave awards stats`.

## A2. Những thứ BẮT BUỘC đúng — script không sửa được

Đây là 5 điều duy nhất cần để tâm. Sai là phải vẽ lại.

**1. Không có chữ trong ảnh.**
Không watermark, không logo, không chú thích, không thư pháp làm chủ thể, không
chữ trên biển hiệu / lá phướn / trang sách trong tranh. Web đã có chữ riêng, lại
có cả chế độ sáng và tối. *Ngoại lệ duy nhất: `favicon` — chữ 道 chính là logo.*

**2. Không có thành phần giao diện vẽ trong ảnh.**
Không thanh máu, không nút bấm, không ô thoại, không con trỏ, không khung viền
trang trí quanh ảnh.

**3. Đúng tên file, có đuôi file.**
Chữ thường, không dấu, đúng từng ký tự như trong phiếu. Đợt 1 có 2 file bị **mất
hẳn đuôi** (`hang-dong` thay vì `hang-dong.jpg`) — web không đọc được.

**4. Bố cục và hướng lệch chủ thể.**
Script cắt được nhưng không sáng tác lại được. Mỗi phiếu ghi rõ chỗ nào bị giao
diện che và chủ thể nên nằm đâu.

**5. Nền của nhóm cần alpha phải PHẲNG.**
Với `award/` và `avatar/`: nền phải là **một màu phẳng** (trắng là tốt nhất) hoặc
alpha thật hoặc ô caro. **Không** dùng nền có hoa văn, có gradient nhiều màu, có
cảnh vật — script không tách được nền như vậy.

## A3. Sáu lỗi thật đã gặp ở đợt 1 — tránh lặp lại

| Lỗi | Hậu quả | Lần này |
|---|---|---|
| Xuất PNG 2–4 MB/file | 23 ảnh nặng 48 MB, web mở lâu | Không sao, script nén — cứ xuất chất lượng cao |
| `realm/` xuất vuông 1264×1264 thay vì 1920×1080 | Cắt mất đài đá và tâm xoáy ở hai đầu tranh | Vẫn dùng được, nhưng **đọc kỹ ô "Vùng cấm"** |
| 2 file mất đuôi `.jpg` | Web không tải được | Kiểm lại tên trước khi gửi |
| `chibi/` có nền ô caro nung vào pixel | Nhìn như dán ảnh vuông lên nền | Script tách được rồi |
| `element/` nền trắng đặc | Như dán sticker trắng | Script tách được rồi |
| `kim.png` có vùng trắng **kín trong lòng lục giác** | Thành một khối trắng bệt giữa icon | Xem A5 |

## A4. Icon dạng rỗng — phải nói trước

Script tách nền bằng cách lan từ mép ảnh vào. Vùng trắng bị chủ thể **bao kín**
thì lan không tới, nên script mặc định **giữ lại** — vì thường đó là chi tiết của
tranh (ví dụ tâm trắng nóng của bông sen lửa trong `hoa.png`).

Nếu icon nào cố ý để **rỗng ở giữa** (như `kim.png`: sáu lưỡi kiếm ghép thành lục
giác, lòng lục giác phải trong suốt), **ghi rõ khi gửi** để tôi thêm vào danh sách
`HOLLOW`. Không nói thì icon đó sẽ có một khối trắng bệt ở giữa.

## A5. Ba phong cách, không được trộn

| Nhóm | Phong cách | Áp dụng |
|---|---|---|
| **A · Cảnh** | Digital painting bán tả thực, cinematic, có chiều sâu khí quyển | `realm`, `banner`, `encounter` |
| **B · Nhân vật** | Anime, nét sạch, màu phẳng bóng mềm | `chibi`, `avatar` |
| **C · Vật thể** | Game icon, vẽ chi tiết, có glow | `element`, `award` |

Không dùng fantasy phương Tây, steampunk, low-poly, pixel art.

**Tham chiếu tốt nhất là ảnh đã có trong project:**
- Nhóm A → `public/art/realm/09-do-kiep.jpg`
- Nhóm B → `public/art/chibi/idle.png`
- Nhóm C → `public/art/element/kim.png`, `public/art/element/thuy.png`

## A6. Nhân vật chuẩn — dùng cho `avatar/`

`avatar/` phải là **đúng nhân vật** đã vẽ trong `chibi/idle.png`. Đặc điểm đã
chốt, không đổi:

- Đạo nhân trẻ, dáng thanh, mặt anime trung tính
- **Tóc đen dài**, buộc **đuôi cao**, có **trang sức ngọc lục** ở gốc đuôi tóc
- **Mắt xanh lục nhạt**
- **Áo đạo bào ngoài màu xanh ngọc nhạt**, viền và hoa văn **kim tuyến vàng**
- **Áo trong màu trắng**
- **Đai lưng xanh đậm** có khoá vàng gắn ngọc lục, có dây tua rua thả xuống
- **Giày đen** viền vàng
- Bên vai có **một quả linh châu xanh lục phát sáng** bay lơ lửng

Bốn ảnh đại diện là cùng người này, **già dặn và sang trọng dần** theo cảnh giới.

## A7. Bảng màu app

Dùng làm **màu nhấn**, không dùng làm màu nền của ảnh.

| Vai trò | Mã màu |
|---|---|
| Vàng kim chủ đạo | `#c4a661` |
| Vàng sáng (nhấn mạnh) | `#f4d03f` |
| Nền đen nâu | `#0d0a08` |
| Ngọc bích | `#3fa796` |
| Chu sa (đỏ ấn triện) | `#a8321f` |

## A8. Độ sáng

Ảnh **nhóm A** vẽ **trầm hơn mức thấy đẹp một bậc** — web còn phủ thêm vignette
làm tối bốn cạnh và một lớp màu cảnh giới lên trên. Ảnh sáng gắt sẽ bị bệt.

Ảnh **nhóm C** thì ngược lại: nằm trên nền đen nên cần **sáng và tương phản cao**,
nếu không sẽ chìm.

## A9. Cách nghiệm thu

Khi anh gửi file về, tôi kiểm 6 điểm rồi báo lại từng file:

1. Có chữ trong ảnh không
2. Tên file và đuôi file có đúng không
3. Nền có phẳng (tách được) không — với nhóm cần alpha
4. Chủ thể có lấn vùng bị giao diện che không
5. Có phải icon dạng rỗng cần thông lòng không
6. Chạy `npm run art` rồi soi bằng `npm run art:check` trên nền tối

---

# B. Toàn bộ bộ art — giữ để tham chiếu cho nhất quán

## B1. `realm/` — nền 10 cảnh giới ✅
`1280×1280` JPG · 78–208 KB

Ảnh nguồn là **vuông**, khung hiển thị là 16:9 (máy tính) hoặc dọc (điện thoại),
nên trình duyệt luôn phải cắt. Tôi đã neo điểm cắt cho từng cảnh giới trong
`REALM_FOCUS` (`src/components/hub/HubScene.tsx`):

| File | Cảnh giới | Màu | Điểm cắt đã neo |
|---|---|---|---|
| `01-luyen-khi.jpg` | Luyện Khí | `#7fb7a8` | `62% 50%` — đệ tử ngồi thiền bên phải |
| `02-truc-co.jpg` | Trúc Cơ | `#4f9d6b` | `62% 58%` — đài bát quái nằm thấp |
| `03-kim-dan.jpg` | Kim Đan | `#e0a83c` | `38% 50%` — lò đan bên trái |
| `04-nguyen-anh.jpg` | Nguyên Anh | `#9b7fd4` | `62% 55%` — nguyên anh và mặt nước |
| `05-hoa-than.jpg` | Hoá Thần | `#c96fb0` | `38% 50%` — cây tùng bên trái |
| `06-luyen-hu.jpg` | Luyện Hư | `#5aa9c9` | `62% 50%` — cổng đá bên phải |
| `07-hop-the.jpg` | Hợp Thể | `#d4646f` | `38% 50%` — dãy điện bên trái |
| `08-dai-thua.jpg` | Đại Thừa | `#e08a3c` | `50% 50%` — đối xứng hai bên |
| `09-do-kiep.jpg` | Độ Kiếp | `#cf3f2f` | `58% 66%` — đài đá hứng lôi sát đáy |
| `10-phi-thang.jpg` | Phi Thăng | `#f4d03f` | `58% 45%` — cổng trời trên cao bên phải |

## B2. `chibi/` ✅
`512×512` PNG alpha · 62–70 KB · `idle.png`, `breakthrough.png`
Nhân vật chuẩn ghi ở mục A6.

## B3. `encounter/` ✅
`1024×576` JPG · 21–64 KB
`hang-dong` · `tan-hon` · `linh-thao` · `ma-tu` · `thien-vien` · `dan-lo`

## B4. `element/` ✅
`512×512` PNG alpha · 44–106 KB
`kim` (dạng rỗng) · `moc` · `thuy` · `hoa` · `tho`

## B5. `banner/` ✅
`1200×240` JPG (**tỷ lệ 5:1**) · 18–35 KB

Quy cách ban đầu tôi ghi 4:1, nhưng ảnh nhận được là 5:1 và **chủ thể nằm sát hai
mép** (bảng đá ở mép trái `today`, cây nến ở mép phải `stats`) — ép về 4:1 sẽ cắt
mất 10% mỗi bên. Nên tôi đổi quy cách sang 5:1 cho khớp.

| File | Bảng | Nội dung |
|---|---|---|
| `today.jpg` | Nhật khoá hôm nay | Bảng đá khắc hoa văn, sân tông môn, nắng sớm xiên |
| `week.jpg` | Kế hoạch tuần | Đèn lồng treo dọc hành lang gỗ, xa dần |
| `month.jpg` | Kế hoạch tháng | Các pha mặt trăng xếp vòng cung trên trời đêm |
| `goals.jpg` | Đại nguyện | Núi cao, đường mòn lên mất trong mây |
| `focus.jpg` | Bế quan | Cửa động đá đóng, pháp trận sáng, lư hương |
| `cave.jpg` | Động phủ | Kệ bình đan, tinh thạch phát sáng, lồng linh thú |
| `awards.jpg` | Tiên lộ | Bậc thang đá lên mây, hai bên trụ đá khắc |
| `stats.jpg` | Thống kê | Bàn gỗ, sổ trúc mở trang trống, bàn tính, la bàn, nến |

## B6. `award/` ✅
`512×512` PNG alpha · 102–132 KB · 16 huy hiệu

Nhận dạng ảnh ghép 4×4 (1254×1254), cắt bằng `slice-sheet.mjs`. Hào quang kem
quanh vành vàng cần ngưỡng tách riêng (`cut: 'glow'`) — ngưỡng `'white'` để lại
viền trắng bệt trên nền tối.

Hiển thị: huy hiệu đã có vành vàng riêng nên bỏ ô màu phía sau. Kỳ ngộ **chưa mở
thì hiện huy hiệu xám mờ 30% kèm ổ khoá nhỏ** thay vì che kín — thấy trước cái
mình đang nhắm tới. Lúc mở được thì huy hiệu hiện luôn trên thẻ ăn mừng.

| File | Kỳ ngộ | File | Kỳ ngộ |
|---|---|---|---|
| `first-step` | Nhập Đạo | `focus-600` | Thập Thời Bế Quan |
| `ten-tasks` | Sơ Khai Linh Trí | `focus-3000` | Toạ Vong Chi Cảnh |
| `fifty-tasks` | Đạo Tâm Kiên Định | `deadline-hunter` | Thần Tốc Trảm Kiếp |
| `hundred-tasks` | Bách Chiến Bách Thắng | `bomb-squad` | Trảm Tâm Ma |
| `streak-3` | Tam Nhật Bất Đoạn | `perfect-day` | Nhật Khoá Viên Mãn |
| `streak-7` | Thất Nhật Vô Gián | `perfect-week` | Thất Nhật Viên Mãn |
| `streak-30` | Đạo Tâm Như Thép | `goal-crusher` | Đại Nguyện Thành |
| `focus-60` | Nhất Khắc Nhập Định | `early-bird` | Kê Minh Tức Khởi |

## B7. `avatar/` ✅
`256×256` PNG · 43–45 KB · `avatar-1` … `avatar-4`

Nhận dạng ảnh ghép 2×2 (1254×1254). Các ô **dính liền không có rãnh phân cách**
(mỗi ô một màu nền riêng) nên phải cắt bằng `--grid 2x2`, dò tự động không ra.

| File | Mốc cảnh giới | Đặc điểm |
|---|---|---|
| `avatar-1.png` | Luyện Khí – Trúc Cơ | Áo xanh ngọc giản dị, dây vải buộc tóc, mặt non, không hào quang |
| `avatar-2.png` | Kim Đan – Hoá Thần | Áo lụa vàng thêu kim tuyến, trâm ngọc có tua, một vòng kim quang |
| `avatar-3.png` | Luyện Hư – Đại Thừa | Áo tím than thêu tinh tú, hộ giáp ngọc, mắt sáng tím, vòng sáng tím |
| `avatar-4.png` | Độ Kiếp – Phi Thăng | Áo trắng viền kim, mũ miện, mắt vàng, vầng sáng đầy + tia lôi tím |

Mốc đổi ảnh nằm ở `HeaderHUD.tsx` (`avatarTier`): cảnh giới 0–1 → 1, 2–4 → 2,
5–7 → 3, 8–9 → 4.

## B8. `media/thien-loi.mp4` ✅
`720×1280` **dọc** · 6,0 giây · 24 fps · H.264 · 2,09 MB · không âm thanh

Quy cách ban đầu tôi ghi 1280×720 ngang, nhận được 720×1280 dọc. Thay vì cắt lấy
dải giữa (chỉ còn 22% chiều cao), tôi đổi cách hiển thị: **video làm nền cả hộp
thoại độ kiếp** — hộp thoại cũng cao hơn rộng nên giữ được ~64% khung hình.

- Lúc chờ: video mờ 55%, lớp phủ tối 82% → chỉ làm không khí, chữ vẫn đọc rõ.
- Lúc thiên kiếp giáng: video sáng 100%, lớp phủ hạ còn 35% → video thành chủ thể.
- Phần mô tả đổi thành "Thiên kiếp giáng lâm…" thay vì phủ chữ đè lên tiêu đề.

File gốc có track âm thanh AAC, đã tách bỏ (`ffmpeg -an -c:v copy`) vì thẻ video
luôn chạy `muted`. Bản gốc giữ ở `art-src/media/`.

Sân khấu three.js cũ (`TribulationScene.tsx`) đã xoá — video thay được hoàn toàn.
three.js vẫn dùng cho nền 3D toàn app (`Scene3DBackdrop.tsx`).

## B10. `rail/` — 11 icon hai cột hub ✅
`256×256` PNG alpha · 24–34 KB

Thay bộ mượn từ Tiên Ma Giới vốn có **chữ nung sẵn trong ảnh**: app đã vẽ nhãn
riêng ngay dưới icon nên chữ hiện hai lần, và năm cái ghi khác hẳn nhãn ("BXH"
trong khi nhãn là "Thống Kê"). Bộ mới không có chữ.

`be-quan` · `nhat-khoa` · `tien-lo` · `thong-ke` · `linh-can` · `linh-thu` ·
`dan-duong` · `dong-phu` · `cai-dat` · `linh-thach` · `chieu-thu`

Bộ này gửi tới **đã có alpha thật**, hào quang quanh vật thể là alpha bán trong
suốt do hoạ sĩ vẽ — nên `npm run art rail` **không tách nền**, chỉ cắt lề trong
suốt rồi thu vừa khung vuông (`fit: 'contain'`; icon không vuông mà dùng `cover`
sẽ cắt mất một phần).

`tien-lo.png` có chữ số nhỏ trên các bậc thang, hơi lệch quy chuẩn "không chữ
không số". Ở cỡ hiển thị thật 36 px thì nó thành vân trên bậc, không đọc được —
nên giữ nguyên. Chỉ cần vẽ lại nếu sau này icon được hiện to hơn.

## B11. Bốn video + một audio ✅

| File | Dài | Dung lượng | Dùng ở |
|---|---|---|---|
| `be-quan.mp4` | 2,3 s | 380 KB | Bế quan — lặp suốt phiên nhập định |
| `thien-loi.mp4` | 6,0 s | 2,0 MB | Hộp thoại độ kiếp, **lúc chờ** (mây đen tụ) |
| `do-kiep-chibi.mp4` | 6,5 s | 1,7 MB | Hộp thoại độ kiếp, **lúc chống kiếp** |
| `dot-pha.mp4` | 10,0 s | 1,3 MB | Thẻ ăn mừng độ kiếp thành công |
| `phi-thang.mp4` | 10,0 s | 792 KB | Thẻ ăn mừng phi thăng |
| `ambient.mp3` | 174 s | 4,1 MB | Nhạc nền lúc nhập định |

Ba video nhận về đều **1280×720, 10 giây, có track âm thanh AAC** — đã tách bỏ
tiếng cả ba (`ffmpeg -an`) vì thẻ `<video>` luôn chạy `muted`.

### Một video gốc chia thành hai

File gốc tên `Chibi_cultivator_breakthrough.mp4` là **một cung cảm xúc trọn vẹn**:
giây 0–2 ngồi thiền linh khí xanh tụ → giây 4 kim quang bùng → **giây 6 cận mặt
mở mắt tóc tạt ngược** → giây 8–9 lắng lại. Cắt theo cung đó thành hai:

- **0–3 s → `be-quan.mp4`** (phần tĩnh tại)
- **2,5–9 s → `do-kiep-chibi.mp4`** (phần đột phá)

### Vòng lặp cho `be-quan.mp4`: chồng mờ, không đảo chiều

Video này lặp suốt một phiên 25 phút nên chỗ nối phải sạch. Ba cách và lý do chọn:

| Cách | Kết quả |
|---|---|
| Cắt thẳng một đoạn | ❌ `scripts/find-loop.mjs` quét cả 10 s: **không có điểm lặp tự nhiên nào** — linh khí tăng dần đơn điệu nên không hai khung nào giống nhau (chỗ nối lệch 17–27 so với 9 giữa hai khung liền nhau) |
| Nối thêm bản chạy ngược (ping-pong) | ❌ Lặp thì khớp tuyệt đối, nhưng thành **hít khí vào rồi nhả ra** — sai hẳn: tu luyện là hấp thu MỘT CHIỀU |
| **Chồng mờ đuôi vào đầu** | ✅ Luôn chạy xuôi, chỗ nối biến mất, và vòng lặp ở trạng thái **đang hấp thu liên tục** thay vì tụ rồi reset |

`scripts/loop-video.mjs` làm việc này: với đoạn dài `D` và độ chồng mờ `X`, bản
ra dài `D − X`, trong đó `[0..X)` là đuôi chồng mờ vào đầu và `[X..D−X)` phát
nguyên. Khung cuối khớp khung đầu nên lặp không thấy chỗ nối.

```bash
node scripts/find-loop.mjs <video> [giây tối thiểu] [từ-đến]   # đo xem có lặp thẳng được không
node scripts/loop-video.mjs <vào> <ra> <đầu> <cuối> [chồng mờ]  # dựng vòng lặp chồng mờ
```

### Ba chỗ đổi trong code cho khớp video

- `STRIKE_MS` **2800 → 6600 ms** trong `TribulationDialog`, khớp độ dài
  `do-kiep-chibi.mp4` để xem trọn cung: kim quang bùng → mở mắt → lắng lại.
  Chỉ xảy ra 9 lần cả hành trình nên chờ là đáng.
- Thẻ ăn mừng **tự đóng sau 10 s** khi mốc đó có video (độ kiếp, phi thăng),
  vẫn 5 s cho các mốc thường. Trước đó tôi cắt video còn 5 s cho vừa thẻ —
  làm mất **bóng người bay lên ở giây 6–8** của `phi-thang` và **cú bùng thành
  vòng sáng ở giây 6** của `dot-pha`. Giờ giữ trọn 10 s và nới thẻ.
- Lúc đang chống kiếp, khối thông tin trong hộp thoại **mờ hẳn đi** (vẫn giữ
  chỗ nên khung không nhảy) — video mở 100% thì chữ chìm, mà lúc đó cũng không
  còn gì để đọc hay để chọn.

## B9. Icon ứng dụng ✅## B9. Icon ứng dụng ✅
Đặt ở `public/`, không phải `public/art/`.

| File | Kích thước | Ghi chú |
|---|---|---|
| `favicon.png` | 512×512 PNG · 14 KB | Ấn triện chu sa khắc 道 — ảnh duy nhất được có chữ |
| `apple-touch-icon.png` | 180×180 PNG · 4,7 KB | Cùng thiết kế, nền phủ đầy khung |
| `og.jpg` | 1200×630 JPG · 54 KB | Ảnh chia sẻ link |

`og.jpg` **do code dựng**, không nung chữ vào tranh: `node scripts/make-og.mjs`
lấy nền từ `art-src/og-bg.png` (ảnh Phi Thăng làm mờ, giữa để trống) rồi ghép ấn
triện, tên app và khẩu hiệu lên. Đổi tên hay khẩu hiệu thì sửa `make-og.mjs` và
chạy lại, không cần vẽ lại tranh.

`index.html` đã nối đủ `rel="icon"`, `apple-touch-icon`, thẻ `og:*` và
`twitter:*`. **Khi có tên miền thật, đổi `og:image` thành URL tuyệt đối**
(`https://<tên-miền>/og.jpg`) — nhiều nơi bóc link không hiểu đường dẫn tương đối.

---

# C. Còn thiếu — 29 file

# C. Đợt cuối — 45 ảnh, đã xong

Sáu sheet gửi một lượt, cắt và chuẩn hoá hết.

| Nhóm | Số | Quy cách sau xử lý | Thay cho |
|---|---|---|---|
| `beast/` | 18 | 512×512 PNG alpha · 1,7 MB | đồ mượn `images/pet/*`, `images/u_minh/*` |
| `elder/` | 13 | 256×256 PNG · 0,5 MB | chưa có gì — châm ngôn chỉ có chữ |
| `section/` | 6 | 512×512 PNG alpha · 0,7 MB | dùng lại ảnh kỳ ngộ và ảnh mượn |
| `empty/` | 5 | 512×512 PNG alpha · 0,5 MB | chưa có gì — chỉ có icon nét |
| `pill/` | 3 | 512×512 PNG alpha · 0,3 MB | đồ mượn `images/items/pill_*` |
| `scene/cave.jpg` | 1 | 1600×1200 JPG · 167 KB | đồ mượn `images/page/cave_bg.jpg` |

## Ba việc phát sinh khi cắt

**1. Lưới đều không cắt được.** Các ô chạm nhau và hàng cuối lệch giữa (beast
4/4/4/4/2, elder 4/4/4/1, empty 3/2). Viết `scripts/slice-alpha.mjs`: dò HÀNG
trước rồi dò CỘT TRONG TỪNG HÀNG, dựa vào kênh alpha chứ không dựa rãnh màu.
Có `--dry` để in lưới dò được trước khi cắt, và `--ink` để nâng ngưỡng alpha khi
hào quang mờ bắc cầu giữa các ô (`empty`/`section` cần 120, `pill` cần 180).

**2. Sheet linh thú có nung tên file dưới mỗi con.** Viết
`scripts/strip-labels.mjs`: tìm viên nhãn theo MÀU đo được (`rgb(120,120,136)`,
bão hoà 0,12) rồi lọc theo DÁNG (rộng > 70 px, cao 14–46 px, tỷ lệ > 2,5) nên
thân con vật màu xám không bị nhầm. Tìm đúng 18 nhãn, xoá sạch. Bốn sheet kia
kiểm lại: 0 nhãn.

**3. Năm linh thú cũ là `.jpg`, bộ mới toàn `.png`.** Đổi 5 đường dẫn trong
`beasts.ts` rồi xoá file `.jpg` mượn, tránh hai bản cùng tồn tại.

## Chỉ còn `ambient.mp3`

File nhạc nền vẫn là `audio/nen.mp3` của Tiên Ma Giới. **Không cần anh cấp file** —
tôi tổng hợp bằng WebAudio được, vừa hết vướng bản quyền vừa đổi được theo cảnh
giới. Đây là việc code, không phải việc art.

---

# D. Phụ lục — prompt tiếng Anh

**Chỉ dùng khi đặt qua tool sinh ảnh. Gửi cho người vẽ thì bỏ hẳn phần này.**

Cách ghép: dịch phần *Nội dung* / *Biểu tượng* trong phiếu sang tiếng Anh, rồi
nối thêm đuôi tương ứng với nhóm.

**Đuôi nhóm A — cảnh** (`banner`)
```
wide cinematic banner, Chinese xianxia style, digital painting, semi-realistic,
atmospheric depth, muted and dark, empty center, no text, no watermark,
no UI elements, no border
```

**Đuôi nhóm B — nhân vật** (`avatar`)
```
anime bust portrait facing forward, clean lineart, flat colors with soft shading,
flat dark solid background, head centered with margin, no text, no border, no logo
```

**Đuôi nhóm C — vật thể** (`award`, `rail`)
```
ornate game achievement badge icon, Chinese xianxia style, painted, centered on a
gold-rimmed medallion, gold #c4a661 rim with soft glow, bold readable silhouette,
high contrast, plain white background, no text, no numbers, no border
```

Riêng `rail/` thì **bỏ phần medallion** (đó là khuôn của `award/`), thay bằng:
```
ornate game UI icon, Chinese xianxia style, painted, single centered object
floating with no base and no frame, gold #c4a661 accents, soft glow, bold
readable silhouette, high contrast, plain white background, no text, no border
```

**Nhắc lại điều dễ quên nhất khi dùng tool sinh ảnh**
1. Thêm `no text, no letters, no watermark` vào mọi prompt — tool rất hay tự thêm chữ.
2. Với `award/`: thêm `plain white background` để script tách nền được.
3. Với `avatar/`: mô tả lại nhân vật ở mục A6 trong TỪNG prompt, nếu không bốn
   ảnh sẽ ra bốn người khác nhau.
4. Xuất ở độ phân giải cao nhất, **đừng** tự resize hay nén.

---

# Tổng kết

| Nhóm | Số file | Tình trạng |
|---|---|---|
| `realm/` 10 · `chibi/` 2 · `encounter/` 6 · `element/` 5 | 23 | ✅ |
| `banner/` 8 · `award/` 16 · `avatar/` 4 · `rail/` 11 | 39 | ✅ |
| `beast/` 18 · `elder/` 13 · `section/` 6 · `empty/` 5 · `pill/` 3 | 45 | ✅ |
| `sky/` 4 · `media/` 5 · `scene/` 2 · icon ứng dụng 3 | 14 | ✅ |
| **Tổng** | **121** | **✅ đủ** |

**Không còn ảnh nào phải tạo.** `public/art` 18,1 MB.

Chỉ còn `media/ambient.mp3` là đồ mượn, và đó là việc code chứ không phải việc
art — tôi tổng hợp nhạc nền bằng WebAudio.

Việc còn lại không liên quan đến ảnh: khi deploy, đổi `og:image` trong
`index.html` thành URL tuyệt đối.
