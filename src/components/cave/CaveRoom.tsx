import { useMemo } from "react";
import { useApp } from "../../store/AppStore";
import { caveAt, nextCave } from "../../lib/cave";
import {
  CHO_TREO,
  SO_DEN,
  denSang,
  dungTrongPhong,
  monTiepTheo,
  nenPhong,
  nenPhongLui,
} from "../../lib/room";
import { activeBeast } from "../../lib/economy";
import { beastById } from "../../lib/beasts";
import { theDaoNhan } from "../../lib/room";
import ArtImage from "../ArtImage";

/**
 * Căn phòng của người tu, dựng bằng nhiều lớp chồng lên nhau.
 *
 * Đây là câu trả lời cho "nâng bậc động phủ chỉ đổi mỗi cái ảnh thì chán".
 * Nền phòng lo chuyện rộng hẹp, còn từng món đồ là một lớp riêng chỉ hiện khi
 * đã sắm được - nên mở khoá bất cứ thứ gì cũng nhìn thấy nó xuất hiện trong
 * nhà mình, thay vì chỉ thấy một con số nhích lên trong bảng.
 *
 * Đèn lồng là lớp đổi hằng ngày: xong việc là về nhà thấy thêm đèn cháy. Không
 * có nó thì căn phòng chỉ đổi vài tháng một lần, tức là gần như đứng yên.
 *
 * Mọi lớp đều qua `ArtImage`, nên thiếu file ảnh thì lớp đó im lặng biến mất
 * chứ không vỡ bố cục. Danh sách file cần vẽ nằm ở `public/art/prop/README.md`.
 */
