import { Flame, Lock, Moon, ShieldAlert, Sun } from "lucide-react";
import { useApp } from "../../store/AppStore";
import { cultivationOf } from "../../lib/cultivation";
import { effectiveXp, progressOf, stoneBalance } from "../../lib/economy";
import { currentStreak } from "../../lib/stats";
import { PILL_ORDER } from "../../lib/pills";
import { railSrc } from "../../lib/icons";
import ArtImage from "../ArtImage";

/**
 * HUD trên cùng theo đúng bố cục của Tiên Ma Giới: cụm nhân vật bên trái
 * (ảnh đại diện, đạo hiệu, cảnh giới, thanh tu vi), cụm tài nguyên bên phải.
 * Lớp bọc không nhận chuột để nền cảnh phía sau vẫn kéo/thả được.
 */
export default function HeaderHUD({ onSettings }: { onSettings: () => void }) {
  const { data, audit, updateSettings } = useApp();
  const xp = effectiveXp(data);
  const c = cultivationOf(xp);
  const progress = progressOf(data);
  const stones = stoneBalance(data);
  const streak = currentStreak(data.tasks);
  const pills = PILL_ORDER.reduce((s, g) => s + (data.pills[g] ?? 0), 0);
  const isDark = data.settings.theme === "dark";
  // Ảnh đại diện đổi theo bốn mốc cảnh giới; chưa có file thì dùng ảnh chung.
  const avatarTier =
    c.realmIndex <= 1 ? 1 : c.realmIndex <= 4 ? 2 : c.realmIndex <= 7 ? 3 : 4;

  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-2 p-2 sm:p-3">
      {/* ------------------------------------------------ cụm đạo nhân bên trái */}
      <div className="glass-panel pointer-events-auto flex max-w-[62vw] items-center gap-2.5 rounded-full py-1.5 pr-3.5 pl-1.5 sm:gap-3">
        <span className="relative shrink-0">
          <ArtImage
            src={`/art/avatar/avatar-${avatarTier}.png`}
            alt=""
            className="border-gold/70 size-10 rounded-full border object-cover sm:size-11"
          />
          <span
            className="border-background absolute -right-0.5 -bottom-0.5 grid size-4.5 place-items-center rounded-full border text-[9px] font-bold text-black"
            style={{ background: c.realm.color }}
          >
            {c.ascended ? "仙" : c.tier}
          </span>
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <strong className="font-title truncate text-[12px] font-bold tracking-wide">
              {data.settings.daoName || "Vô Danh Đạo Hữu"}
            </strong>
            <span
              className="shrink-0 rounded-sm px-1.5 py-px text-[9.5px] font-bold"
              style={{
                background: `color-mix(in oklab, ${c.realm.color} 22%, transparent)`,
                color: c.realm.color,
              }}
            >
              {c.ascended ? "PHI THĂNG" : `${c.realm.name} ${c.tier}`}
            </span>
            {streak > 0 && (
              <span className="text-p-urgent flex shrink-0 items-center gap-0.5 text-[10px] font-bold">
                <Flame className="size-3" />
                {streak}
              </span>
            )}
          </div>

          {/* Thanh tu vi kiểu thanh máu trong game */}
          <div className="mt-1 flex items-center gap-1.5">
            <div className="hud-bar h-2 w-28 sm:w-40">
              <span style={{ width: `${Math.round(c.ratio * 100)}%` }} />
            </div>
            <span className="text-muted-foreground tabular text-[9.5px] whitespace-nowrap">
              {c.ascended ? "viên mãn" : `${c.into}/${c.need}`}
            </span>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------- cụm tài nguyên bên phải */}
      <div className="pointer-events-auto flex flex-col items-end gap-1.5">
        <div className="flex items-center gap-1.5">
          <span className="glass-panel flex items-center gap-1.5 rounded-full py-1 pr-2.5 pl-1.5">
            <ArtImage
              src={railSrc("linh-thach")}
              alt=""
              className="size-5 object-contain"
            />
            <span className="text-gold-bright tabular text-[12px] font-bold">
              {stones}
            </span>
          </span>
          <span
            className="glass-panel flex items-center gap-1.5 rounded-full py-1 pr-2.5 pl-1.5"
            title="Đan dược trong túi"
          >
            <img src="/art/pill/trung.png" alt="" className="size-5" />
            <span className="text-gold-bright tabular text-[12px] font-bold">
              {pills}
            </span>
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {progress.held > 0 && (
            <span
              className="glass-panel text-p-urgent flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold"
              title={`${progress.held} tu vi đang bị cảnh giới chặn lại. Độ kiếp thành công là mở khoá hết.`}
            >
              <Lock className="size-3" />
              {progress.held} bị chặn
            </span>
          )}
          {!audit.ok && (
            <span
              className="glass-panel text-p-urgent flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold"
              title="Sổ ghi tu luyện có dấu hiệu bị sửa"
            >
              <ShieldAlert className="size-3" />
              Sổ lệch
            </span>
          )}
          <button
            type="button"
            onClick={() => updateSettings({ theme: isDark ? "light" : "dark" })}
            aria-label="Đổi ngày/đêm"
            title="Đổi ngày/đêm"
            className="glass-panel text-gold hover:text-gold-bright grid size-8 place-items-center rounded-full transition-colors"
          >
            {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
          <button
            type="button"
            onClick={onSettings}
            aria-label="Cài đặt"
            title="Cài đặt"
            className="glass-panel hover:scale-105 grid size-8 place-items-center rounded-full transition-transform"
          >
            <ArtImage
              src={railSrc("cai-dat")}
              alt=""
              className="size-5 object-contain"
            />
          </button>
        </div>
      </div>
    </header>
  );
}
