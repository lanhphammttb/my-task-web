import type { TechniqueId } from "../../lib/techniques";
import { cn } from "@/lib/utils";

/**
 * Ấn công pháp.
 *
 * Bốn thẻ công pháp trước đây chỉ có chữ, nên nhìn lướt thì bốn cái y hệt nhau
 * và phải đọc mới phân biệt được. Một con dấu mang chữ Hán riêng cho mỗi pháp
 * là thứ nhận ra nhanh nhất - đúng chất môn phái, mà không cần tới ảnh vẽ.
 */
const GLYPH: Record<TechniqueId, string> = {
  thuy_van: "水",
  kim_cang: "金",
  hau_tho: "土",
  pha_chap: "破",
};

export default function TechniqueSeal({
  id,
  tone,
  active = false,
  size = 46,
  className,
}: {
  id: TechniqueId;
  tone: string;
  /** Pháp đang tu thì con dấu sáng lên và có vòng linh khí quay quanh */
  active?: boolean;
  size?: number;
  className?: string;
}) {
  return (
    <span
      style={{
        width: size,
        height: size,
        background: `radial-gradient(120% 120% at 50% 0%, ${tone}${active ? "55" : "33"}, ${tone}10)`,
        borderColor: `${tone}${active ? "99" : "55"}`,
        boxShadow: active
          ? `inset 0 0 ${size * 0.3}px ${tone}44, 0 0 ${size * 0.26}px ${tone}55`
          : `inset 0 0 ${size * 0.26}px ${tone}22`,
      }}
      className={cn(
        "relative grid shrink-0 place-items-center rounded-md border",
        className,
      )}
    >
      {/* Vòng linh khí quay chậm, chỉ có ở pháp đang tu */}
      {active && (
        <span
          aria-hidden="true"
          className="animate-[qi-spin_24s_linear_infinite] absolute inset-1 rounded-full border border-dashed"
          style={{ borderColor: `${tone}66` }}
        />
      )}
      <span
        className="font-title leading-none font-bold"
        style={{ color: tone, fontSize: size * 0.5 }}
      >
        {GLYPH[id]}
      </span>
    </span>
  );
}
