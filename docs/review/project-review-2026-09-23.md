# Đánh giá Đạo Trình — 23/09/2026

## Kết luận

Web đã có đủ chất liệu tu tiên: cảnh giới, Three.js, linh căn, linh thú, đan dược, linh điền và thám hiểm. Điểm yếu chính là công việc đời thực chưa được đặt ở trung tâm và một số luật thưởng chưa khuyến khích đúng hành vi. Thêm ảnh giúp không gian sống động hơn, nhưng không thay thế việc nối rõ **việc cần làm → tập trung → thành quả → tiến triển trong tiên giới**.

Đợt này đã cải thiện luồng đó và sửa các lỗi xác định được. Chưa thay luật kinh tế vì cần đối chiếu API và bảo toàn tiến trình đã kiếm được.

## Đã làm

- Sảnh chính có việc tiếp theo của chính người dùng, mục tiêu liên quan, thời lượng dự kiến và tu vi gốc. Có thể tập trung hoặc đánh dấu hoàn thành ngay.
- Phiên bế quan đang chạy/tạm dừng xuất hiện ở sảnh để quay lại. Hoàn thành nhiệm vụ trong Bế Quan kết thúc phiên và ghi số phút trọn đã tập trung.
- Khi hết việc đến hạn và đã hoàn thành việc hôm nay, hiển thị thành quả cùng lời nhắc nghỉ ngơi, thay vì liên tục thúc tạo thêm việc.
- Người mới bắt đầu trống. Không tự thay hồ sơ trống nhiệm vụ nhưng có lịch sử tập trung bằng dữ liệu mẫu. Mẫu vẫn có thể nạp chủ động trong Cài đặt.
- Ba điểm đến có ảnh riêng và thông tin thực: việc đang chờ, số việc còn lại của chuyến thám hiểm, số phút để linh thảo chín.
- Tạo ba ảnh mới: Tàng Thư Các, cổng Bí Cảnh và bầu trời Phi Thăng. Phi Thăng không còn dùng nhầm cảnh giông Độ Kiếp. Giữ các tài nguyên gốc.
- Giữ nền Three.js hoạt động. Sửa các mảng sáng chữ nhật do backdrop blur lồng nhau trên canvas; tăng khả năng nhìn cảnh và giữ chibi trên điện thoại.
- Sửa cuộn sảnh trên màn hình thấp, điều hướng ẩn nhận focus trên mobile và cuộn đến khu vực tải chậm.
- Chặn ghi hoàn thành lặp cho cùng trạng thái; sửa quy đổi ngày hoàn thành về ngày địa phương cho chuỗi ngày và nhiệm vụ tu tiên.
- Sửa kiểm tra bản lưu: `stonesBonus` âm là hợp lệ khi thám hiểm có mất mát, không được xem là dữ liệu hỏng.
- Hòm khi xem ngày khác chuyển sang trạng thái lịch sử, không gọi nhầm thao tác mở hòm hôm nay.
- Thao tác dọn việc đã xong có xác nhận mô tả rõ ảnh hưởng tới tu vi, linh thạch và chuỗi ngày.
- Ảnh dự phòng hỏng không lặp lỗi hoặc để biểu tượng ảnh vỡ. Thêm công cụ kiểm tra toàn bộ ảnh.

## Kiểm chứng

| Phạm vi | Kết quả |
|---|---|
| Web Vitest | 217 test, 13 tệp, đạt |
| TypeScript và build production | Đạt; chunk Three.js khoảng 574 kB chưa gzip vẫn phát cảnh báo kích thước |
| Lint | 0 lỗi, 13 cảnh báo; gồm dependencies của hook đồng bộ, effect/ref và Fast Refresh |
| Tài nguyên ảnh | 123 ảnh giải mã được; không thiếu tham chiếu literal `/art/` trong mã nguồn |
| Trình duyệt Chromium | Mở 8 màn hình chính: không lỗi JavaScript, HTTP lỗi hoặc ảnh vỡ trong lượt kiểm tra |
| Hành trình thực | Tạo việc → bắt đầu tập trung → đóng/mở panel → phiên tiếp tục → hoàn thành → xem thành quả: đạt |
| Giao diện | Kiểm tra sáng/tối desktop, mobile 390 × 844; không tràn ngang trong lượt kiểm tra |
| Flutter | `flutter analyze`: không vấn đề; 53 test đạt |

Kiểm tra trình duyệt dùng Playwright độc lập ngoài repo với hồ sơ thử nghiệm mới. Không kiểm tra hiệu năng GPU trên điện thoại thật, mọi trình duyệt, backend production hoặc giao diện Flutter trên thiết bị. Flutter được đọc mã và chạy bộ kiểm tra, chưa chỉnh mã trong đợt này.

Ảnh chụp sau sửa: [desktop](desktop.webp), [giao diện sáng](light.webp), [mobile](mobile.webp).

## Các điểm còn chưa hợp lý, theo ưu tiên

### 1. Luật thưởng cần dựa vào công sức, tránh thưởng cho thao tác

