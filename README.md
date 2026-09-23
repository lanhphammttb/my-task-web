# Đạo Trình — Web (React + TypeScript + shadcn/ui)

Ứng dụng web lập kế hoạch theo ngày / tuần / tháng, gắn với **hệ thống tu tiên** để việc hoàn
thành nhiệm vụ trở thành tiến trình từ Luyện Khí lên Phi Thăng.

## Chạy dự án

```bash
nvm use           # Node 22.21.1 (xem .nvmrc)
npm install
npm run dev        # http://localhost:5173
```

| Lệnh | Việc nó làm |
|---|---|
| `npm run dev` | Server phát triển, hot reload |
| `npm run build` | Kiểm tra TypeScript rồi build vào `dist/` |
| `npm run preview` | Xem thử bản build production |
| `npm test` | Chạy bộ test (Vitest + jsdom) |
| `npm run test:watch` | Test ở chế độ theo dõi |
| `npm run lint` | Chạy oxlint |

Không cần backend, không cần biến môi trường. Dữ liệu nằm trong `localStorage` của trình duyệt.

## Công nghệ giao diện

| Thành phần | Lựa chọn |
|---|---|
| CSS | Tailwind CSS v4 (`@tailwindcss/vite`) |
| Bộ component | shadcn/ui (style `radix-nova`, base Radix UI) |
| Biểu tượng | lucide-react — **không dùng emoji làm icon** |
| Chữ tiêu đề | Noto Serif (`@fontsource/noto-serif`, subset tiếng Việt) |
| Hoạt ảnh | `motion` (Framer Motion) + keyframes CSS |
| Hiệu ứng ăn mừng | `canvas-confetti` + WebAudio (không cần tệp âm thanh) |
| Chữ | Geist Variable |

Theme dùng token của shadcn (`--background`, `--card`, `--primary`…) cộng thêm token riêng của app
(`--jade`, `--gold`, `--cinnabar`, `--seal`, `--ink-line`, `--p-urgent`…). Đổi sáng/tối bằng class
`dark` trên `<html>` — thẻ `<html>` đặt sẵn `class="dark"` để không loé sáng trước khi React chạy.

Hoa văn nằm trong `@layer components` của [`src/index.css`](src/index.css): `.mist-layer` (mây khói),
`.paper-grain` (hạt giấy), `.seal` (ấn triện chu sa), `.corner-marks` (khung ngọc), `.rule-gold`
(đường kẻ vàng). Nền mây núi do [`InkBackdrop`](src/components/InkBackdrop.tsx) vẽ bằng SVG nội tuyến.

## Các màn hình

| Màn hình | Nội dung |
|---|---|
| **Hôm nay** | Vòng tiến độ nhật khoá, 3 chỉ số ngày, lời nhắc theo tiến độ, khu **tâm ma** (việc quá hạn), "3 việc quan trọng nhất", danh sách chia theo trạng thái |
| **Tuần** | 7 cột kế hoạch, **kéo thả** thẻ giữa các ngày, thêm việc ngay trong cột |
| **Tháng** | Lịch tháng với chấm màu theo ưu tiên, thanh hoàn thành mỗi ngày, bảng chi tiết ngày đang chọn |
| **Mục tiêu** | Thẻ mục tiêu với tiến độ %, ngày đích và đếm ngược |
| **Bế quan** | Pomodoro gắn vào một nhiệm vụ; hết phiên tự ghi nhận số phút thành tu vi |
| **Tiên Lộ** | Thẻ cảnh giới, bậc thang 10 cảnh giới, tiến độ phi thăng, 16 kỳ ngộ |
| **Thống kê** | Tỷ lệ hoàn thành, chuỗi ngày, biểu đồ cột, phân tích theo ưu tiên / thứ / mục tiêu / nhãn |

## Hệ thống tu tiên

Xem bảng cảnh giới đầy đủ ở [README gốc](../README.md). Phần logic nằm gọn trong
[`src/lib/cultivation.ts`](src/lib/cultivation.ts):

```ts
cultivationOf(xp)   // -> { realm, tier, into, need, ratio, toNext, atPeak, ascended, nextLabel }
realmLadder(xp)     // -> trạng thái done/current/locked của cả 10 cảnh giới
ascensionRatio(xp)  // -> tiến độ toàn đạo lộ, 0..1
```

Tu vi được tính trong `src/lib/stats.ts`: `10 × trọng số ưu tiên` cho mỗi nhiệm vụ xong
(Khẩn cấp ×4, Cao ×3, Trung bình ×2, Thấp ×1) cộng `1 tu vi / 5 phút` nhập định.

## Cú pháp thêm nhanh

```
Viết báo cáo quý 3 !cao @09:00 ~90 #công-việc #gấp
```

| Cú pháp | Ý nghĩa | Giá trị nhận |
|---|---|---|
| `!khan` `!cao` `!tb` `!thap` | Mức ưu tiên | cũng nhận `!1`…`!4`, `!urgent`, `!high`, `!medium`, `!low` |
| `@09:00` | Giờ bắt đầu | `@9:00` cũng được, tự đệm thành `09:00` |
| `~90` | Thời lượng dự kiến (phút) | `~90p`, `~90m` đều được |
| `#nhãn` | Gắn nhãn | lặp lại được nhiều lần |

