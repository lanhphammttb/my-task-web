# Khung và hoạ tiết viền

Mọi khung trong app hiện đều là `border: 1px solid` cộng bo góc. Sạch sẽ, nhưng
đó là ngôn ngữ của giao diện web. Trong game, cái khung là một **món đồ được
chạm khắc** — và người ta nhận ra "đây là bảng nhiệm vụ" trước khi kịp đọc chữ.

Thiếu tệp nào thì chỗ đó vẫn dùng viền CSS như cũ, không vỡ gì.

## Quy cách

- **PNG nền trong suốt.** Thả vào thư mục này rồi `npm run art -- khung`.
- Hoạ tiết nằm **sát mép tệp**, không chừa lề thừa — app ghép chúng vào đúng
  cạnh của bảng.
- Tông đồng/vàng cũ trên nền tối, hợp với `--gold` đang dùng.
- Không vẽ nền, không đổ bóng ra ngoài (app tự phủ bóng).

## Danh sách

| File | Kích thước | Dùng ở đâu |
| --- | --- | --- |
| `dau-bang.png` | 1024×96 | Dải trên của bảng nhiệm vụ: hoa văn mây đối xứng, giữa chừa trống cho chữ "NHẬT KHOÁ" |
| `goc.png` | 256×256 | Hoa văn góc, app lật gương ra đủ bốn góc |
| `chia.png` | 512×24 | Đường kẻ ngăn giữa hai phần — một nét mảnh có nút thắt ở giữa |
| `vien-doc.png` | 24×512 | Cạnh trái/phải, lặp theo chiều dọc |
| `nhan-tron.png` | 256×256 | Vòng tròn khắc, dùng làm nền cho các nút tròn ở dãy bên phải |

## Prompt gợi ý

```
[CHUNG]
ancient Chinese carved ornament, aged bronze and gold on transparent
background, symmetrical, flat front view, game UI frame asset, clean edges
touching the frame border, no background, no text, no drop shadow
```

- `dau-bang`: `+ long horizontal header ornament, cloud scroll pattern, mirrored from center, empty space in the middle`
- `goc`: `+ single corner ornament, cloud and ruyi motif, fits a right angle`
- `chia`: `+ thin horizontal divider line with a small knot at the center`
- `vien-doc`: `+ narrow vertical border strip, repeating bamboo-joint pattern, seamlessly tileable top to bottom`
- `nhan-tron`: `+ circular engraved rim, lotus petal border, hollow center`

## Kiểm tra trước khi chốt

Đặt `vien-doc.png` nối tiếp chính nó theo chiều dọc: mối nối phải không nhìn ra
được. `dau-bang.png` phải đối xứng qua trục giữa, vì app sẽ kéo giãn nó theo
chiều ngang.
