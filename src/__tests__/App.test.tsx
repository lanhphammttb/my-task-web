import { seedData } from "../lib/seed";
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { aphorismOfDay, elderPortrait } from '../lib/elders';

/**
 * Hub là màn hình mặc định. Mọi NƠI đều mở từ dãy nút tròn bám mép phải;
 * thanh dưới chỉ còn hành động (tra cứu, về sảnh, thêm việc).
 *
 * Nhãn trợ năng của nút tròn có dạng "Tên — phụ đề", nên khớp theo đầu chuỗi.
 */
function openPanel(label: string) {
  const rail = screen.queryByRole('navigation', { name: 'Các nơi trong tiên giới' });
  const nut = rail && within(rail).queryByRole('button', { name: new RegExp('^' + label) });
  fireEvent.click(nut ?? screen.getByRole('button', { name: label }));
}

describe('Ứng dụng web', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('my-task-planner/v1', JSON.stringify(seedData()));
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  });

  it('khởi động vào sảnh tu tiên với lời tiền bối, chân dung và vòng tu vi', () => {
    render(<App />);

    // HUD nhân vật
    expect(screen.getByText('Đạo hữu')).toBeDefined();
    // Vòng tu vi ở giữa hiển thị cảnh giới khởi đầu
    expect(screen.getAllByText('Luyện').length).toBeGreaterThan(0);
    expect(screen.getByRole('main', { name: 'Sảnh tu luyện' })).toBeDefined();
    const aphorism = aphorismOfDay();
    const teaching = screen.getByLabelText('Lời tiền bối');
    expect(within(teaching).getByText(`“${aphorism.text}”`)).toBeDefined();
    expect(within(teaching).getByText(aphorism.elder)).toBeDefined();
    expect(within(teaching).getByText(aphorism.title)).toBeDefined();
    expect(within(teaching).getByRole('img', { name: `Chân dung ${aphorism.elder}` }).getAttribute('src')).toBe(elderPortrait(aphorism.elder));
    expect(screen.getByRole('navigation', { name: 'Các nơi trong tiên giới' })).toBeDefined();
    expect(screen.getByRole('navigation', { name: 'Thanh điều hướng chính' })).toBeDefined();
  });

  it('mở bảng Hôm nay từ thanh tab và thấy dữ liệu mẫu', async () => {
    render(<App />);
    openPanel('Hành Sự Đường');

    expect(await screen.findByRole('heading', { name: 'Hành Sự Đường' })).toBeDefined();
    expect((await screen.findAllByText('Chốt tài liệu bàn giao module thanh toán')).length).toBeGreaterThan(0);
  });

  it('giữ một menu Bế Quan và không lặp nút chung ở sảnh', async () => {
    render(<App />);
    // Đúng MỘT lối vào Bế Quan, và nó nằm trên dãy nút tròn.
    expect(screen.getAllByRole('button', { name: /^Bế Quan Động/ })).toHaveLength(1);
    expect(screen.queryByRole('button', { name: 'Bế quan tu luyện' })).toBeNull();
    openPanel('Bế Quan Động');
    expect(await screen.findByRole('heading', { name: 'Bế quan tu luyện' })).toBeDefined();
    openPanel('Sơn Môn');
    expect(await screen.findByRole('button', { name: 'Tập trung việc này' })).toBeDefined();
  });

  it('phím / mở ô tìm kiếm và đóng tra cứu xoá bộ lọc', async () => {
    render(<App />);
    fireEvent.keyDown(document.body, { key: '/' });
    const input = screen.getByRole('searchbox', { name: 'Tìm nhiệm vụ hoặc nhãn' });
    expect(document.activeElement).toBe(input);
    expect(screen.getByRole('button', { name: 'Đóng tra cứu' }).getAttribute('aria-expanded')).toBe('true');
    fireEvent.change(input, { target: { value: 'chạy bộ' } });
    expect(await screen.findByRole('heading', { name: 'Kết quả tìm kiếm' })).toBeDefined();
    const nav = screen.getByRole('navigation', { name: 'Thanh điều hướng chính' });
    expect(nav.querySelector('[aria-current="page"]')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Đóng tra cứu' }));
    expect((input as HTMLInputElement).value).toBe('');
    expect(within(nav).getByRole('button', { name: 'Sơn Môn' }).getAttribute('aria-current')).toBe('page');
  });

  it('không chuyển bảng bằng phím số khi đang sửa nhiệm vụ', async () => {
    render(<App />);
    openPanel('Hành Sự Đường');
    await screen.findByRole('heading', { name: 'Hành Sự Đường' });
    openPanel('Nhiệm vụ mới');
    expect(document.querySelector('[data-slot="dialog-content"]')).not.toBeNull();
    fireEvent.keyDown(document.body, { key: '5' });
    // Hộp thoại đang mở thì phím số không được đổi bảng phía sau.
    expect(screen.queryByRole('heading', { name: 'Hành Sự Đường' })).toBeNull();
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });
    expect(await screen.findByRole('heading', { name: 'Hành Sự Đường' })).toBeDefined();
  });

  it('dãy nút tròn dùng được cả khi đang đứng trong một khu', async () => {
    /*
     * Lúc đầu tôi ẩn dãy nút khi bảng mở, cho đỡ chồng lớp. Nhưng thế thì muốn
     * sang nơi khác phải đóng bảng rồi mở lại - đúng kiểu lạc đường mà cả đợt
     * sửa này sinh ra để dẹp. Nó phải luôn bấm được.
     */
    render(<App />);
    openPanel('Hành Sự Đường');
    await screen.findByRole('heading', { name: 'Hành Sự Đường' });

    // Nhảy thẳng sang khu khác, không phải quay về sảnh trước.
    openPanel('Đại Nguyện');
    expect(await screen.findByRole('heading', { name: 'Đại Nguyện' })).toBeDefined();

    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });
    expect(screen.getByRole('navigation', { name: 'Các nơi trong tiên giới' })).toBeDefined();
  });

  it('giữ phiên tập trung khi rời bảng và trở lại đúng trạng thái tạm dừng', async () => {
    render(<App />);
    openPanel('Tập trung việc này');
    fireEvent.click(await screen.findByRole('button', { name: 'Bắt đầu' }));
    fireEvent.click(screen.getByRole('button', { name: 'Tạm dừng' }));
    openPanel('Sơn Môn');
    fireEvent.click(await screen.findByRole('button', { name: 'Về phiên bế quan' }));
    expect(await screen.findByRole('button', { name: 'Tiếp tục' })).toBeDefined();
    expect((screen.getByRole('combobox') as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Kết thúc & ghi nhận' }));
    expect(screen.getByRole('button', { name: 'Bắt đầu' })).toBeDefined();
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

  it('Linh thú nằm trong Động Phủ và mục lục mở đúng phần đang gập', async () => {
    render(<App />);
    openPanel('Động Phủ');

    expect(await screen.findByRole('heading', { name: 'Động Phủ' })).toBeDefined();
    fireEvent.click(await screen.findByRole('link', { name: 'Linh thú' }));
    expect(await screen.findByRole('button', { name: 'Thu gọn Linh thú' })).toBeDefined();
    expect(document.getElementById('cave-beast')).not.toBeNull();
  });

  it('menu toàn web không trộn mục con vào, dù bản đồ có lối tắt riêng', () => {
    /*
     * Nguyên tắc đã đổi có chủ ý.
     *
     * Trước đây mỗi khu chỉ được có ĐÚNG MỘT lối vào, kể cả ở sảnh. Nhưng điều
     * hướng ba tầng ấy chính là thứ người dùng kêu khó nhớ, nên sảnh giờ là một
     * bản đồ bấm thẳng tới từng nơi - kể cả lối tắt vào Linh Điền nằm sâu trong
     * Động Phủ.
     *
     * Thứ VẪN phải giữ: dãy nút không được phình ra vô hạn. Nó chỉ mang các
     * khu lớn cộng vài lối tắt đáng giá; mục con như Linh Căn hay Đan Đường
     * vẫn nằm trong Động Phủ chứ không leo lên đây.
     */
    render(<App />);
    const rail = screen.getByRole('navigation', { name: 'Các nơi trong tiên giới' });
    const nut = within(rail).getAllByRole('button');
    expect(nut.length).toBeLessThanOrEqual(9);
    expect(within(rail).queryByRole('button', { name: /^Linh Căn/ })).toBeNull();
    expect(within(rail).queryByRole('button', { name: /^Đan Đường/ })).toBeNull();
    // Thanh dưới chỉ còn hành động, không còn là nơi chốn.
    const duoi = screen.getByRole('navigation', { name: 'Thanh điều hướng chính' });
    expect(within(duoi).queryByRole('button', { name: 'Tiên giới' })).toBeNull();
  });

  it('dãy nút tròn bấm thẳng tới từng nơi, nhãn kèm dòng nói rõ nơi đó là gì', () => {
    render(<App />);
    const rail = screen.getByRole('navigation', { name: 'Các nơi trong tiên giới' });
    const noi = within(rail).getAllByRole('button');
    expect(noi.length).toBeGreaterThanOrEqual(6);

    // Tên Hán Việt giữ nguyên cho đúng chất, nhưng nhãn trợ năng nào cũng phải
    // kèm dòng nói thẳng nơi đó là gì - nhớ được là nhờ dòng ấy, không nhờ tên.
    for (const n of noi) {
      expect(n.getAttribute('aria-label')).toMatch(/ — .+/);
      expect(n.querySelector('.world-rail-ten')?.textContent?.trim()).toBeTruthy();
    }

    fireEvent.click(within(rail).getByRole('button', { name: /^Hành Sự Đường/ }));
    expect(screen.getByRole('heading', { name: 'Hành Sự Đường' })).toBeTruthy();
  });

  it('mục lục từng khu chỉ dẫn tới nội dung thực sự có trong khu đó', async () => {
    render(<App />);
    openPanel('Động Phủ');
    const cave = await screen.findByRole('navigation', { name: 'Các mục trong Động Phủ' });
    for (const link of within(cave).getAllByRole('link')) {
      expect(document.getElementById(link.getAttribute('href')!.slice(1))).not.toBeNull();
    }
    expect(within(cave).queryByRole('link', { name: 'Tẩy tuỷ' })).toBeNull();
    openPanel('Tiên Lộ');
    const path = await screen.findByRole('navigation', { name: 'Các mục trong Tiên Lộ' });
    for (const link of within(path).getAllByRole('link')) {
      expect(document.getElementById(link.getAttribute('href')!.slice(1))).not.toBeNull();
    }
    fireEvent.click(within(path).getByRole('link', { name: 'Thám hiểm' }));
    expect(screen.getByRole('heading', { name: 'Thám hiểm' })).toBeDefined();
  });

  it('tìm kiếm mở bảng tra cứu và lọc đúng nhiệm vụ theo tên', async () => {
    render(<App />);
    openPanel('Tra cứu nhiệm vụ');
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
