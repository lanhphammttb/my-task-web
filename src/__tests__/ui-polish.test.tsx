import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { seedData } from '../lib/seed';

const KHOA = 'my-task-planner/v1';

function openPanel(label: string) {
  const rail = screen.queryByRole('navigation', { name: 'Các nơi trong tiên giới' });
  const nut = rail && within(rail).queryByRole('button', { name: new RegExp('^' + label) });
  fireEvent.click(nut ?? screen.getByRole('button', { name: label }));
}

const coViecRieng = () =>
  (JSON.parse(localStorage.getItem(KHOA) ?? '{"tasks":[]}').tasks as { title: string }[]).some(
    (t) => t.title === 'Việc riêng của tôi',
  );

describe('Đợt mài giũa UI', () => {
  beforeEach(() => {
    localStorage.clear();
    const d = seedData();
    d.tasks[0] = { ...d.tasks[0], title: 'Việc riêng của tôi' };
    localStorage.setItem(KHOA, JSON.stringify(d));
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  });

  it('"Nạp dữ liệu mẫu" hỏi lại trước khi đè dữ liệu thật', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Cài đặt' }));
    const tab = await screen.findByRole('tab', { name: /Dữ liệu/ });
    fireEvent.mouseDown(tab);
    fireEvent.click(tab);
    fireEvent.click(await screen.findByRole('button', { name: /Nạp dữ liệu mẫu/ }));

    const hoi = await screen.findByRole('alertdialog');
    expect(within(hoi).getByText('Dữ liệu hiện tại sẽ bị thay thế')).toBeDefined();
    expect(within(hoi).getByRole('button', { name: /Xuất bản sao trước/ })).toBeDefined();
    // Chưa xác nhận thì dữ liệu còn nguyên.
    expect(coViecRieng()).toBe(true);

    fireEvent.click(within(hoi).getByRole('button', { name: 'Huỷ' }));
    expect(coViecRieng()).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: /Nạp dữ liệu mẫu/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Thay bằng dữ liệu mẫu' }));
    expect(coViecRieng()).toBe(false);
  });

  it('thẻ Dữ liệu chỉ hiện một dòng trạng thái, chi tiết chuỗi băm gấp vào "Tìm hiểu thêm"', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Cài đặt' }));
    const tab = await screen.findByRole('tab', { name: /Dữ liệu/ });
    fireEvent.mouseDown(tab);
    fireEvent.click(tab);
    expect(await screen.findByText('Dữ liệu toàn vẹn')).toBeDefined();
    const chiTiet = screen.getByText('Tìm hiểu thêm').closest('details');
    expect(chiTiet?.open).toBe(false);
  });

  it('kết thúc phiên bế quan dưới 1 phút thì báo là không ghi nhận', async () => {
    render(<App />);
    openPanel('Bế Quan Động');
    fireEvent.click(await screen.findByRole('button', { name: 'Bắt đầu tập trung' }));
    const nut = screen.getByRole('button', { name: 'Tạm dừng' });
    // Nút chính đổi nhãn theo trạng thái, không dùng aria-pressed.
    expect(nut.getAttribute('aria-pressed')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Kết thúc & ghi nhận' }));
    expect(await screen.findByText(/Phiên chưa đủ 1 phút nên không được ghi nhận/)).toBeDefined();
  });
});
