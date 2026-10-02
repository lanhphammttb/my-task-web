import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TaskCard from '../components/TaskCard';
import { AppProvider } from '../store/AppStore';
import { seedData } from '../lib/seed';
import { todayKey } from '../lib/date';

beforeEach(() => localStorage.clear());

describe('thẻ việc gọn', () => {
  const task = { ...seedData().tasks[0], date: todayKey(), status: 'todo' as const, tags: ['a', 'b'] };

  it('nút tập trung là một biểu tượng nhỏ, chạm vào tên là sửa', () => {
    const onEdit = vi.fn();
    const onFocus = vi.fn();
    render(<AppProvider><TaskCard task={task} onEdit={onEdit} onFocus={onFocus} /></AppProvider>);
    expect(screen.queryByText(/Bế quan làm việc này/i)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: `Tập trung vào việc này: ${task.title}` }));
    expect(onFocus).toHaveBeenCalledWith(task);
    fireEvent.click(screen.getByRole('button', { name: `Sửa việc: ${task.title}` }));
    expect(onEdit).toHaveBeenCalledWith(task);
    // Nhãn # gộp chung một nhãn.
    expect(screen.getByText('#a #b')).toBeDefined();
    // Các thao tác phụ vẫn còn, sau nút mở rộng.
    const mo = screen.getByRole('button', { name: `Thêm thao tác: ${task.title}` });
    expect(mo.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(mo);
    expect(screen.getByRole('button', { name: /Dời sang mai/ })).toBeDefined();
  });

  it('việc đã xong thì không có nút tập trung', () => {
    render(<AppProvider><TaskCard task={{ ...task, status: 'done' }} onEdit={() => {}} onFocus={() => {}} /></AppProvider>);
    expect(screen.queryByRole('button', { name: /^Tập trung vào việc này/ })).toBeNull();
  });
});
