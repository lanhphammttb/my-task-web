/**
 * Nền tranh thuỷ mặc: quầng sáng, mây khói trôi chậm và mấy tầng núi mờ ở đáy.
 * Toàn bộ là SVG/CSS nội tuyến nên không tốn thêm request nào, và đặt
 * pointer-events-none để không bao giờ cản thao tác.
 */
export default function InkBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden select-none">
      {/* Quầng linh khí phía trên */}
      <div
        className="absolute -top-40 left-1/2 size-[820px] -translate-x-1/2 rounded-full opacity-[0.16] blur-3xl"
        style={{
          backgroundImage:
            'radial-gradient(circle, var(--jade) 0%, color-mix(in oklab, var(--gold) 45%, transparent) 45%, transparent 70%)',
        }}
      />

      {/* Vầng trăng mờ */}
      <div
        className="absolute top-20 right-[12%] size-28 rounded-full opacity-[0.07] blur-[2px]"
        style={{ background: 'var(--gold)' }}
      />

      {/* Hai tầng mây khói trôi ngược chiều nhau */}
      <div className="mist-layer animate-drift absolute inset-0 opacity-[0.05]" />
      <div
        className="mist-layer absolute inset-0 opacity-[0.035]"
        style={{ animation: 'drift 78s linear infinite reverse', backgroundSize: '340px 150px' }}
      />

      {/* Hạt giấy */}
      <div className="paper-grain absolute inset-0 opacity-[0.035] mix-blend-overlay" />

      {/* Núi non xa gần */}
      <svg
        viewBox="0 0 1440 360"
        preserveAspectRatio="none"
        className="absolute inset-x-0 bottom-0 h-[42vh] w-full"
      >
        <path
          d="M0 300 L120 190 L210 245 L330 120 L470 250 L560 200 L690 285 L800 215 L940 300 L1060 205 L1180 265 L1300 175 L1440 280 L1440 360 L0 360 Z"
          fill="currentColor"
          className="text-foreground"
          opacity="0.05"
        />
        <path
          d="M0 330 L150 245 L280 300 L400 210 L520 295 L640 250 L780 320 L900 260 L1030 315 L1160 250 L1290 305 L1440 235 L1440 360 L0 360 Z"
          fill="currentColor"
          className="text-foreground"
          opacity="0.07"
        />
        <path
          d="M0 360 L110 305 L240 345 L370 295 L500 340 L640 300 L770 348 L900 305 L1040 345 L1180 300 L1320 340 L1440 300 L1440 360 Z"
          fill="currentColor"
          className="text-foreground"
          opacity="0.1"
        />
      </svg>
    </div>
  );
}
