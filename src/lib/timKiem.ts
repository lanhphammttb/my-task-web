import type { Task } from '../types';

/**
 * Tìm nhiệm vụ không phân biệt dấu.
 *
 * Người dùng gõ tiếng Việt trên điện thoại rất hay bỏ dấu cho nhanh: "bao cao"
 * phải ra được "Báo cáo quý 3". So chuỗi thô thì không bao giờ khớp, vì "á" và
 * "a" là hai ký tự khác nhau.
 *
 * Cách làm: tách mỗi chữ có dấu thành chữ gốc + dấu rời (`normalize('NFD')`),
 * bỏ hết dấu rời (khối U+0300..U+036F), rồi đổi `đ`/`Đ` - chữ này không tách
 * được bằng NFD vì nó là một chữ riêng chứ không phải `d` cộng dấu.
 */
export function boDau(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, (c) => (c === 'đ' ? 'd' : 'D'))
    .toLowerCase();
}

/** Chuẩn hoá câu tìm: bỏ dấu, gộp khoảng trắng, cắt hai đầu. */
export const chuanHoaTim = (q: string) => boDau(q).replace(/\s+/g, ' ').trim();

/**
 * Nhiệm vụ có khớp câu tìm không.
 *
 * Soát cả tên, ghi chú, nhãn và **tên các bước nhỏ** - việc "Chuẩn bị họp"
 * mà có bước "gửi báo cáo" thì tìm "bao cao" cũng phải thấy nó. Mỗi từ trong
 * câu tìm phải xuất hiện ở đâu đó (không cần liền nhau, không cần đúng thứ
 * tự): "quy bao" vẫn ra "Báo cáo quý 3". Câu tìm rỗng thì khớp tất cả.
 */
export function khopTimKiem(task: Pick<Task, 'title' | 'note' | 'tags' | 'subtasks'>, q: string): boolean {
  const cau = chuanHoaTim(q);
  if (!cau) return true;
  const kho = boDau([task.title, task.note, ...task.tags, ...task.subtasks.map((s) => s.title)].join('\n'));
  return cau.split(' ').every((tu) => kho.includes(tu));
}

/** Lọc danh sách theo câu tìm, giữ nguyên thứ tự. */
export function timNhiemVu<T extends Pick<Task, 'title' | 'note' | 'tags' | 'subtasks'>>(tasks: readonly T[], q: string): T[] {
  const cau = chuanHoaTim(q);
  if (!cau) return [...tasks];
  return tasks.filter((t) => khopTimKiem(t, cau));
}
