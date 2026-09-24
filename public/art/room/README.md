# Nền phòng động phủ — 5 tấm

Đây là **căn phòng của người chơi**, trải kín màn hình khi bấm vào Động Phủ.
Khác hẳn thư mục `../cave/`: bên đó là ảnh vuông 512 nằm trong một ô nhỏ của
bảng nâng cấp, còn đây là cả không gian phủ hết màn.

## Quy cách

- **Tỷ lệ 16:9**, tối thiểu 1920×1080. Thả file thô vào chính thư mục này rồi
  chạy `npm run art -- room`, script tự thu về 1920×1080 webp.
- **Vẽ phòng TRỐNG.** Không lò đan, không bàn ghế, không giường, không người.
  Đồ đạc nằm ở `../prop/` và chỉ hiện khi người chơi sắm được — vẽ sẵn vào nền
  thì người chưa mua cũng thấy, hỏng hết ý nghĩa của việc nâng cấp.
- **Năm tấm cùng MỘT góc máy, cùng một tầm mắt.** Đây là thang nâng cấp: người
  ta phải nhận ra "vẫn chỗ này, nhưng rộng ra rồi". Khác góc là mất hẳn cảm
  giác đó.
- Chừa khoảng giữa cho đồ đạc: hai bên mép có thể rậm, nhưng **40% chính giữa
  phải thoáng** — điện thoại dựng đứng sẽ cắt mất hai bên.
- Sàn nằm ở khoảng **62–70% chiều cao** tính từ đỉnh, đều nhau ở cả năm tấm.
  Đồ đạc được kê theo mốc này.
- Tông màu tối, trầm; app phủ thêm một lớp màu cảnh giới lên trên.

## Danh sách

| File | Bậc | Phòng trông thế nào |
| --- | --- | --- |
| `1-hang-da-tho.webp` | 1 · Hang Đá Thô | Hốc đá hẹp, vách thô ráp, một khe nứt hắt sáng vào. Tối, ẩm, trần thấp. |
| `2-dong-phu-so-khai.webp` | 2 · Động Phủ Sơ Khai | Đã đục rộng gấp đôi, vách phẳng hơn, có cửa đá và bậc tam cấp. Sáng hơn chút. |
| `3-linh-dong.webp` | 3 · Linh Động | Trần cao hẳn, một mạch linh khí xanh lam chảy dọc vách, rêu phát sáng. |
| `4-dong-thien.webp` | 4 · Động Thiên | Rộng như một gian điện, cột đá chạm khắc, trần mở một giếng trời nhìn thấy mây. |
| `5-phuc-dia.webp` | 5 · Phúc Địa | Động biến thành sơn cốc có mái: thác nước nhỏ, cây cổ thụ, mây lành vờn, nắng vàng rọi qua giếng trời lớn. |

## Prompt gợi ý

Giữ nguyên phần **[CHUNG]** ở cả năm lần chạy, chỉ đổi phần riêng.

```
[CHUNG]
Chinese xianxia cultivator's cave dwelling interior, EMPTY room with no
furniture and no characters, wide establishing shot, eye-level camera,
horizontal 16:9, stone floor at lower third, painterly semi-realistic game
background art, dark moody palette with teal and gold rim light, volumetric
light shafts, subtle floating dust motes, high detail, no text, no watermark
```

- Tấm 1: `+ narrow rough rock hollow, low ceiling, cramped, single crack of daylight, damp stone`
- Tấm 2: `+ widened carved chamber, smoothed walls, carved stone doorway, shallow steps, faint qi glow`
- Tấm 3: `+ tall chamber, glowing cyan spirit vein running through the wall, luminescent moss, shallow water channel`
- Tấm 4: `+ vast hall, carved dragon pillars, open skylight oculus showing clouds, polished jade floor`
- Tấm 5: `+ hidden valley grotto, small waterfall, ancient pine, auspicious clouds, warm golden sunbeam through a large opening, lotus pond`

## Kiểm tra trước khi chốt

Xếp năm tấm cạnh nhau. Nếu che hết chữ đi mà vẫn xếp được đúng thứ tự từ chật
tới rộng, là đạt. Nếu không, thường do góc máy lệch nhau.
