import type { Herb, HerbId } from "../../lib/field";
import { cn } from "@/lib/utils";

/**
 * Cây linh thảo vẽ bằng SVG, lớn dần theo tiến độ của ô đất.
 *
 * Trước đây ô đất chỉ là cái khung có tên cây và một thanh phần trăm - đọc thì
 * biết cây đang lớn, nhưng **nhìn** thì chẳng thấy gì lớn cả. Nuôi trồng mà
 * không thấy cây thì không phải nuôi trồng.
 *
 * Cố tình vẽ chứ không dùng ảnh: mỗi loại cần cả một dải hình từ lúc nhú mầm
 * tới lúc chín (bốn loại × nhiều chặng), mà vẽ thì một hàm lo hết, lại nét ở
 * mọi cỡ và ăn đúng màu `tone` của từng loại.
 */
export default function HerbPlant({
  herb,
  ratio,
  size = 68,
  bare = false,
  className,
}: {
  herb: Herb;
  /** 0..1 - cây lớn tới đâu */
  ratio: number;
  size?: number;
  /** Bỏ ụ đất và quầng sáng - dùng cho chỗ chật như con chip trong túi thuốc */
  bare?: boolean;
  className?: string;
}) {
  const r = Math.max(0, Math.min(1, ratio));
  const ready = r >= 1;
  const tone = herb.tone;

  // Lá và hoa hiện dần chứ không bật ra: mỗi chặng có ngưỡng riêng.
  const fade = (from: number, to: number) =>
    Math.max(0, Math.min(1, (r - from) / (to - from)));

  // Vừa gieo xong mà thu nhỏ dáng cây thật thì nó bé bằng hạt bụi, nhìn ra
  // đúng cái ô trống. Nên chặng đầu vẽ riêng một cái mầm cỡ thật, rồi mới
  // chuyển giao cho dáng cây - hai lớp chồng nhau ở quãng giữa.
  const sprout = 1 - fade(0.04, 0.22);
  const body = fade(0.06, 0.26);
  const grow = 0.45 + 0.55 * r;

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      aria-hidden="true"
      className={cn("shrink-0 overflow-visible", className)}
    >
      <defs>
        <radialGradient id={`halo-${herb.id}`} cx="50%" cy="55%" r="50%">
          <stop offset="0%" stopColor={tone} stopOpacity="0.5" />
          <stop offset="100%" stopColor={tone} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Quầng sáng chỉ bật khi cây đã chín - đó là tín hiệu "hái được rồi" */}
      {ready && !bare && (
        <circle
          cx="50"
          cy="58"
          r="46"
          fill={`url(#halo-${herb.id})`}
          className="animate-[glow_2.4s_ease-in-out_infinite]"
        />
      )}

      {/* --------------------------------------------------------- ụ đất */}
      {!bare && (
        <>
          <ellipse cx="50" cy="88" rx="30" ry="7" fill="#2a1f16" />
          <ellipse cx="50" cy="86.5" rx="26" ry="5.5" fill="#3b2c1f" />
          <circle cx="34" cy="87" r="1.6" fill="#57432f" />
          <circle cx="63" cy="88.5" r="1.2" fill="#57432f" />
          <circle cx="55" cy="85.5" r="1" fill="#57432f" />
        </>
      )}

      {/* ------------------------------------------------------------ mầm */}
      {sprout > 0 && (
        <g opacity={sprout}>
          <path
            d="M50 86 C 50 80, 50 76, 50 72"
            stroke="#7fae62"
            strokeWidth="2.4"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M50 76 C 44 75, 40 71, 39 67 C 45 68, 49 71, 50 76 Z"
            fill="#7fae62"
          />
          <path
            d="M50 74 C 56 73, 60 69, 61 65 C 55 66, 51 69, 50 74 Z"
            fill="#93c073"
          />
        </g>
      )}

      {/* --------------------------------------------------------- thân cây */}
      <g
        opacity={body}
        style={{
          transform: `scale(${grow})`,
          transformOrigin: "50px 87px",
          transition: "transform 600ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
        className={
          ready ? "animate-[float-soft_3.4s_ease-in-out_infinite]" : undefined
        }
      >
        <Body herb={herb.id} tone={tone} fade={fade} />
      </g>

      {/* Hạt linh khí bốc lên từ cây đã chín */}
      {ready &&
        !bare &&
        [0, 1, 2].map((i) => (
          <circle
            key={i}
            cx={38 + i * 12}
            cy={62}
            r="1.6"
            fill={tone}
            opacity="0.8"
            className="animate-[float-soft_3.4s_ease-in-out_infinite]"
            style={{ animationDelay: `${i * 0.7}s` }}
          />
        ))}
    </svg>
  );
}

