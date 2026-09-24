# Ấn cảnh giới — 10 tấm

Hiện tại ấn cảnh giới **không phải ảnh**: nó là một ô CSS đổ màu, in tên cảnh
giới bằng chữ thường vào giữa. Trên ảnh chụp nó ra một hình vuông đỏ phẳng —
thứ duy nhất trong cả màn hình trông như một widget web chứ không như một món
đồ trong game.

Mà nó lại là hình được nhìn nhiều nhất: nằm trong vòng tu vi ở sảnh màn rộng,
trong thẻ cảnh giới ở Tiên Lộ, và trong thang mười bậc.

## Quy cách

- **PNG nền trong suốt**, vuông, tối thiểu 512×512. Thả vào thư mục này rồi
  chạy `npm run art -- seal`.
- Vật thể là **một cái ấn/huy hiệu**, không phải một khung có chữ. Chữ Hán có
  thể khắc trên ấn, nhưng đọc được hay không không quan trọng — app vẫn in tên
  tiếng Việt ở chỗ khác.
- **Mười tấm cùng một hình dáng gốc**, chỉ khác chất liệu và độ rực: bậc đầu
  thô sơ, bậc cuối rực rỡ. Đây là thang tiến bộ — che chữ đi vẫn phải xếp được
  đúng thứ tự.
- Nhìn rõ ở cỡ **44×44 px**. Chi tiết nhỏ hơn nét chữ sẽ mất sạch. Vẽ xong thì
  thu nhỏ xuống 44px xem còn nhận ra không.
- Chừa quầng sáng nhẹ quanh ấn ở các bậc cao (alpha mềm, không viền cứng).

## Danh sách

| File | Cảnh giới | Chất liệu gợi ý |
| --- | --- | --- |
| `01-luyen-khi.png` | Luyện Khí | Gỗ mộc, khắc vụng, dây gai |
| `02-truc-co.png` | Trúc Cơ | Đá xám, viền đồng |
| `03-kim-dan.png` | Kim Đan | Đồng vàng, tâm tròn như viên đan |
| `04-nguyen-anh.png` | Nguyên Anh | Bạc, hào quang xanh lam mờ |
| `05-hoa-than.png` | Hoá Thần | Ngọc lục, vân mây khắc chìm |
| `06-luyen-hu.png` | Luyện Hư | Ngọc tím, rỗng giữa, ánh sáng xuyên qua |
| `07-hop-the.png` | Hợp Thể | Vàng ròng, hai lớp xoay lồng nhau |
| `08-dai-thua.png` | Đại Thừa | Vàng nạm ngọc, hào quang vàng |
| `09-do-kiep.png` | Độ Kiếp | Kim loại sạm sét, tia điện tím quanh viền |
| `10-phi-thang.png` | Phi Thăng | Pha lê trắng phát sáng, mây lành |

## Prompt gợi ý

```
[CHUNG]
single ornate Chinese cultivation rank seal emblem, isolated on transparent
background, front view, symmetrical, centered, game UI icon, painterly
semi-realistic, crisp readable silhouette at small size, subtle inner
engraving, no text overlay, no watermark, no background
```

- 01: `+ crude carved wood token, rough grain, hemp cord, dull`
- 02: `+ grey stone tablet seal, bronze rim, plain`
- 03: `+ golden bronze seal, round pill motif at center, warm glow`
- 04: `+ silver seal, soft cyan aura, flowing infant-spirit motif`
- 05: `+ green jade seal, carved cloud patterns, soft sheen`
- 06: `+ violet jade seal, hollow center, light passing through`
- 07: `+ solid gold seal, two interlocking rotating rings`
- 08: `+ gold seal inlaid with jade, radiant golden halo`
- 09: `+ storm-scarred dark metal seal, violet lightning arcs on the rim`
- 10: `+ luminous white crystal seal, auspicious clouds, divine glow`

## Kiểm tra trước khi chốt

Xếp mười tấm cạnh nhau, thu mỗi tấm về 44px. Nếu che tên đi mà vẫn xếp được từ
thô tới rực, và vẫn phân biệt được tấm 3 với tấm 4, là đạt.
