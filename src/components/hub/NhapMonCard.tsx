import { Mountain, PenLine, Plus, Sparkles, X } from "lucide-react";
import { NHAN, THUAT_NGU } from "../../lib/thuatNgu";

const BUOC = [
  { Icon: PenLine, ten: "Ghi việc thật", ghiChu: "Đọc sách, đi bộ, làm báo cáo…" },
  { Icon: Sparkles, ten: "Xong việc được tu vi", ghiChu: `Tu vi là ${THUAT_NGU.tuVi.ro}` },
  { Icon: Mountain, ten: "Tu vi đủ thì đột phá cảnh giới", ghiChu: `Cảnh giới là ${THUAT_NGU.canhGioi.ro}` },
];

/**
 * Thẻ nhập môn ba bước - chỉ hiện khi hồ sơ còn trắng (xem `useNhapMon`).
 *
 * Nằm đúng chỗ danh sách việc sẽ hiện, thay cho dòng "chưa có việc": người mới
 * nhìn vào đó trước tiên, và nút chính dẫn thẳng tới việc cần làm.
 */
export default function NhapMonCard({
  onNew,
  onDismiss,
  className,
}: {
  onNew: () => void;
  onDismiss: () => void;
  className?: string;
}) {
  return (
    <section className={`nhap-mon ${className ?? ""}`} aria-labelledby="nhap-mon-tieu" data-onboarding="">
      <header className="nhap-mon-dau">
        <h2 id="nhap-mon-tieu" className="nhap-mon-tieu">Bắt đầu trong ba bước</h2>
        <button type="button" className="nhap-mon-dong" onClick={onDismiss} aria-label="Ẩn hướng dẫn">
          <X className="size-4" />
        </button>
      </header>
      <ol className="nhap-mon-buoc">
        {BUOC.map(({ Icon, ten, ghiChu }, i) => (
          <li key={ten}>
            <span className="nhap-mon-so" aria-hidden="true">
              <Icon className="size-3.5" />
            </span>
            <span className="min-w-0">
              <strong>
                <span className="sr-only">Bước {i + 1}: </span>
                {ten}
              </strong>
              <small>{ghiChu}</small>
            </span>
          </li>
        ))}
      </ol>
      <button type="button" className="btn-game nhap-mon-cta" onClick={onNew}>
        <Plus className="size-4" /> {NHAN.themViecDau}
      </button>
    </section>
  );
}