/** Dáng riêng của từng loại - đủ khác nhau để liếc qua là nhận ra. */
function Body({
  herb,
  tone,
  fade,
}: {
  herb: HerbId;
  tone: string;
  fade: (from: number, to: number) => number;
}) {
  const leafFade = fade(0.15, 0.5);
  const topFade = fade(0.55, 0.95);

  if (herb === "thanh_diep") {
    // Bụi cỏ: mấy lá dẹt xoè ra, lá ngoài mọc sau lá trong.
    return (
      <g fill={tone}>
        <path d="M50 87 C 50 70, 50 58, 50 44 C 53 58, 53 72, 51 87 Z" />
        <path
          d="M50 87 C 44 74, 36 66, 28 60 C 39 64, 47 74, 50 87 Z"
          opacity={leafFade}
        />
        <path
          d="M50 87 C 56 74, 64 66, 72 60 C 61 64, 53 74, 50 87 Z"
          opacity={leafFade}
        />
        <path
          d="M50 87 C 47 70, 42 54, 36 42 C 46 52, 51 70, 51 87 Z"
          opacity={topFade}
        />
        <path
          d="M50 87 C 53 70, 58 54, 64 42 C 54 52, 49 70, 49 87 Z"
          opacity={topFade}
        />
      </g>
    );
  }

  if (herb === "huyet_tinh") {
    // Hoa đơn: một cọng thẳng, hai lá, bông nở trên đỉnh.
    return (
      <g>
        <path
          d="M49 87 C 48 70, 49 56, 50 42"
          stroke="#4e7d46"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
        <g opacity={leafFade} fill="#4e7d46">
          <path d="M49 72 C 40 70, 34 63, 32 56 C 41 58, 47 64, 49 72 Z" />
          <path d="M50 64 C 59 62, 65 55, 67 48 C 58 50, 52 56, 50 64 Z" />
        </g>
        <g opacity={topFade} fill={tone}>
          <ellipse cx="50" cy="34" rx="7" ry="10" />
          <ellipse
            cx="40"
            cy="40"
            rx="9"
            ry="6"
            transform="rotate(-28 40 40)"
          />
          <ellipse cx="60" cy="40" rx="9" ry="6" transform="rotate(28 60 40)" />
          <circle cx="50" cy="41" r="4" fill="#ffe9a8" />
        </g>
      </g>
    );
  }

  if (herb === "kim_tuy") {
    // Nấm: cuống mập, mũ vòm, chấm vàng trên mũ.
    return (
      <g>
        <path
          d="M44 87 C 43 74, 44 66, 46 58 L 56 58 C 58 66, 59 74, 58 87 Z"
          fill="#d8cbb0"
          opacity={Math.max(0.35, leafFade)}
        />
        <g opacity={topFade}>
          <path d="M26 58 C 26 38, 74 38, 74 58 Z" fill={tone} />
          <path d="M26 58 C 40 63, 60 63, 74 58 Z" fill="#a87c25" />
          <circle cx="40" cy="50" r="3" fill="#fff1c2" opacity="0.85" />
          <circle cx="56" cy="46" r="2.4" fill="#fff1c2" opacity="0.85" />
          <circle cx="64" cy="53" r="1.8" fill="#fff1c2" opacity="0.7" />
        </g>
      </g>
    );
  }

  // tu_van - sâm: củ phình dưới đất, hai chân rẽ, tán lá trên đầu.
  return (
    <g>
      <g opacity={Math.max(0.4, leafFade)}>
        <path
          d="M50 84 C 42 82, 40 72, 44 64 C 47 58, 53 58, 56 64 C 60 72, 58 82, 50 84 Z"
          fill="#e8dcc0"
        />
        <path
          d="M46 82 C 43 87, 41 90, 39 93"
          stroke="#e8dcc0"
          strokeWidth="2.4"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M54 82 C 57 87, 59 90, 61 93"
          stroke="#e8dcc0"
          strokeWidth="2.4"
          fill="none"
          strokeLinecap="round"
        />
      </g>
      <path
        d="M50 62 C 50 54, 50 48, 50 42"
        stroke="#6a8f52"
        strokeWidth="2.6"
        fill="none"
        strokeLinecap="round"
        opacity={leafFade}
      />
      <g opacity={topFade} fill={tone}>
        <ellipse cx="50" cy="32" rx="6" ry="9" />
        <ellipse
          cx="36"
          cy="38"
          rx="10"
          ry="5.5"
          transform="rotate(-34 36 38)"
        />
        <ellipse
          cx="64"
          cy="38"
          rx="10"
          ry="5.5"
          transform="rotate(34 64 38)"
        />
        <circle cx="50" cy="24" r="3" fill="#ffe9a8" opacity="0.9" />
      </g>
    </g>
  );
}
