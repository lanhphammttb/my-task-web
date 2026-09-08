import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import App from '../App';

describe('Ứng dụng web', () => {
  beforeEach(() => localStorage.clear());

  it('khởi động và hiển thị màn hình Hôm nay với dữ liệu mẫu', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Kế hoạch trong ngày' })).toBeDefined();
    expect(screen.getAllByText('Hôm nay').length).toBeGreaterThan(0);
    // Dữ liệu mẫu phải xuất hiện ngay lần chạy đầu tiên.
    expect(screen.getAllByText('Chốt tài liệu bàn giao module thanh toán').length).toBeGreaterThan(0);
  });

  it('thêm nhiệm vụ qua ô thêm nhanh và lưu vào localStorage', () => {
    render(<App />);

    const input = screen.getByPlaceholderText(/Thêm nhanh nhiệm vụ/);
    fireEvent.change(input, { target: { value: 'Nhiệm vụ kiểm thử !cao @08:15 ~45 #test' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(screen.getAllByText('Nhiệm vụ kiểm thử').length).toBeGreaterThan(0);

    const saved = JSON.parse(localStorage.getItem('my-task-planner/v1') ?? '{}');
    const added = saved.tasks.find((t: { title: string }) => t.title === 'Nhiệm vụ kiểm thử');
    expect(added).toMatchObject({ priority: 'high', startTime: '08:15', estimateMin: 45, tags: ['test'] });
  });

  it('đánh dấu hoàn thành làm tăng số việc đã xong', () => {
    render(<App />);

    const before = JSON.parse(localStorage.getItem('my-task-planner/v1') ?? '{"tasks":[]}');
    const doneBefore = before.tasks.filter((t: { status: string }) => t.status === 'done').length;

    fireEvent.click(screen.getAllByLabelText('Đánh dấu hoàn thành')[0]);

    const after = JSON.parse(localStorage.getItem('my-task-planner/v1') ?? '{"tasks":[]}');
    const doneAfter = after.tasks.filter((t: { status: string }) => t.status === 'done').length;
    expect(doneAfter).toBe(doneBefore + 1);
  });

  // Việc đổi màn hình có hoạt ảnh chuyển cảnh nên phải dùng truy vấn chờ (findBy).
  it('chuyển được sang màn hình Tháng, Mục tiêu và Thống kê', async () => {
    render(<App />);
    const nav = screen.getByRole('complementary');

    fireEvent.click(within(nav).getByText('Tháng'));
    expect(await screen.findByRole('heading', { name: 'Kế hoạch tháng' })).toBeDefined();

    fireEvent.click(within(nav).getByText('Mục tiêu'));
    expect(await screen.findByRole('heading', { name: 'Mục tiêu dài hạn' })).toBeDefined();
    expect((await screen.findAllByText('Bàn giao dự án Q3')).length).toBeGreaterThan(0);

    fireEvent.click(within(nav).getByText('Thống kê'));
    expect(await screen.findByRole('heading', { name: 'Thống kê hiệu suất' })).toBeDefined();
    expect(await screen.findByText('Tỷ lệ hoàn thành')).toBeDefined();
  });

  it('mở được trang Tiên Lộ với bậc thang cảnh giới và kỳ ngộ', async () => {
    render(<App />);
    const nav = screen.getByRole('complementary');

    fireEvent.click(within(nav).getByText('Tiên Lộ'));

    expect(await screen.findByRole('heading', { name: 'Tiên Lộ' })).toBeDefined();
    // Bậc thang phải liệt kê đủ từ cảnh giới đầu tới đích phi thăng.
    expect((await screen.findAllByText('Luyện Khí')).length).toBeGreaterThan(0);
    expect(await screen.findByText('Phi Thăng')).toBeDefined();
    // Dữ liệu mẫu đã có việc hoàn thành nên kỳ ngộ đầu tiên phải được mở.
    expect(await screen.findByText('Nhập Đạo')).toBeDefined();
    expect(await screen.findByText('Toạ Vong Chi Cảnh')).toBeDefined();
  });

  it('tìm kiếm lọc đúng nhiệm vụ theo tên', () => {
    render(<App />);

    fireEvent.change(screen.getByPlaceholderText(/Tìm nhiệm vụ/), { target: { value: 'chạy bộ' } });

    expect(screen.getByRole('heading', { name: /Kết quả tìm kiếm/ })).toBeDefined();
    expect(screen.getAllByText('Chạy bộ 5km').length).toBeGreaterThan(0);
    expect(screen.queryByText('Họp daily với team')).toBeNull();
  });

  it('không cho hoàn thành nhiệm vụ của ngày mai, không bung hiệu ứng', async () => {
    render(<App />);

    // Sang ngày mai rồi thử tick một nhiệm vụ ở đó.
    fireEvent.click(screen.getByRole('button', { name: 'Ngày sau' }));
    const boxes = await screen.findAllByLabelText('Đánh dấu hoàn thành');
    fireEvent.click(boxes[0]);

    const saved = JSON.parse(localStorage.getItem('my-task-planner/v1') ?? '{}');
    const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
    const done = saved.tasks.filter(
      (t: { date: string; status: string }) => t.date === tomorrow && t.status === 'done',
    );
    expect(done).toHaveLength(0);
    // Không có bản ghi nào được thêm vào sổ ghi cho hành động bị chặn.
    expect(saved.ledger.every((e: { kind: string }) => e.kind === 'task' || e.kind === 'session')).toBe(true);
  });

  it('nhiệm vụ hôm nay vẫn hoàn thành được và được ghi vào sổ', async () => {
    render(<App />);

    const before = JSON.parse(localStorage.getItem('my-task-planner/v1') ?? '{}');
    const beforeLedger = before.ledger.length;

    fireEvent.click(screen.getAllByLabelText('Đánh dấu hoàn thành')[0]);

    const after = JSON.parse(localStorage.getItem('my-task-planner/v1') ?? '{}');
    expect(after.ledger.length).toBe(beforeLedger + 1);
  });
});
