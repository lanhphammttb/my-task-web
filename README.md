# Kế Hoạch — Web (React + TypeScript)

Ứng dụng web lập kế hoạch theo ngày / tuần / tháng, thiết kế để **thúc đẩy hoàn thành**
nhiệm vụ đúng deadline chứ không chỉ để ghi chép.

## Chạy dự án

```bash
npm install
npm run dev        # http://localhost:5173
```

| Lệnh | Việc nó làm |
|---|---|
| `npm run dev` | Chạy server phát triển với hot reload |
| `npm run build` | Kiểm tra TypeScript rồi build vào `dist/` |
| `npm run preview` | Xem thử bản build production |
| `npm test` | Chạy toàn bộ test (Vitest + jsdom) |
| `npm run test:watch` | Test ở chế độ theo dõi |
| `npm run lint` | Chạy oxlint |

Không cần backend, không cần biến môi trường. Dữ liệu nằm trong `localStorage` của trình duyệt.

## Các màn hình

| Màn hình | Nội dung |
|---|---|
| **Hôm nay** | Vòng tiến độ, 3 chỉ số ngày, lời nhắc theo tiến độ, khu vực quá hạn, "3 việc quan trọng nhất", danh sách việc chia theo trạng thái |
| **Tuần** | 7 cột kế hoạch, **kéo thả** thẻ giữa các ngày, thêm việc trực tiếp trong cột, thanh tiến độ mỗi ngày |
| **Tháng** | Lịch tháng với chấm màu theo mức ưu tiên, thanh hoàn thành mỗi ngày, bảng chi tiết ngày đang chọn |
| **Mục tiêu** | Thẻ mục tiêu với tiến độ %, ngày đích và đếm ngược, danh sách nhiệm vụ thuộc mục tiêu |
| **Tập trung** | Pomodoro có thể gắn vào một nhiệm vụ; hết phiên tự ghi nhận số phút và chuyển sang nghỉ |
| **Thống kê** | Tỷ lệ hoàn thành, chuỗi ngày, biểu đồ cột theo ngày, phân tích theo ưu tiên / thứ / mục tiêu / nhãn |

## Cú pháp thêm nhanh

Nhập một dòng vào ô "Thêm nhanh nhiệm vụ":

```
Viết báo cáo quý 3 !cao @09:00 ~90 #công-việc #gấp
```

| Cú pháp | Ý nghĩa | Giá trị nhận |
|---|---|---|
| `!khan` `!cao` `!tb` `!thap` | Mức ưu tiên | cũng nhận `!1`…`!4`, `!urgent`, `!high`, `!medium`, `!low` |
| `@09:00` | Giờ bắt đầu | `@9:00` cũng được, tự đệm thành `09:00` |
| `~90` | Thời lượng dự kiến (phút) | `~90p`, `~90m` đều được |
| `#nhãn` | Gắn nhãn | lặp lại được nhiều lần |

Phần còn lại của câu trở thành tên nhiệm vụ. Ký tự `!` không khớp từ khoá nào sẽ được giữ nguyên.

## Phím tắt

| Phím | Hành động |
|---|---|
| `N` | Mở hộp thoại nhiệm vụ mới |
| `1`–`6` | Chuyển giữa 6 màn hình |
| `/` | Nhảy vào ô tìm kiếm |
| `T` | Về ngày hôm nay |
| `Esc` | Đóng hộp thoại đang mở |

## Cấu trúc mã nguồn

```
src/
├─ types.ts                 Kiểu dữ liệu + metadata ưu tiên/trạng thái/chu kỳ lặp
├─ store/AppStore.tsx       Context + toàn bộ hành động, tự lưu xuống localStorage
├─ lib/
│  ├─ date.ts               Định dạng ngày tiếng Việt, lưới tuần/tháng, đếm ngược
│  ├─ stats.ts              Thống kê ngày, chuỗi ngày, XP/cấp độ, sắp xếp nhiệm vụ
│  ├─ storage.ts            Đọc/ghi localStorage, xuất/nhập tệp JSON
│  ├─ motivation.ts         Câu nói theo ngày + lời nhắc theo tiến độ
│  └─ seed.ts               Dữ liệu mẫu cho lần chạy đầu
├─ components/              ProgressRing, TaskItem, TaskEditor, QuickAdd, Modal, Sidebar, SettingsModal
├─ views/                   TodayView, WeekView, MonthView, GoalsView, FocusView, StatsView
├─ index.css                Toàn bộ CSS, có token cho hai chế độ sáng/tối
└─ __tests__/               Test logic thuần + test tích hợp giao diện
```

## Ghi chú kỹ thuật

- **Không thư viện UI ngoài.** Toàn bộ giao diện, biểu đồ và vòng tiến độ viết bằng CSS/SVG thuần;
  phụ thuộc runtime duy nhất ngoài React là `date-fns`.
- **Nhiệm vụ lặp lại** không sinh trước hàng loạt. Khi bạn hoàn thành một lần, lần kế tiếp mới
  được tạo — tránh làm phình dữ liệu và tránh danh sách tương lai đầy việc chưa cần nghĩ tới.
- **Chuỗi ngày** vẫn được giữ nếu hôm nay chưa xong việc (vì ngày chưa kết thúc); chỉ đứt khi
  cả một ngày trọn vẹn không hoàn thành gì.
- **`src/test-setup.ts`** cấp một `Storage` trong bộ nhớ cho test, vì Node 25 gắn sẵn một
  `localStorage` thử nghiệm rỗng che mất bản của jsdom.
- Dữ liệu chỉ nằm trong trình duyệt. Xoá dữ liệu site là mất sạch — dùng
  Cài đặt → "Xuất tệp JSON" để sao lưu định kỳ.
# my-task-web
# my-task-web