export default function CaveRoom({
  onGo,
  tab,
}: {
  /** Bấm vào một món đồ thì mở mục quản nó */
  onGo?: (anchor: string) => void;
  /** Mục đang xem - đạo nhân trong phòng đổi tư thế theo nó */
  tab?: string;
}) {
  const { data } = useApp();
  const bac = caveAt(data.caveLevel);
  const sau = nextCave(data.caveLevel);
  const do_ = useMemo(() => dungTrongPhong(data), [data]);
  const sang = denSang(data);
  const sapCo = useMemo(() => monTiepTheo(data), [data]);
  const owned = activeBeast(data);
  const beast = owned ? beastById(owned.id) : undefined;
  const the = theDaoNhan(data, tab);

  /*
    Dải chữ dựng riêng vì hai cỡ màn đặt nó ở HAI CHỖ khác nhau.

    Màn rộng: đè lên đáy tranh, đẹp và không tốn thêm chiều cao.
    Màn hẹp: nằm hẳn dưới khung phòng. Ở đó tranh chỉ cao hơn hai trăm px, mà
    đồ đạc và đạo nhân đều đứng ở khoảng 80-88% chiều cao - tức là đúng dải bị
    chữ che. Che mất đồ đạc thì căn phòng không còn lý do tồn tại.
  */
  const chu = (
    <>
      <div className="min-w-0 text-left">
        <p className="font-title text-gold-bright text-[11px] font-bold tracking-[0.18em] uppercase">
          Bậc {bac.level} · {bac.name}
        </p>
        <p className="text-[10.5px] text-white/70">
          {sang}/{SO_DEN} đèn sáng · {do_.length} món trong phòng
        </p>
      </div>
      {/* Nói thẳng món kế tiếp sắm được là gì: đó là lý do để cày tiếp. */}
      {sapCo && (
        <p className="shrink-0 text-left text-[10.5px] text-white/70 sm:text-right">
          Sắp có: <b className="text-gold-bright">{sapCo.ten}</b>
          <span className="text-white/55"> · {sapCo.dieuKien}</span>
        </p>
      )}
      {!sapCo && sau && (
        <p className="shrink-0 text-left text-[10.5px] text-white/70 sm:text-right">
          Bậc sau: <b className="text-gold-bright">{sau.name}</b>
        </p>
      )}
    </>
  );

  return (
    <section
      aria-label={`Động phủ bậc ${bac.level}: ${bac.name}`}
      className="border-gold/30 overflow-hidden rounded-xl border shadow-[0_10px_40px_rgba(0,0,0,0.5)]"
    >
    <div
      /* Điện thoại dùng khung 4:3 chứ không 16:9: rộng 292px thì 16:9 chỉ cao
         164px, mà dải chữ dưới đáy đã ăn mất 45px - còn lại không đủ thấy sàn,
         tức là không thấy đồ đạc lẫn đạo nhân, đúng thứ căn phòng sinh ra để
         khoe. Màn rộng thì 16:9 mới đẹp vì bề ngang đã đủ lớn. */
      className="relative aspect-[4/3] w-full overflow-hidden sm:aspect-video"
    >
      {/* --------------------------------------------------------- nền phòng */}
      {/* Chưa có nền 16:9 riêng thì lùi về tranh vuông của bậc đó: bị cắt trên
          dưới nhưng vẫn ra đúng căn phòng, hơn hẳn một mảng đen. */}
      <ArtImage
        src={nenPhong(data.caveLevel)}
        fallback={nenPhongLui(data.caveLevel)}
        alt=""
        className="animate-slow-zoom absolute inset-0 h-full w-full object-cover"
      />

      {/* Phủ tối nhẹ bốn cạnh để đồ đạc và chữ nổi lên khỏi nền */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 50% 40%, transparent 30%, rgba(0,0,0,0.5) 100%)",
        }}
      />

      {/* ------------------------------------------------------- đèn lồng */}
      {/* Treo đủ SO_DEN chiếc, chiếc nào chưa tới lượt thì dùng ảnh đèn tắt -
          để người chơi THẤY còn mấy ngọn nữa mới thắp hết, chứ không phải chỗ
          trống. Đó là chỗ tạo ra cảm giác "còn thiếu một tí nữa". */}
      {CHO_TREO.map((x, i) => (
        <span
          key={x}
          className="pointer-events-none absolute aspect-square -translate-x-1/2"
          style={{ left: `${x}%`, top: "-1%", width: "9%" }}
        >
          <ArtImage
            src={`/art/prop/den-long-${i < sang ? "sang" : "tat"}.png`}
            alt=""
            className={
              i < sang
                ? "animate-float size-full object-contain object-top drop-shadow-[0_0_14px_var(--gold-glow)]"
                : "size-full object-contain object-top opacity-45"
            }
            style={{ animationDelay: `${i * 0.4}s` }}
          />
        </span>
      ))}

      {/* --------------------------------------------------------- đồ đạc */}
      {/*
        Neo theo ĐÁY PHẦN VẼ, không phải đáy tệp ảnh.

        Khâu xử lý ảnh thu mọi món về khung vuông theo kiểu `contain`, nên món
        nào bè ngang thì bị đệm trong suốt trên dưới - bồ đoàn chỉ chiếm từ 18%
        tới 80% chiều cao tệp. Neo theo đáy tệp là nó lơ lửng cách sàn một đoạn
        bằng 20% chiều cao của chính nó.

        `aspect-square` cộng `object-bottom` đẩy phần vẽ xuống sát đáy ô, nên
        mọi món đều đứng đúng trên sàn mà không phải đo từng tệp một - và vẽ lại
        ảnh khác tỷ lệ cũng không phải chỉnh gì.
      */}
      {do_.map((p) => {
        const anh = (
          <ArtImage
            src={`/art/prop/${p.file}.png`}
            alt={p.ten}
            title={p.ten}
            className="size-full object-contain object-bottom drop-shadow-[0_6px_18px_rgba(0,0,0,0.55)]"
          />
        );
        const style = {
          left: `${p.x}%`,
          top: `${p.day}%`,
          width: `${p.w}%`,
        } as const;

        // Món nào có mục quản thì bấm được; còn lại chỉ để ngắm, không nên
        // giả vờ là nút bấm.
        return p.anchor && onGo ? (
          <button
            key={p.file}
            type="button"
            onClick={() => onGo(p.anchor!)}
            aria-label={`${p.ten} — mở mục quản`}
            className="absolute aspect-square -translate-x-1/2 -translate-y-full transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-bright)]"
            style={style}
          >
            {anh}
          </button>
        ) : (
          <span
            key={p.file}
            className="pointer-events-none absolute aspect-square -translate-x-1/2 -translate-y-full"
            style={style}
          >
            {anh}
          </span>
        );
      })}

      {/*
        Đạo nhân sống trong phòng, và đổi tư thế theo việc đang làm: ngồi thiền
        lúc bế quan, đứng bên lò lúc xem đan đường, đọc ngọc giản lúc xem công
        pháp. Đây là chỗ biến căn phòng từ một bức tranh thành một nơi có người ở.
      */}
      <ArtImage
        src={`/art/chibi/${the.file}.png`}
        alt=""
        title={the.mo}
        className="animate-float pointer-events-none absolute aspect-square -translate-x-1/2 -translate-y-full object-contain object-bottom drop-shadow-[0_8px_20px_rgba(0,0,0,0.6)]"
        style={{ left: `${the.x}%`, top: `${the.day}%`, width: `${the.w}%` }}
      />

      {/* Linh thú nằm cạnh chủ nhân. Dùng lại ảnh linh thú sẵn có, không phải
          vẽ thêm - con nào đang mang theo thì con đó ở nhà. */}
      {beast && (
        <img
          src={beast.image}
          alt={beast.name}
          title={`${beast.name} đang ở trong động`}
          className="animate-float pointer-events-none absolute aspect-square -translate-x-1/2 -translate-y-full rounded-full object-contain drop-shadow-[0_6px_18px_rgba(0,0,0,0.55)]"
          style={{ left: "61%", top: "88%", width: "11%", animationDelay: "1s" }}
        />
      )}

      {/* Màn rộng: chữ đè lên đáy tranh */}
      <div className="absolute inset-x-0 bottom-0 hidden bg-gradient-to-t from-black/80 to-transparent p-3 sm:flex sm:items-end sm:justify-between sm:gap-3">
        {chu}
      </div>
    </div>

    {/* Màn hẹp: chữ nằm hẳn dưới khung phòng, không che đồ đạc */}
    <div className="flex flex-col gap-0.5 bg-black/55 p-2.5 sm:hidden">{chu}</div>
    </section>
  );
}
