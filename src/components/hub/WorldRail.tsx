import { useMemo } from "react";
import type { ViewKey } from "../../types";
import { useApp } from "../../store/AppStore";
import { todayKey } from "../../lib/date";
import { currentStreak, dayStats, isOverdue } from "../../lib/stats";
import { stoneBalance, verifiedFocusMinutes, verifiedTaskCount } from "../../lib/economy";
import { plotState } from "../../lib/field";
import { expeditionState } from "../../lib/expedition";
import { missionState } from "../../lib/sect";
import { chestsForDay, pendingChests } from "../../lib/chest";
import { isPerfectDay } from "../../lib/achievements";
import { nextCave } from "../../lib/cave";
import { railSrc } from "../../lib/icons";
import type { RailIcon } from "../../lib/icons";
import ArtImage from "../ArtImage";
import { cn } from "@/lib/utils";

/**
 * Dãy nút tròn bên phải - lối đi chính của cả app.
 *
 * Trước đây điều hướng là ba tầng tab: năm tab lớn dưới đáy, trong Hành Sự lại
 * ba tab nhỏ (Nhật/Tuần/Nguyệt Khoá), rồi trong Động Phủ là tám mục gập. Tên
 * các khu đều là từ Hán Việt hai âm nghe na ná nhau nên không ai nhớ nổi cái gì
 * nằm đâu.
 *
 * Thanh tab dưới đáy là kiểu của app công việc. Game tu tiên thì để **nút tròn
 * dọc mép phải**, và đó là thứ người dùng yêu cầu. Cách này còn hơn ở chỗ:
 *
 *  - nút tròn có ảnh riêng nên nhận ra bằng MẮT, không phải đọc chữ;
 *  - dựng dọc thì thêm nơi mới không phải bóp chữ lại cho vừa hàng ngang;
 *  - chừa trọn phần giữa màn cho nhân vật và cảnh - thứ làm nên không khí.
 *
 * Mỗi nút tự báo đang có gì chờ mình. Đó là thứ biến một cái menu thành chỗ
 * đáng ghé: nhìn lướt thấy chỗ nào sáng đèn thì vào, giống hệt mở game ra.
 */

interface Noi {
  view: ViewKey;
  /** Neo cuộn tới đúng mục bên trong, nếu có */
  anchor?: string;
  ten: string;
  /** Nói thẳng nơi này để làm gì - nhớ được là nhờ dòng này, không nhờ cái tên */
  phuDe: string;
  icon: RailIcon;
  /** Số hiện trên huy hiệu; 0 thì không hiện */
  so?: number;
  /** Có việc đáng làm ngay - sáng đèn lên */
  goi?: boolean;
}

export default function WorldRail({
  view,
  onSelect,
}: {
  view: ViewKey | null;
  onSelect: (view: ViewKey, anchor?: string) => void;
}) {
  const { data } = useApp();

  const noi = useMemo<Noi[]>(() => {
    const hom = todayKey();
    const s = dayStats(data.tasks, data.sessions, hom);
    const conLai = s.total - s.done;
    const tre = data.tasks.filter(isOverdue).length;

    const focus = verifiedFocusMinutes(data);
    const chin = data.field.filter((p) => plotState(p, focus)?.ready).length;
    const trip = data.expedition
      ? expeditionState(data.expedition, verifiedTaskCount(data))
      : null;
    const mission = data.mission
      ? missionState(data.mission, verifiedTaskCount(data), focus)
      : null;
    const hom_ = pendingChests(
      chestsForDay(hom, s.done, s.focusMin, isPerfectDay(data.tasks, hom), data.chestsOpened),
    );
    const len = nextCave(data.caveLevel);
    const duTien = !!len && stoneBalance(data) >= len.cost;
    const nguyen = data.goals.filter((g) => !g.archived).length;

    return [
      {
        view: "today",
        ten: "Hành Sự Đường",
        phuDe: "Nơi cày nhiệm vụ mỗi ngày",
        icon: "nhat-khoa",
        so: conLai + tre,
        goi: conLai > 0 || tre > 0,
      },
      {
        view: "focus",
        ten: "Bế Quan Động",
        phuDe: "Ngồi thiền, tính giờ tập trung",
        icon: "be-quan",
      },
      {
        view: "today",
        anchor: "today-chest",
        ten: "Hòm Kỳ Ngộ",
        phuDe: "Phần thưởng cho việc đã làm",
        icon: "linh-thach",
        so: hom_,
        goi: hom_ > 0,
      },
      {
        view: "cave",
        anchor: "cave-field",
        ten: "Linh Điền",
        phuDe: "Trồng linh thảo bằng phút bế quan",
        icon: "chieu-thu",
        so: chin,
        goi: chin > 0,
      },
      {
        view: "cave",
        ten: "Động Phủ",
        phuDe: "Linh căn, công pháp, lò đan, linh thú",
        icon: "dong-phu",
        goi: !data.root || duTien,
      },
      {
        view: "awards",
        ten: "Tiên Lộ",
        phuDe: "Cảnh giới, thành tựu, bí cảnh",
        icon: "tien-lo",
        goi: !!mission?.met || !!trip?.ready,
      },
      {
        view: "goals",
        ten: "Đại Nguyện",
        phuDe: "Mục tiêu dài hạn của đời tu",
        icon: "linh-can",
        so: nguyen,
      },
      {
        view: "stats",
        ten: "Tu Hành Lục",
        phuDe: `Sổ chép đường tu · chuỗi ${currentStreak(data.tasks)} ngày`,
        icon: "thong-ke",
      },
    ];
  }, [data]);

  return (
    <nav className="world-rail" aria-label="Các nơi trong tiên giới">
      {noi.map((n) => (
        <button
          key={`${n.view}-${n.ten}`}
          type="button"
          className={cn(
            "world-rail-nut",
            n.goi && "world-rail-goi",
            view === n.view && "world-rail-dang-o",
          )}
          onClick={() => onSelect(n.view, n.anchor)}
          /* Tên và phụ đề gộp vào một nhãn: người dùng bộ đọc màn hình chỉ nghe
             một lần là biết nơi này là gì, khỏi phải dò quanh. */
          aria-label={`${n.ten} — ${n.phuDe}`}
          title={`${n.ten} — ${n.phuDe}`}
        >
          <span className="world-rail-vien">
            <ArtImage
              src={railSrc(n.icon)}
              alt=""
              decoding="async"
              className="world-rail-anh"
            />
            {!!n.so && n.so > 0 && <span className="world-rail-so">{n.so > 9 ? "9+" : n.so}</span>}
          </span>
          <span className="world-rail-ten">{n.ten}</span>
        </button>
      ))}
    </nav>
  );
}
