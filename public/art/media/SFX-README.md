# Âm thanh — thứ còn thiếu nhiều nhất

Đây là khoảng trống lớn nhất giữa app này và một cái game. Hiện tại **không có
một tệp âm thanh hiệu ứng nào**: mọi tiếng đều do `lib/celebrate.ts` tự sinh
bằng dao động hình sin — tức là mấy tiếng "bíp" thuần, đúng kiểu đồng hồ báo
thức. Tick xong một việc mà nghe tiếng bíp thì cảm giác là vừa điền xong một ô
biểu mẫu, không phải vừa hành công.

Nhạc nền thiền (`ambient.mp3`) thì đã có và đang dùng ở Bế Quan.

## Quy cách

- **MP3, 128 kbps mono** là đủ. Mỗi tệp **dưới 80 KB**; tệp dài hơn 2 giây
  thường là dấu hiệu hiệu ứng bị lê thê.
- **Chuẩn hoá về −16 LUFS**, đỉnh không quá −1 dBFS. Không nén quá tay: các
  tiếng này phát chồng lên nhạc nền.
- **Cắt sạch khoảng lặng đầu tệp.** Trễ 100 ms là đủ để tay cảm thấy nút bị
  "đơ".
- Màu âm: nhạc cụ Á Đông — khánh, chuông đồng, mõ, đàn tranh, trống cơm. Tránh
  tiếng tổng hợp kiểu khoa học viễn tưởng.

## Đợt 1 — cần trước (6 tệp)

| File | Dài | Lúc nào kêu | Cảm giác cần có |
| --- | --- | --- | --- |
| `sfx/xong-viec.mp3` | 0,4–0,8 s | Tick xong một nhiệm vụ | Một tiếng khánh trong, ngân ngắn. Đây là tiếng nghe nhiều nhất trong ngày nên phải **dễ chịu khi nghe hai mươi lần**, không được chói. |
| `sfx/cham-nut.mp3` | 0,1–0,2 s | Bấm nút chính | Rất khẽ, gần như tiếng gõ mõ nhỏ. Nghe thấy thì được, để ý thấy thì hỏng. |
| `sfx/len-tang.mp3` | 1,0–1,5 s | Lên một tầng cảnh giới | Chuông đồng, có tiếng ngân dâng lên. |
| `sfx/do-kiep.mp3` | 1,5–2,0 s | Vượt cảnh giới | Sấm xa, rồi chuông lớn. Dày, nặng. |
| `sfx/mo-hom.mp3` | 0,6–1,0 s | Mở hòm kỳ ngộ | Tiếng gỗ bật nắp, rồi leng keng kim loại. |
| `sfx/vien-man.mp3` | 1,0–1,5 s | Xong hết việc trong ngày | Một câu đàn tranh ngắn, sáng và ấm. |

## Đợt 2 — thêm cho đầy

| File | Dài | Lúc nào kêu |
| --- | --- | --- |
| `sfx/bat-dau-be-quan.mp3` | 0,5 s | Bắt đầu phiên nhập định |
| `sfx/het-gio.mp3` | 1,0 s | Hết phiên nhập định |
| `sfx/thu-hoach.mp3` | 0,5 s | Hái linh thảo |
| `sfx/luyen-dan.mp3` | 1,0 s | Ra lò một viên đan |
| `sfx/trieu-hoi.mp3` | 1,2 s | Thu phục linh thú |
| `sfx/that-bai.mp3` | 0,8 s | Độ kiếp thất bại (trầm, hụt hơi — đừng làm nó nghe như trừng phạt) |

## Nhạc nền theo nơi chốn (tuỳ chọn, mỗi tệp 60–90 s, lặp liền mạch)

| File | Nơi |
| --- | --- |
| `nhac/son-mon.mp3` | Sảnh chính — sáo trúc thưa, gió, chuông xa |
| `nhac/dong-phu.mp3` | Động phủ — nước nhỏ giọt, trầm ấm, rất tĩnh |

Nhạc nền phải **lặp không nghe thấy mối nối**: cắt đúng ở điểm sóng cắt trục,
và đuôi tệp phải khớp với đầu tệp.

## Ghi chú

Trong Cài đặt đã có sẵn hai công tắc riêng cho âm thanh và nhạc nền, và cả hai
mặc định tôn trọng lựa chọn của người dùng — nên cứ làm cho hay, ai không thích
thì tắt được.
