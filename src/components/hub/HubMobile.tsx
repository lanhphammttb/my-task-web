import { Check, Plus, Sparkles, Timer, Zap } from "lucide-react";
import type { Task, ViewKey } from "../../types";
import { useApp } from "../../store/AppStore";
import { useFocusTimer } from "../../store/FocusTimer";
import { todayKey } from "../../lib/date";
import { sortTasks, tasksOn } from "../../lib/stats";
import { progressOf } from "../../lib/economy";
import { ASCENSION_INDEX, REALMS, cultivationOf } from "../../lib/cultivation";
import { theDaoNhan } from "../../lib/room";
import { PRIORITY_META } from "../../types";
import ArtImage from "../ArtImage";

/**
 * Sảnh trên điện thoại - dựng riêng, không phải bản co lại của màn rộng.
 *
 * Bản dùng chung trước đây xếp dọc bốn khối: danh sách việc, châm ngôn, vòng tu
 * vi, nút hành động. Trên màn 390 thì nó thành một trang web quản lý việc tô
 * màu tối: hai thẻ xám đặc che gần hết bức tranh nền, nhân vật thu bằng con
 * tem, còn thao tác chính là một ô vuông tick.
 *
 * Ở đây đảo lại thứ tự ưu tiên cho đúng một cái game:
 *
 *  - CẢNH là nền thật, không bị thẻ che. Nhìn vào biết mình đang ở đâu.
 *  - NHÂN VẬT đứng giữa cảnh, to, và đổi tư thế theo việc đang làm.
 *  - VIỆC CẦN LÀM nổi lên trên cảnh như bảng nhiệm vụ, không phải một thẻ xám.
 *
 * Ba thứ bị bỏ hẳn ở đây vì chúng LẶP:
 *
 *  - vòng tu vi: thanh đầu đã ghi "Luyện Khí 1" và thanh tu vi 0/50;
 *  - thẻ châm ngôn: giữ đúng một dòng chữ nghiêng đặt trên cảnh, bỏ cái khung;
 *  - dòng "còn N tu vi nữa": thanh đầu đã hiện đúng con số ấy.
 */

/** Hiện nhiều nhất ngần này việc; còn lại đẩy sang Hành Sự Đường. */
const TOI_DA = 3;

export default function HubMobile({
  onTribulation,
  onAwaken,
  onExplore,
  onFocusTask,
  onNew,
}: {
  onTribulation: () => void;
  onAwaken: () => void;
  onExplore: (view: ViewKey, anchor?: string) => void;
  onFocusTask: (task: Task) => void;
  onNew: () => void;
}) {
  const { data, toggleDone } = useApp();
  const timer = useFocusTimer();
  const hom = todayKey();

  const tatCa = sortTasks(tasksOn(data.tasks, hom));
  const chuaXong = tatCa.filter((t) => t.status !== "done");
  const hien = chuaXong.slice(0, TOI_DA);
  const conLai = chuaXong.length - hien.length;
  const xong = tatCa.length - chuaXong.length;

  const progress = progressOf(data);
  const c = cultivationOf(progress.xp);
  const ready = progress.readyForTribulation;
  const nextRealm = REALMS[Math.min(ASCENSION_INDEX, progress.gateRealm + 1)];

  const dangBeQuan = timer.inSession || timer.mode === "break";
  const the = theDaoNhan(data);

  return (
    <main aria-label="Sảnh tu luyện" className="hub-mb">
      <h1 className="sr-only">Sơn Môn</h1>

      {/* ------------------------------------------------------------ cảnh */}
      {/* Nhân vật đứng trong chính bức tranh nền, không đứng trong một cái thẻ.
          Đây là chỗ khác biệt lớn nhất so với bản cũ: cảnh được nhìn thấy. */}
      <div className="hub-mb-canh">
        <ArtImage
          src={`/art/chibi/${ready ? "breakthrough" : the.file}.png`}
          alt=""
          title={the.mo}
          className="hub-mb-nguoi animate-float"
        />
      </div>

      {/* --------------------------------------------------------- bảng việc */}
      <section className="hub-mb-bang" aria-label="Việc hôm nay">
        <header className="hub-mb-dau">
          <span className="hub-mb-ten">Nhật Khoá</span>
          <span className="hub-mb-dem">
            {tatCa.length > 0 ? `${xong}/${tatCa.length}` : "trống"}
          </span>
        </header>

        {/* Đang bế quan dở thì đó là việc gấp nhất, đứng trên cả danh sách. */}
        {dangBeQuan && (
          <button
            type="button"
            className="hub-mb-quay"
            onClick={() => onExplore("focus")}
          >
            <Timer className="size-4 shrink-0" />
            Về phiên bế quan
          </button>
        )}

        {hien.length > 0 ? (
          <ul className="hub-mb-ds">
            {hien.map((t) => {
              const meta = PRIORITY_META[t.priority];
              return (
                <li key={t.id} className="hub-mb-dong">
                  <button
                    type="button"
                    className="hub-mb-tick"
                    onClick={() => toggleDone(t.id)}
                    aria-label={`Đánh dấu hoàn thành: ${t.title}`}
                  >
                    {/* Vòng tròn chứ không phải ô vuông: ô vuông là biểu mẫu,
                        vòng tròn là nút bấm trong game. */}
                    <span
                      className="hub-mb-o"
                      style={{ borderColor: meta.color }}
                    >
                      <Check className="size-4 opacity-0" />
                    </span>
                  </button>
                  <button
                    type="button"
                    className="hub-mb-than"
                    onClick={() => onFocusTask(t)}
                    aria-label={`Tập trung việc này: ${t.title}`}
                  >
                    <span className="hub-mb-tieu">{t.title}</span>
                    <span className="hub-mb-xp" style={{ color: meta.color }}>
                      +{10 * meta.weight}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="hub-mb-trong">
            {tatCa.length > 0
              ? "Xong sạch. Nghỉ cũng là tu."
              : "Ghi một việc vào sổ tu hành."}
          </p>
        )}

        <div className="hub-mb-nut">
          <button type="button" className="hub-mb-them" onClick={onNew}>
            <Plus className="size-4" /> Ghi việc
          </button>
          {tatCa.length > 0 && (
            <button
              type="button"
              className="hub-mb-xem"
              onClick={() => onExplore("today")}
            >
              {conLai > 0 ? `Còn ${conLai}` : "Cả ngày"}
            </button>
          )}
        </div>
      </section>

      {/* ------------------------------------------------------ việc gấp nhất */}
      {/* Chỉ hiện khi thật sự có: độ kiếp, hoặc chưa khai quang linh căn. Không
          có thì chỗ này trả lại cho cảnh chứ không để một nút xám nằm đó. */}
      {ready ? (
        <button type="button" className="hub-mb-chinh" onClick={onTribulation}>
          <Zap className="size-4" />
          Độ kiếp lên {nextRealm.name}
        </button>
      ) : !data.root ? (
        <button type="button" className="hub-mb-chinh" onClick={onAwaken}>
          <Sparkles className="size-4" />
          Khai quang linh căn
        </button>
      ) : null}

      <p className="sr-only">
        Cảnh giới {c.realm.name} tầng {c.tier}
      </p>
    </main>
  );
}
