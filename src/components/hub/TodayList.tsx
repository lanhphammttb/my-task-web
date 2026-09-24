import { Check, Plus } from "lucide-react";
import type { Task } from "../../types";
import { useApp } from "../../store/AppStore";
import { todayKey } from "../../lib/date";
import { sortTasks, tasksOn } from "../../lib/stats";
import { PRIORITY_META } from "../../types";

/**
 * Việc hôm nay, ngay trên màn mặc định.
 *
 * Trước đây sảnh không có lấy một nhiệm vụ nào: nhân vật, vòng cảnh giới, chỉ
 * số, và mười một lần nhắc tới tu vi - còn danh sách việc thì nằm sau một nút.
 * Tức là thứ làm hai mươi lần mỗi ngày bị đẩy ra sau thứ làm mỗi tháng một lần.
 *
 * Vỏ tu tiên là **lớp sơn cho việc thật**, không phải nội dung chính. Danh sách
 * ở đây trả lại đúng thứ tự đó, và tick được ngay tại chỗ - không phải đi đâu cả.
 *
 * Cố tình chỉ hiện vài việc đầu: sảnh là chỗ liếc qua rồi bắt tay làm, còn xem
 * cả ngày thì đã có Hành Sự Đường. Dài ra thì lại thành một Hành Sự Đường thứ hai.
 */

/** Hiện nhiều nhất ngần này; còn lại đẩy sang Hành Sự Đường. */
const TOI_DA = 4;

export default function TodayList({
  onOpenAll,
  onNew,
  onFocus,
}: {
  onOpenAll: () => void;
  onNew: () => void;
  /** Chạm vào dòng thì vào bế quan với đúng việc ấy */
  onFocus: (task: Task) => void;
}) {
  const { data, toggleDone } = useApp();
  const hom = todayKey();

  const tatCa = sortTasks(tasksOn(data.tasks, hom));
  const chuaXong = tatCa.filter((t) => t.status !== "done");
  const hien = chuaXong.slice(0, TOI_DA);
  const conLai = chuaXong.length - hien.length;
  const xong = tatCa.length - chuaXong.length;

  /*
   * `pointer-events-auto` là bắt buộc: sảnh đặt `pointer-events-none` để bấm
   * xuyên qua xuống lớp cảnh 3D, nên con nào cần bấm phải tự bật lại. Thiếu nó
   * thì danh sách hiện ra bình thường nhưng tick không ăn - lỗi câm, nhìn
   * không thấy.
   */
  return (
    <section className="today-list pointer-events-auto" aria-label="Việc hôm nay">
      <header className="today-list-dau">
        <h2 className="today-list-tieu">Việc hôm nay</h2>
        <span className="today-list-dem">
          {tatCa.length > 0 ? `${xong}/${tatCa.length} xong` : "chưa ghi việc nào"}
        </span>
      </header>

      {hien.length > 0 ? (
        <ul className="today-list-ds">
          {hien.map((t) => (
            <li key={t.id}>
              <Dong task={t} onTick={() => toggleDone(t.id)} onFocus={() => onFocus(t)} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="today-list-trong">
          {tatCa.length > 0
            ? "Xong sạch rồi. Nghỉ ngơi cũng là tu luyện."
            : "Ghi một việc đời thường vào sổ tu hành."}
        </p>
      )}

      <div className="today-list-nut">
        <button type="button" className="today-list-them" onClick={onNew}>
          <Plus className="size-3.5" /> Thêm việc
        </button>
        {(conLai > 0 || tatCa.length > 0) && (
          <button type="button" className="today-list-xem" onClick={onOpenAll}>
            {conLai > 0 ? `Còn ${conLai} việc nữa` : "Xem cả ngày"}
          </button>
        )}
      </div>
    </section>
  );
}

/**
 * Một dòng việc.
 *
 * Hai thao tác, không cần mở gì thêm: bấm ô vuông là xong việc, chạm vào phần
 * còn lại là vào bế quan với việc ấy. Cả hai đều cao 44px - mức tối thiểu cho
 * ngón tay, mà ô tick trước đây chỉ có 24px dù nó là thao tác chính của cả app.
 */
function Dong({
  task,
  onTick,
  onFocus,
}: {
  task: Task;
  onTick: () => void;
  onFocus: () => void;
}) {
  const meta = PRIORITY_META[task.priority];
  return (
    <div className="today-dong">
      <button
        type="button"
        className="today-dong-tick"
        onClick={onTick}
        aria-label={`Đánh dấu hoàn thành: ${task.title}`}
      >
        <span className="today-dong-o" style={{ borderColor: `${meta.color}99` }}>
          <Check className="size-3.5 opacity-0 transition-opacity" />
        </span>
      </button>
      <button
        type="button"
        className="today-dong-than"
        onClick={onFocus}
        aria-label={`Tập trung việc này: ${task.title}`}
      >
        <span className="today-dong-ten">{task.title}</span>
        <span className="today-dong-xp" style={{ color: meta.color }}>
          +{10 * meta.weight}
        </span>
      </button>
    </div>
  );
}