`src/lib/economy.ts` thưởng linh thạch theo số phiên: 25 phiên một phút có phần thưởng cơ bản 50 linh thạch, trong khi một phiên 25 phút chỉ có 2. Kỳ ngộ cũng được xét theo lần ghi phiên. Đề xuất thưởng theo tổng phút và mốc công sức, có giới hạn/mốc rõ ràng; chuyển đổi phải giữ nguyên phần đã kiếm được. Cần đối chiếu `my-task-api` trước khi sửa.

Tu vi nhiệm vụ đang phụ thuộc mức ưu tiên. Việc nâng ưu tiên không đồng nghĩa bỏ thêm công sức. Nên để ưu tiên quyết định thứ tự làm, còn thưởng phản ánh hoàn thành và thời gian đã thực sự tập trung. Không tự đổi tỷ giá trong đợt này.

Một số tông khoá yêu cầu việc khẩn/hạn chót dù người dùng không có nhu cầu đó, dễ khiến họ tạo việc gấp giả. Nên chọn thử thách phù hợp với kế hoạch thật và cho phép thay thế khi không phù hợp.

### 2. Thành quả lâu dài cần tách khỏi danh sách đang hiển thị

Tu vi/linh thạch đang được suy ra lại từ nhiệm vụ hiện có và các hệ số hiện tại. Dọn lịch sử có thể làm giảm tiến trình. Đợt này bổ sung xác nhận đúng sự thật; giải pháp bền vững là lưu trữ nhiệm vụ và sổ thành quả bất biến, có migration cùng API.

Hòm ngày dùng ngày lên kế hoạch, trong khi chuỗi ngày/tông khoá dùng ngày thực sự hoàn thành. Việc quá hạn hoàn thành hôm nay có thể không đóng góp như người dùng mong đợi cho hòm hôm nay. Cần thống nhất ngữ nghĩa ngày hoạt động giữa client và server.

Kết quả thám hiểm có thể trừ tu vi. Về sản phẩm, nên giới hạn rủi ro trong tài nguyên chuyến đi; không để một lần ngẫu nhiên xoá cảm giác tiến bộ từ công việc đời thực.

### 3. Khôi phục phiên và đồng bộ

Đồng hồ web sống qua chuyển màn hình, nhưng tải lại trang vẫn mất phiên chưa lưu. Cần lưu trạng thái phiên, khôi phục theo timestamp và chống ghi trùng khi mở nhiều tab.

Hàng đợi đồng bộ API hiện ở bộ nhớ, có nguy cơ mất thao tác đang chờ khi reload lúc offline. Chưa có source API trong phạm vi thư mục đã xem để kiểm chứng đầy đủ giao dịch, xác thực và luật thưởng phía server.

### 4. Flutter đang khác web

Schema không còn tương đương: định dạng ngày, giá trị null, tên settings và các trường kinh tế khác nhau. Không nên quảng bá nhập chéo JSON trước khi có migration có phiên bản.

Khởi tạo Flutter vẫn có thể nạp mẫu khi không có nhiệm vụ/mục tiêu dù đã có phiên tập trung. Lỗi đọc lưu trữ trả về null có nguy cơ khiến dữ liệu mẫu thay dữ liệu lỗi. Đồng hồ dùng nhịp Timer thay vì deadline nên cần kiểm chứng khi app chạy nền. HomeShell dùng IndexedStack, vì vậy không kết luận việc đổi tab tự huỷ phiên.

### 5. Nội dung và trình bày

Nên giải thích tên tu tiên bằng hành động đời thường tại điểm sử dụng: “Bế Quan — tập trung vào việc này”, “Linh điền — lớn lên nhờ phút tập trung”. Đợt này đã bắt đầu ở sảnh và thẻ điểm đến; các bảng kinh tế sâu còn cần tiếp tục giản lược.

Mobile có nhiều lối vào game ở phần trên. Lượt sửa này đảm bảo cuộn và thực hiện được việc chính; bước tiếp theo nên đo thao tác thực tế để quyết định rút gọn điều hướng. Không nên thêm nhiều popup thưởng làm gián đoạn phiên tập trung.

## Tài nguyên bổ sung

Đã tạo ba WebP tại `public/art/world/`: `daily-pavilion-v1.webp`, `expedition-gate-v1.webp`, `ascension-sky-v1.webp`. Prompt và cách tạo nằm trong [asset-prompts.md](asset-prompts.md). Bản PNG nguồn nằm ở `art-src/world/` trên máy; thư mục này bị Git ignore nên cần sao lưu riêng nếu muốn giữ master.

Hiện có 123 ảnh và 6 tệp media, mỗi nhóm khoảng 10 MB. Chưa cần thêm video để giải quyết trải nghiệm hiện tại.

Nếu cung cấp thêm, hữu ích nhất là:

1. Đường dẫn source `my-task-api` để sửa luật thưởng và đồng bộ đúng cả hai phía.
2. Nhạc nền có quyền sử dụng, loop 2–3 phút, đàn tranh/sáo/thiên nhiên, không lời; mức âm nhẹ để không cản tập trung.
3. Nếu muốn nhân vật 3D thực sự: model GLB có animation đứng, thiền và đột phá. Ảnh AI không thay thế model có rig; model là bổ sung cho cảnh Three.js đang có.

Không xoá tài nguyên gốc, không tắt Three.js và chưa triển khai lên môi trường công khai trong đợt này.
