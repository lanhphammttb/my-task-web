import { useState } from "react";
import type { Element } from "../lib/spirit";
import { ELEMENTS } from "../lib/spirit";
import { cn } from "@/lib/utils";

/** Chữ Hán của ngũ hành - dấu hiệu nhận biết mạnh nhất, không cần ảnh. */
const GLYPH: Record<Element, string> = {
  kim: "金",
  moc: "木",
  thuy: "水",
  hoa: "火",
  tho: "土",
};

/**
 * Ấn ngũ hành. Trước đây chỗ này mượn ảnh "công pháp" của game gốc - sai nghĩa
 * và có chữ nung sẵn trong ảnh. Vẽ bằng chữ Hán vừa đúng, vừa nét ở mọi cỡ.
 */
export default function ElementSeal({
  element,
  size = 44,
  className,
}: {
  element: Element;
  size?: number;
  className?: string;
}) {
  const meta = ELEMENTS[element];
  // Có ảnh riêng trong public/art/element thì dùng ảnh, không thì vẽ chữ Hán.
  const [hasArt, setHasArt] = useState(true);

  return (
    <span
      title={`Hệ ${meta.label}`}
      style={{
        width: size,
        height: size,
        // Có tranh thật thì để tranh tự nói; chỉ khi vẽ chữ Hán mới cần nền màu.
        background: hasArt
          ? "transparent"
          : `radial-gradient(120% 120% at 50% 0%, ${meta.color}44, ${meta.color}14)`,
        borderColor: hasArt ? `${meta.color}55` : `${meta.color}80`,
        boxShadow: hasArt
          ? `0 0 ${size * 0.24}px ${meta.color}3a`
          : `inset 0 0 ${size * 0.3}px ${meta.color}33, 0 0 ${size * 0.22}px ${meta.color}33`,
      }}
      className={cn(
        "relative grid shrink-0 place-items-center rounded-md border",
        className,
      )}
    >
      {hasArt ? (
        <img
        loading="lazy"
        decoding="async"
          src={`/art/element/${element}.png`}
          alt=""
          onError={() => setHasArt(false)}
          className="h-full w-full rounded-md object-contain p-0.5"
        />
      ) : (
        <span
          className="font-heading tone leading-none font-bold"
          style={{
            color: meta.color,
            fontSize: size * 0.5,
            textShadow: `0 0 ${size * 0.18}px ${meta.color}66`,
          }}
        >
          {GLYPH[element]}
        </span>
      )}
      {/* Nhãn chữ chỉ cần khi không có tranh - có tranh thì nó đè lên hình. */}
      {!hasArt && (
        <span
          className="tone absolute right-1 bottom-0.5 leading-none font-bold tracking-wide uppercase opacity-70"
          style={{ color: meta.color, fontSize: Math.max(7, size * 0.16) }}
        >
          {meta.label}
        </span>
      )}
    </span>
  );
}
