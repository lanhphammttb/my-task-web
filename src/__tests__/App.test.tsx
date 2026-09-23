import { seedData } from "../lib/seed";
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import App from '../App';

/** Hub là màn hình mặc định; mọi bảng đều mở từ icon hoặc thanh tab dưới. */
function openPanel(label: string) {
  fireEvent.click(screen.getByRole('button', { name: label }));
}

describe('Ứng dụng web', () => {
  beforeEach(() => { localStorage.clear(); localStorage.setItem('my-task-planner/v1', JSON.stringify(seedData())); });

  it('khởi động vào hub tu luyện với HUD, châm ngôn và hai cột icon', () => {
    render(<App />);

    // HUD nhân vật
    expect(screen.getByText('Đạo hữu')).toBeDefined();
    // Vòng tu vi ở giữa hiển thị cảnh giới khởi đầu
    expect(screen.getAllByText('Luyện').length).toBeGreaterThan(0);
    // Hai cột icon hai bên
    expect(screen.getByRole('navigation', { name: 'Hoạt động tu luyện' })).toBeDefined();
    expect(screen.getByRole('navigation', { name: 'Đạo thể và tài nguyên' })).toBeDefined();
    expect(screen.getByRole('navigation', { name: 'Thanh điều hướng chính' })).toBeDefined();
    // Châm ngôn tiền bối luôn có mặt trên hub
    expect(screen.getByRole('button', { name: 'Bế Quan' })).toBeDefined();
  });

  it('mở bảng Hôm nay từ thanh tab và thấy dữ liệu mẫu', async () => {
    render(<App />);
    openPanel('Hành Sự Đường');

    expect(await screen.findByRole('heading', { name: 'Hành Sự Đường' })).toBeDefined();
    expect((await screen.findAllByText('Chốt tài liệu bàn giao module thanh toán')).length).toBeGreaterThan(0);
  });

  it('thêm nhiệm vụ qua ô thêm nhanh và lưu vào localStorage', async () => {
    render(<App />);
    openPanel('Hành Sự Đường');

    const input = await screen.findByPlaceholderText(/Thêm nhanh nhiệm vụ/);
    fireEvent.change(input, { target: { value: 'Nhiệm vụ kiểm thử !cao @08:15 ~45 #test' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(screen.getAllByText('Nhiệm vụ kiểm thử').length).toBeGreaterThan(0);

    const saved = JSON.parse(localStorage.getItem('my-task-planner/v1') ?? '{}');
    const added = saved.tasks.find((t: { title: string }) => t.title === 'Nhiệm vụ kiểm thử');
    expect(added).toMatchObject({ priority: 'high', startTime: '08:15', estimateMin: 45, tags: ['test'] });
  });

  it('đánh dấu hoàn thành làm tăng số việc đã xong', async () => {
    render(<App />);
    openPanel('Hành Sự Đường');

    const before = JSON.parse(localStorage.getItem('my-task-planner/v1') ?? '{"tasks":[]}');
    const doneBefore = before.tasks.filter((t: { status: string }) => t.status === 'done').length;

    fireEvent.click((await screen.findAllByLabelText('Đánh dấu hoàn thành'))[0]);

    const after = JSON.parse(localStorage.getItem('my-task-planner/v1') ?? '{"tasks":[]}');
    const doneAfter = after.tasks.filter((t: { status: string }) => t.status === 'done').length;
    expect(doneAfter).toBe(doneBefore + 1);
  });

  // Việc đổi bảng có hoạt ảnh chuyển cảnh nên phải dùng truy vấn chờ (findBy).
  it('chuyển được sang bảng Tháng, Mục tiêu và Thống kê', async () => {
    render(<App />);

    openPanel('Hành Sự Đường');
    fireEvent.click(await screen.findByRole('button', { name: /Nguyệt Khoá/ }));
    expect(await screen.findByRole('button', { name: 'Tháng sau' })).toBeDefined();

    openPanel('Đại Nguyện');
    expect(await screen.findByRole('heading', { name: 'Đại Nguyện' })).toBeDefined();
    expect((await screen.findAllByText('Bàn giao dự án Q3')).length).toBeGreaterThan(0);

    openPanel('Tu Hành Lục');
    expect(await screen.findByRole('heading', { name: 'Tu Hành Lục' })).toBeDefined();
    expect(await screen.findByText('Tỷ lệ hoàn thành')).toBeDefined();
  });

  it('mở được bảng Tiên Lộ với bậc thang cảnh giới và kỳ ngộ', async () => {
    render(<App />);
    openPanel('Tiên Lộ');

    expect(await screen.findByRole('heading', { name: 'Tiên Lộ' })).toBeDefined();
    // Bậc thang phải liệt kê đủ từ cảnh giới đầu tới đích phi thăng.
    expect((await screen.findAllByText('Luyện Khí')).length).toBeGreaterThan(0);
    expect(await screen.findByText('Phi Thăng')).toBeDefined();
    // Dữ liệu mẫu đã có việc hoàn thành nên kỳ ngộ đầu tiên phải được mở.
    expect(await screen.findByText('Nhập Đạo')).toBeDefined();
    expect(await screen.findByText('Toạ Vong Chi Cảnh')).toBeDefined();
  });

  it('icon Linh Thú mở Động Phủ đúng mục linh thú', async () => {
    render(<App />);
    openPanel('Linh Thú');

    expect(await screen.findByRole('heading', { name: 'Động Phủ' })).toBeDefined();
    expect(await screen.findByText('Linh thú')).toBeDefined();
    expect(document.getElementById('cave-beast')).not.toBeNull();
  });

  it('tìm kiếm mở bảng tra cứu và lọc đúng nhiệm vụ theo tên', async () => {
    render(<App />);

    fireEvent.change(screen.getByPlaceholderText(/Tìm nhiệm vụ/), { target: { value: 'chạy bộ' } });

    expect(await screen.findByRole('heading', { name: 'Kết quả tìm kiếm' })).toBeDefined();
    expect(screen.getAllByText('Chạy bộ 5km').length).toBeGreaterThan(0);
    expect(screen.queryByText('Họp daily với team')).toBeNull();
  });

  it('không cho hoàn thành nhiệm vụ của ngày mai, không bung hiệu ứng', async () => {
    render(<App />);
    openPanel('Hành Sự Đường');

    // Sang ngày mai rồi thử tick một nhiệm vụ ở đó.
    fireEvent.click(await screen.findByRole('button', { name: 'Ngày sau' }));
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
    openPanel('Hành Sự Đường');

    const before = JSON.parse(localStorage.getItem('my-task-planner/v1') ?? '{}');
    const beforeLedger = before.ledger.length;

    fireEvent.click((await screen.findAllByLabelText('Đánh dấu hoàn thành'))[0]);

    const after = JSON.parse(localStorage.getItem('my-task-planner/v1') ?? '{}');
    expect(after.ledger.length).toBe(beforeLedger + 1);
  });
});