Ký tự `!` không khớp từ khoá nào sẽ được giữ nguyên trong tên nhiệm vụ.

## Phím tắt

| Phím | Hành động |
|---|---|
| `N` | Nhiệm vụ mới |
| `1`–`7` | Chuyển giữa 7 màn hình |
| `/` | Nhảy vào ô tìm kiếm |
| `T` | Về hôm nay |
| `Esc` | Đóng hộp thoại |

## Cấu trúc mã nguồn

```
src/
├─ types.ts                  Kiểu dữ liệu + metadata ưu tiên/trạng thái/chu kỳ lặp
├─ store/AppStore.tsx        Context + hành động + phát hiện mốc ăn mừng, tự lưu localStorage
├─ lib/
│  ├─ cultivation.ts         Bậc thang cảnh giới, tính cảnh giới/tầng từ tu vi
│  ├─ achievements.ts        16 kỳ ngộ và cách đo tiến độ
│  ├─ celebrate.ts           Confetti + âm thanh WebAudio
│  ├─ stats.ts               Thống kê ngày, chuỗi ngày, tu vi, sắp xếp nhiệm vụ
│  ├─ date.ts                Định dạng ngày tiếng Việt, lưới tuần/tháng, đếm ngược
│  ├─ ui.ts                  Bảng màu/icon cho ưu tiên, trạng thái, chu kỳ lặp
│  ├─ storage.ts             Đọc/ghi localStorage, xuất/nhập tệp JSON
│  ├─ motivation.ts          Câu nói theo ngày + lời nhắc theo tiến độ
│  └─ seed.ts                Dữ liệu mẫu cho lần chạy đầu
├─ components/
│  ├─ ui/                    Component shadcn (do CLI sinh, có thể sửa tự do)
│  ├─ AppSidebar.tsx         Điều hướng + thẻ cảnh giới + chuỗi tu luyện
│  ├─ InkBackdrop.tsx       Nền thuỷ mặc: quầng linh khí, mây khói, núi non
│  ├─ RealmSeal.tsx         Ấn triện chu sa khắc tên cảnh giới
│  ├─ TaskCard.tsx           Thẻ nhiệm vụ: tick có confetti, chip +tu vi, mở rộng chi tiết
│  ├─ CelebrationLayer.tsx   Lớp phủ đột phá / độ kiếp / phi thăng / kỳ ngộ
│  ├─ TaskEditorDialog.tsx · SettingsDialog.tsx · QuickAdd.tsx · ProgressRing.tsx · primitives.tsx
├─ views/                    TodayView, WeekView, MonthView, GoalsView, FocusView, AwardsView, StatsView
├─ index.css                 Theme Tailwind v4 + token + keyframes
├─ test-setup.ts             Polyfill cho jsdom (Storage, ResizeObserver, canvas 2d)
└─ __tests__/                Test logic thuần + test tích hợp giao diện
```

## Ghi chú kỹ thuật

- **Vùng cuộn duy nhất** nằm ở `main > div.overflow-y-auto`; `html`/`body` bị khoá cuộn.
  Mọi khối cha trên đường đó đều có `min-h-0` — thiếu nó là flexbox sẽ tràn và mất scroll.
- **Nhiệm vụ lặp lại** không sinh trước hàng loạt. Xong lần này mới tạo lần kế tiếp.
- **Chuỗi ngày** vẫn giữ nếu hôm nay chưa xong việc (ngày chưa kết thúc); chỉ đứt khi trọn một
  ngày không hoàn thành gì.
- **Confetti fail-safe**: mọi lời gọi đi qua `fire()` có try/catch, môi trường không vẽ được canvas
  vẫn tick xong nhiệm vụ bình thường.
- **`src/test-setup.ts`** cấp `Storage` trong bộ nhớ (Node 25 gắn sẵn một `localStorage` rỗng che
  mất bản của jsdom), cùng `ResizeObserver`, `matchMedia` và context canvas 2d cho Radix + confetti.
- Dữ liệu chỉ nằm trong trình duyệt — dùng Cài đặt → "Xuất tệp JSON" để sao lưu định kỳ.

## Độ tin cậy và hiệu năng

- Đồng hồ Bế Quan chạy ở cấp ứng dụng và tính theo thời điểm kết thúc, tiếp tục khi chuyển màn hình hoặc tab. Tải lại trang vẫn kết thúc phiên chưa lưu.
- Lỗi ghi localStorage hiện cảnh báo kèm xuất JSON và thử lưu lại. Dữ liệu cũ không đọc được sẽ được giữ nguyên để xuất bản khôi phục, không tự ghi đè.
- Tệp nhập được kiểm tra cấu trúc trước khi thay thế dữ liệu. ID tài nguyên cũ vẫn được dọn theo quy tắc tương thích.
- Các màn hình tải khi mở. Nền Three.js luôn được hiển thị như thiết kế ban đầu.
