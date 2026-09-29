# Kế hoạch hình ảnh, video và âm thanh

Mục tiêu là làm thế giới sống hơn ở đúng khoảnh khắc người dùng hành động. Không
phát video liên tục ở Sơn Môn: màn này mở nhiều nhất, video nền sẽ tốn pin, dữ
liệu và làm chữ khó đọc.

## Ưu tiên 1 — âm thanh thao tác

Định dạng: MP3 hoặc OGG, 44.1/48 kHz, không nén quá gắt, không có khoảng lặng ở
đầu. Mức âm lượng giữa các file cần đồng đều.

| File | Độ dài | Dùng khi |
| --- | ---: | --- |
| `media/sfx/xong-viec.mp3` | 0.4–0.8 giây | Hoàn thành nhiệm vụ; tiếng khánh trong, nghe nhiều không mệt |
| `media/sfx/bat-dau-be-quan.mp3` | khoảng 0.5 giây | Bắt đầu tập trung; tiếng mõ hoặc chuông trầm rất ngắn |
| `media/sfx/het-gio.mp3` | 0.8–1.2 giây | Kết thúc phiên; rõ nhưng không giật mình |
| `media/sfx/mo-hom.mp3` | 0.6–1 giây | Mở hòm; tiếng nắp gỗ và kim loại nhỏ |
| `media/sfx/thu-hoach.mp3` | khoảng 0.5 giây | Hái linh thảo |
| `media/sfx/len-tang.mp3` | 1–1.5 giây | Tăng tầng cảnh giới |
| `media/sfx/do-kiep.mp3` | 1.5–2 giây | Qua cảnh giới; sấm xa rồi chuông lớn |
| `media/sfx/that-bai.mp3` | khoảng 0.8 giây | Thất bại; trầm, không mang cảm giác trừng phạt |

## Ưu tiên 2 — hai vòng âm thanh môi trường

Mỗi vòng 60–120 giây, loop kín, không giọng nói, mức âm lượng thấp:

- `media/nhac/son-mon.mp3`: gió núi, sáo trúc thưa, chuông rất xa.
- `media/nhac/dong-phu.mp3`: nước nhỏ, lửa lò nhẹ, không gian hang đá.

Nhạc phải mặc định tắt hoặc tuân theo lựa chọn âm thanh hiện có. Không tự phát
trước thao tác đầu tiên của người dùng.

## Ưu tiên 3 — hình nhân vật và trạng thái

PNG/WebP nền trong suốt, cạnh dài 768–1024 px, cùng góc nhìn và nguồn sáng:

- Đạo nhân: `lam-viec`, `be-quan`, `mung`, `met`, `dot-pha`.
- Mỗi cao nhân: chân dung hiện có + một bản bán thân để dùng cho đối thoại.
- Linh thú: `idle`, `vui`, `ngu`, để phản ứng theo chuỗi ngày và phiên tập trung.

Không cần thêm nhiều cảnh nền. Mười cảnh giới, năm phòng và các tranh khu vực
hiện đã đủ; cần biến thể nhân vật để cảnh hiện có có cảm giác đang sống.

## Ưu tiên 4 — video hiếm, chỉ dùng ở mốc lớn

MP4 H.264 và WebM dự phòng, 720p, 24/30 fps, 3–6 giây, không chữ nung vào video,
không âm thanh bắt buộc:

- Mở hòm Kim.
- Linh thú xuất hiện lần đầu.
- Nâng cấp Động Phủ.
- Hoàn thành chuỗi 7/30 ngày.

Video phải có ảnh poster tương ứng để dùng khi tiết kiệm dữ liệu, giảm chuyển
động hoặc video tải lỗi.

## Tài liệu cần từ chủ project

- 3–5 ảnh tham chiếu cho phong cách nhân vật, màu, nét vẽ và mức độ chibi.
- Chọn một gương mặt/giới tính/trang phục chuẩn cho đạo nhân chính.
- Xác nhận tông âm thanh: tĩnh thiền, tiên hiệp hùng tráng, hoặc pha cả hai.
- File nguồn hoặc giấy phép của `ambient.mp3`; đây là tài nguyên duy nhất README
  hiện ghi là đồ mượn.
- Logo và tên thương hiệu chính thức nếu định phát hành công khai.
