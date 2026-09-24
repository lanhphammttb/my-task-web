# Rà soát điều hướng và luồng sử dụng — 23/09/2026

## Cấu trúc hiện tại

Mỗi khu có một lối vào trong hệ điều hướng chính. Sảnh giữ bố cục tu tiên gốc: lời tiền bối và chân dung ở đầu, nhân vật cùng vòng tu vi ở giữa cảnh, chỉ số gọn và một thẻ việc tiếp theo ở dưới. Đã bỏ bố cục hai khối công việc/cảnh giới mới thêm vì không phù hợp hướng giao diện người dùng mong muốn. Không còn dãy thẻ Hành Sự Đường / Bí Cảnh / Động Phủ lặp lại menu.

| Mục chính | Nội dung bên trong |
|---|---|
| Sơn Môn | Lời và chân dung tiền bối, nhân vật, vòng tu vi, chỉ số gọn và việc tiếp theo |
| Hành Sự | Lịch ngày/tuần/tháng, nhiệm vụ, hòm và nhật khoá tông môn |
| Bế Quan | Chọn nhiệm vụ, tập trung, tạm dừng, nghỉ và ghi nhận thời gian |
| Đại Nguyện | Mục tiêu dài hạn và nhiệm vụ liên quan |
| Tiên giới → Động Phủ | Linh thạch, Linh căn, Công pháp, Linh điền, Đan đường, Tẩy tuỷ, Nâng cấp nơi ở, Linh thú |
| Tiên giới → Tiên Lộ | Cảnh giới, Thành tựu, Tông môn, Thám hiểm |
| Tiên giới → Tu Hành Lục | Thống kê công việc và thời gian tập trung |

Linh căn, Linh thú và Đan đường là mục con trong Động Phủ, không còn được đặt ngang hàng với Động Phủ. Mục lục trong từng khu mở đúng phần đang gập rồi cuộn tới nội dung. Tẩy tuỷ chỉ xuất hiện khi đã có linh căn. Mục nâng cấp mang tên “Nâng cấp nơi ở”, tránh hiểu nhầm thành một Động Phủ khác.

“Thành tựu” chỉ các huy hiệu mở theo tiến độ. “Kỳ ngộ” chỉ các sự kiện gặp trong quá trình tu luyện. Không còn dùng cùng một tên cho hai chức năng này trong Tiên Lộ.

Các thao tác theo tình trạng thực vẫn nằm ở sảnh: bắt đầu việc được gợi ý, trở lại phiên đang chạy, khai quang và độ kiếp. Việc quá hạn vẫn được xử lý trong Hành Sự. Các nút chỉ mở một trang chung và dãy thẻ điều hướng lặp đã được bỏ.

Tài nguyên hiện có gồm 13 chân dung tiền bối, nền các cảnh giới, chibi, linh thú, video bế quan/đột phá/độ kiếp/phi thăng và nhạc nền. Đợt phục hồi sảnh dùng lại những tài nguyên này; chưa cần tạo thêm asset.

## Các sửa đổi hành vi đã kiểm tra

- Một menu Bế Quan; một menu Động Phủ; các mục con nằm trong đúng khu.
- Menu Tiên giới dùng được từ mọi bảng; Escape đóng lớp đang tương tác trước.
- Tìm kiếm mở được bằng phím `/`, có nhãn trợ năng, đóng tra cứu xoá bộ lọc và không đánh dấu sai trang hiện tại.
- Phiên tập trung tồn tại khi chuyển bảng; phiên tạm dừng ngay lập tức vẫn được nhận diện và không cho đổi nhiệm vụ.
- Chuyển sang nghỉ ghi số phút trọn đã làm, không cộng thời gian tạm dừng và không ghi lặp.
- Đổi cài đặt cập nhật thời lượng của đồng hồ chưa bắt đầu, giữ thời lượng phiên đang diễn ra.
- Tạo việc từ sảnh hoặc Bế Quan dùng ngày hôm nay. Trạng thái trống trong Bế Quan cho phép thêm việc.
- HUD và bố cục có quy tắc riêng cho màn hình hẹp; CSS giao diện đặt trong `src/components/hub/hub.css`.

## Kiểm chứng và giới hạn

- Vitest: **227/227 test đạt, 13 tệp**. Có kiểm tra số lối vào chính, phân cấp menu, mục lục dẫn tới nội dung tồn tại và mở phần đang gập.
- TypeScript và build production: đạt. Chunk ứng dụng khoảng 501 kB; Three.js khoảng 574 kB trước gzip.
- Lint: không lỗi, 13 cảnh báo hiện có.
- `git diff --check`: đạt.
- Audit trước đó: 124 ảnh giải mã được, không thiếu tham chiếu ảnh cố định. Đợt sửa phân cấp không thêm ảnh.
- Browser runtime không có trình duyệt khả dụng trong phiên: chưa có xác nhận trực quan hoặc ảnh chụp mới. Kiểm tra DOM không xác nhận được bố cục, GPU và media trên thiết bị thật.
- Chưa triển khai production hoặc xác minh backend production.
