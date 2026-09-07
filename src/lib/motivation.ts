/** Câu nói tạo động lực - đổi theo ngày để mỗi sáng mở app thấy một câu mới. */
const QUOTES: { text: string; author: string }[] = [
  { text: 'Kỷ luật là cây cầu giữa mục tiêu và thành quả.', author: 'Jim Rohn' },
  { text: 'Đừng đếm số ngày, hãy làm cho từng ngày có giá trị.', author: 'Muhammad Ali' },
  { text: 'Việc khó nhất là bắt đầu. Hãy làm 5 phút thôi.', author: 'Quy tắc 5 phút' },
  { text: 'Bạn không cần giỏi để bắt đầu, nhưng phải bắt đầu để giỏi.', author: 'Zig Ziglar' },
  { text: 'Một kế hoạch tầm thường được thực thi hôm nay tốt hơn kế hoạch hoàn hảo của tuần sau.', author: 'George Patton' },
  { text: 'Tập trung không phải là nói "có" với điều đúng, mà là nói "không" với 100 điều khác.', author: 'Steve Jobs' },
  { text: 'Thành công là tổng của những nỗ lực nhỏ lặp lại mỗi ngày.', author: 'Robert Collier' },
  { text: 'Hoàn thành tốt hơn hoàn hảo.', author: 'Sheryl Sandberg' },
  { text: 'Thời gian trôi qua dù bạn có làm gì hay không. Hãy chọn làm.', author: 'Khuyết danh' },
  { text: 'Điều bạn làm hôm nay quyết định bạn của ngày mai.', author: 'Khuyết danh' },
  { text: 'Áp lực tạo kim cương. Deadline tạo kết quả.', author: 'Khuyết danh' },
  { text: 'Chậm cũng được, miễn là đừng dừng lại.', author: 'Khổng Tử' },
];

export function quoteOfDay(seed = new Date()) {
  const dayIndex = Math.floor(seed.getTime() / 86_400_000);
  return QUOTES[dayIndex % QUOTES.length];
}

/** Lời nhắc thay đổi theo tiến độ trong ngày, để "đẩy" người dùng tiếp tục. */
export function nudge(done: number, total: number, overdue: number, hour = new Date().getHours()) {
  if (overdue > 0) return `Có ${overdue} nhiệm vụ đang trễ hạn. Xử lý ngay việc trễ lâu nhất trước!`;
  if (total === 0) return 'Chưa có nhiệm vụ nào cho hôm nay. Lên kế hoạch 3 việc quan trọng nhất đi!';
  if (done === total) return 'Xuất sắc! Bạn đã dọn sạch danh sách hôm nay. Nghỉ ngơi xứng đáng.';
  const remain = total - done;
  const ratio = done / total;
  if (hour < 10) return `Buổi sáng là lúc não khỏe nhất. Chốt ${Math.min(remain, 2)} việc khó trước 11h.`;
  if (hour >= 20) return `Còn ${remain} việc. Chọn 1 việc nhỏ nhất để kết thúc ngày trong thế thắng.`;
  if (ratio >= 0.7) return `Chỉ còn ${remain} việc nữa là trọn vẹn. Đừng dừng ở đây!`;
  if (ratio >= 0.3) return `Đã đi được ${Math.round(ratio * 100)}%. Bật đồng hồ tập trung 25 phút ngay.`;
  return `Còn ${remain} việc chưa động tới. Bắt đầu bằng việc ưu tiên cao nhất trong 5 phút.`;
}
