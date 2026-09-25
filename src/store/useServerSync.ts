import { useCallback, useEffect, useRef, useState } from 'react';
import type { AppData } from '../types';
import { ApiError, api, apiEnabled, apThayDoi, laKhongDoi } from '../lib/api';
import type { ApiUser, KiemTra } from '../lib/api';
import { todayKey } from '../lib/date';

/**
 * Nối web vào server trọng tài.
 *
 * Cách làm: **dự đoán ở máy, server phán quyết**.
 *
 *  1. Bấm một nút → web tính ngay tại chỗ và vẽ lại màn hình. Không chờ mạng.
 *  2. Lệnh tương ứng được xếp hàng gửi lên server.
 *  3. Server chạy luật của nó rồi trả về trạng thái THẬT. Web lấy đó thay cho
 *     bản dự đoán.
 *
 * Gần như lúc nào hai bên cũng ra cùng một kết quả, nên bước 3 không ai thấy.
 * Lúc lệch nhau - vì máy khác vừa ghi, vì đồng hồ lệch, vì ai đó sửa
 * localStorage - thì con số của server thắng.
 *
 * Hàng đợi gửi **tuần tự**, không song song: lệnh sau tính trên kết quả lệnh
 * trước, bắn cùng lúc thì server xử theo thứ tự ngẫu nhiên và `version` đá nhau.
 *
 * Mất mạng thì lệnh nằm lại trong hàng đợi, web vẫn chạy bằng bản tính ở máy,
 * và nối lại được là gửi tiếp.
 */

export type SyncStatus =
  /** Chưa cấu hình VITE_API_URL - chạy hoàn toàn ở máy, như trước khi có server */
  | 'tat'
  /** Có server nhưng chưa đăng nhập */
  | 'chua-dang-nhap'
  /** Đang nối */
  | 'dang-noi'
  /** Đã nối, hàng đợi trống */
  | 'da-noi'
  /** Đang gửi lệnh */
  | 'dang-gui'
  /** Không gọi được server - lệnh nằm chờ trong hàng đợi */
  | 'mat-mang';

interface QueueItem {
  name: string;
  args: Record<string, unknown>;
}

export interface ServerSync {
  status: SyncStatus;
  user: ApiUser | null;
  /** Số lệnh đang chờ gửi */
  pending: number;
  /** Lỗi gần nhất, để hiện cho người dùng đọc */
  loi: string | null;
  dangNhap: (email: string, matKhau: string) => Promise<void>;
  dangKy: (email: string, matKhau: string, ten?: string) => Promise<void>;
  dangXuat: () => Promise<void>;
  /** Đẩy hồ sơ đang có ở máy lên server. Chỉ làm được khi tài khoản còn trắng. */
  nhapLenServer: (data: AppData) => Promise<void>;
  taiLai: () => Promise<void>;
  /** Gửi một lệnh lên server. Gọi sau khi đã tính xong ở máy. */
  gui: (name: string, args?: Record<string, unknown>) => void;
  /**
   * Server có đang làm trọng tài không.
   *
   * Khác `status === 'da-noi'`: khi đang gửi dở hàng đợi thì trạng thái là
   * `dang-gui` nhưng server vẫn là trọng tài. Dùng để biết KẾT QUẢ NGẪU NHIÊN
   * do ai quyết - xem `attemptTribulation` trong AppStore.
   */
  laTrongTai: boolean;
}

/**
 * Vá xong có khớp với server không. Trả về chỗ lệch, hoặc `null` nếu khớp.
 *
 * Nói rõ lệch ở đâu chứ không chỉ true/false: khi chốt này bật lên thì web phải
 * tải lại cả hồ sơ, và nếu chuyện đó xảy ra thường xuyên thì có bug ở phần vá -
 * mà không biết lệch trường nào thì không có đường mà lần.
 */
function lechChoNao(data: AppData, kt: KiemTra): string | null {
  const doi: [string, number, number][] = [
    ['tasks', data.tasks.length, kt.tasks],
    ['goals', data.goals.length, kt.goals],
    ['sessions', data.sessions.length, kt.sessions],
    ['ledger', data.ledger.length, kt.ledger],
    ['taskXp', data.verified?.taskXp ?? -1, kt.taskXp],
  ];
  const xau = doi.filter(([, a, b]) => a !== b);
  return xau.length === 0 ? null : xau.map(([t, a, b]) => `${t}: web ${a} ≠ server ${b}`).join(', ');
}

/**
 * Chỗ nhớ số hiệu trạng thái giữa hai lần mở app.
 *
 * Chỉ một con số, nhưng nó là thứ cho phép hỏi "có gì mới không" thay vì tải
 * lại cả hồ sơ mỗi lần mở. Để riêng khỏi hồ sơ chính vì nó thuộc về đường
 * truyền chứ không thuộc về dữ liệu người dùng: xuất/nhập hồ sơ không nên mang
 * theo số hiệu của một máy chủ nào đó.
 */
const KHOA_VERSION = 'my-task/dong-bo-version';

function nhoVersion(v: number | undefined) {
  try {
    if (v === undefined) localStorage.removeItem(KHOA_VERSION);
    else localStorage.setItem(KHOA_VERSION, String(v));
  } catch {
    // Hết chỗ hoặc bị chặn: mất số hiệu chỉ khiến lần sau tải đầy đủ, không sai.
  }
}

function versionDaNho(): number | undefined {
  try {
    const raw = localStorage.getItem(KHOA_VERSION);
    if (raw === null) return undefined;
    const n = Number(raw);
    return Number.isInteger(n) && n >= 0 ? n : undefined;
  } catch {
    return undefined;
  }
}

export function useServerSync(
  /** Nhận hàm biến đổi chứ không nhận trạng thái: vá thì phải dựa trên bản đang giữ. */
  apDungTrangThai: (doi: (truoc: AppData) => AppData) => void,
  baoTin?: (message: string, tone?: 'ok' | 'warn') => void,
  /**
   * Bản đang giữ ở máy, đọc ngay lúc gọi.
   *
   * Cần để đối chiếu với con số server gửi về khi nó báo "không có gì đổi".
   * Không có thì mọi lần mở app đều tải lại đầy đủ - vẫn đúng, chỉ tốn.
   */
  layHienTai?: () => AppData,
  /**
   * Nhận kết quả server trả về cho từng lệnh.
   *
   * Cần cho những lệnh có KẾT QUẢ NGẪU NHIÊN. Máy và server tung xúc xắc riêng
   * nên hai bên bất đồng chừng một nửa số lần; trạng thái thì tự chữa được vì
   * bản vá của server ghi đè, nhưng hiệu ứng ăn mừng thì không - nó đã bung ra
   * theo con xúc xắc của máy rồi. Có đường này thì chỗ gọi đợi server phán.
   */
  nhanKetQua?: (ten: string, ketQua: unknown) => void,
): ServerSync {
  const [status, setStatus] = useState<SyncStatus>(apiEnabled ? 'dang-noi' : 'tat');
  const [user, setUser] = useState<ApiUser | null>(null);
  const [pending, setPending] = useState(0);
  const [loi, setLoi] = useState<string | null>(null);

  /** Hàng đợi và số hiệu trạng thái nằm trong ref: chúng đổi ngoài nhịp vẽ lại. */
  const queue = useRef<QueueItem[]>([]);
  const version = useRef<number | undefined>(undefined);
  /**
   * Bản của SERVER, giữ riêng khỏi bản đang hiện trên màn hình.
   *
   * Đây là chỗ sửa một lỗi thật: web sửa lạc quan tại chỗ để bấm cái là thấy
   * ngay, nhưng có những sửa đổi server làm KHÁC - rõ nhất là nhiệm vụ lặp
   * lại, web sinh lượt kế tiếp với một id, server sinh với id của nó. Bản vá
   * thì tính trên trạng thái của server, nên vá vào bản đã lệch ở máy chỉ ra
   * hai nhiệm vụ thay vì một, và sổ ghi cũng dôi ra.
   *
   * Vá vào bản này rồi mới đem hiển thị thì phần dự đoán chỉ sống tới lúc
   * server trả lời, sau đó con số của server thay hẳn vào - đúng nghĩa "server
   * phán quyết" mà vẫn không phải gửi lại cả hồ sơ.
   */
  const banServer = useRef<AppData | null>(null);
  const flushing = useRef(false);
  /**
   * Giữ hàm mới nhất, khỏi phải nhét vào deps của mọi callback.
   *
   * Gán trong effect chứ không gán thẳng lúc dựng hình: ghi vào ref giữa lúc
   * render là một tác dụng phụ, và React ở chế độ đồng thời có thể dựng hình
   * rồi vứt đi - lúc ấy ref đã bị ghi bằng giá trị của bản vừa vứt.
   *
   * Effect này phải đứng TRƯỚC mọi effect khác trong tệp: effect chạy theo thứ
   * tự khai báo, nên đặt sau thì lần nối đầu tiên đọc phải ref rỗng.
   */
  const apply = useRef(apDungTrangThai);
  const notify = useRef(baoTin);
  /*
   * `layHienTai` cũng phải vào ref, không được vào deps của `taiLai`.
   *
   * Để nó trong deps thì mỗi lần chỗ gọi truyền một hàm mới - viết thẳng
   * `() => data` là thành mới mỗi lần dựng hình - `taiLai` sẽ mới theo, effect
   * nối lại chạy lại, `setUser` làm dựng hình lần nữa, và cứ thế. Lần đầu viết
   * tôi để trong deps, test bắt được hai trăm nghìn lượt gọi mạng trong tám
   * giây. Bắt chỗ gọi phải tự ghi nhớ hàm là đặt một cái bẫy im lặng.
   */
  const layNay = useRef(layHienTai);
  const ketQua = useRef(nhanKetQua);
  useEffect(() => {
    apply.current = apDungTrangThai;
    notify.current = baoTin;
    layNay.current = layHienTai;
    ketQua.current = nhanKetQua;
  });

  /** Nuốt trọn một trạng thái đầy đủ từ server. */
  const nuot = useCallback((data: AppData, v: number) => {
    version.current = v;
    banServer.current = data;
    nhoVersion(v);
    apply.current(() => data);
  }, []);

  /**
   * Vá phần thay đổi vào bản đang giữ, rồi tự kiểm.
   *
   * Trả về `false` nếu vá xong mà lệch - lúc ấy chỗ gọi phải tải lại đầy đủ.
   * Lệch nghĩa là bản ở máy đã sai từ trước khi vá, nên vá tiếp chỉ sai thêm.
   */
  const va = useCallback((doi: Parameters<typeof apThayDoi>[1], kt: KiemTra, v: number) => {
    // Chưa có bản của server thì không vá được - phải tải đầy đủ trước.
    if (!banServer.current) {
      console.warn('[đồng bộ] chưa có bản của server để vá, phải tải lại');
      return false;
    }
    const sau = apThayDoi(banServer.current, doi);
    const lech = lechChoNao(sau, kt);
    if (lech) {
      console.warn('[đồng bộ] vá xong nhưng lệch, phải tải lại —', lech);
      return false;
    }
    version.current = v;
    banServer.current = sau;
    nhoVersion(v);
    apply.current(() => sau);
    return true;
  }, []);

  /**
   * Lấy trạng thái chuẩn từ server.
   *
   * Hỏi trước, tải sau. Hồ sơ lớn lên mãi - vài MB sau ba năm - mà phần lớn lần
   * mở app là mở lại trên chính máy vừa dùng, lúc ấy không có gì đổi cả. Gửi kèm
   * số hiệu đang giữ thì server trả về mấy con số thay vì cả hồ sơ.
   *
   * Vẫn phải ĐỐI CHIẾU chứ không tin suông: số hiệu khớp chỉ nói trạng thái
   * trên server y nguyên, không nói bản ở máy này còn nguyên. Bản ở máy có thể
   * đã lệch vì một lệnh chưa kịp gửi đi, vì ghi vào localStorage hỏng giữa
   * chừng, hay vì người dùng tự sửa. Lệch thì gọi lại lần nữa không kèm số
   * hiệu - mất thêm một vòng, đổi lấy việc không bao giờ chạy trên bản sai.
   */
  const taiLai = useCallback(async () => {
    const daBiet = version.current ?? versionDaNho();
    const hienTai = layNay.current?.();

    if (daBiet !== undefined && hienTai) {
      const res = await api.trangThai(daBiet);
      if (laKhongDoi(res)) {
        /*
         * Gắn lại `verified` trước khi đối chiếu.
         *
         * Trường này không được lưu xuống đĩa, nên sau khi nạp lại trang bản ở
         * máy không có nó - mà máy cũng không tự tính lại được, vì sổ ghi ký
         * bằng khoá nằm trên server. Không gắn vào thì tu vi hiện 0.
         *
         * Nghĩa là phép đối chiếu bên dưới thực chất soi BỐN con số đếm
         * (nhiệm vụ, mục tiêu, phiên, bản ghi sổ), còn `taskXp` thành hiển
         * nhiên khớp vì vừa lấy từ cùng một nguồn. Bốn con số ấy vẫn đủ: tu vi
         * sinh ra từ sổ ghi, nên sổ lệch một dòng là lộ ngay.
         */
        const sau = { ...hienTai, verified: res.verified };
        const lech = lechChoNao(sau, res.kiemTra);
        if (!lech) {
          version.current = res.version;
          banServer.current = sau;
          // Vá lên bản ĐANG hiện chứ không đắp đè bản chụp lúc nãy: giữa lúc
          // hỏi server, người dùng có thể đã tick xong một việc.
          apply.current((truoc) => ({ ...truoc, verified: res.verified }));
          return;
        }
        console.warn('[đồng bộ] server bảo không đổi nhưng bản ở máy lệch, tải lại —', lech);
      } else {
        nuot(res.data, res.version);
        if (!res.audit.ok) {
          notify.current?.('Máy chủ báo sổ ghi có vấn đề, xem mục Toàn vẹn dữ liệu', 'warn');
        }
        return;
      }
    }

    const res = await api.trangThai();
    // Không kèm số hiệu thì server luôn trả bản đầy đủ; nhánh kia không xảy ra.
    if (laKhongDoi(res)) return;
    nuot(res.data, res.version);
    if (!res.audit.ok) {
      notify.current?.('Máy chủ báo sổ ghi có vấn đề, xem mục Toàn vẹn dữ liệu', 'warn');
    }
  }, [nuot]);

  /** Gửi hết hàng đợi, từng lệnh một. */
  const day = useCallback(async () => {
    if (flushing.current || queue.current.length === 0) return;
    flushing.current = true;
    setStatus('dang-gui');

    try {
      while (queue.current.length > 0) {
        const item = queue.current[0]!;
        try {
          const res = await api.lenh(item.name, item.args, todayKey(), version.current);
          queue.current.shift();
          setPending(queue.current.length);
          setLoi(null);
          if (!va(res.thayDoi, res.kiemTra, res.version)) {
            // Bản ở máy đã lệch khỏi bản trên server. Bỏ hàng đợi rồi tải lại
            // đầy đủ - gửi tiếp mấy lệnh tính trên nền lệch chỉ lệch thêm.
            queue.current = [];
            setPending(0);
            await taiLai();
            return;
          }
          /*
           * Báo kết quả SAU khi vá.
           *
           * Chỗ gọi dựng hiệu ứng từ trạng thái đang giữ - tên cảnh giới vừa
           * bước sang chẳng hạn. Báo trước khi vá thì nó đọc phải bản cũ, và
           * reo lên sai tên. Chậm vài mili giây không ai thấy; sai tên thì có.
           */
          if (res.result !== undefined) ketQua.current?.(item.name, res.result);
        } catch (err) {
          if (!(err instanceof ApiError)) throw err;

          if (err.offline) {
            // Giữ nguyên hàng đợi, chờ lần sau. Web vẫn chạy bằng bản ở máy.
            setStatus('mat-mang');
            return;
          }

          if (err.status === 401) {
            queue.current = [];
            setPending(0);
            setUser(null);
            setStatus('chua-dang-nhap');
            notify.current?.('Phiên đã hết hạn, đăng nhập lại để đồng bộ', 'warn');
            return;
          }

          /*
           * Server không chấp nhận lệnh (422), hoặc có máy khác vừa ghi (409).
           *
           * Cả hai đều nghĩa là bản dự đoán ở máy đã sai. Bỏ hàng đợi rồi tải
           * lại từ server - cố gửi tiếp mấy lệnh tính trên nền sai chỉ làm sai
           * thêm.
           */
          queue.current = [];
          setPending(0);
          setLoi(err.message);
          notify.current?.(err.message, 'warn');
          await taiLai();
          return;
        }
      }
      setStatus('da-noi');
    } finally {
      flushing.current = false;
      if (queue.current.length === 0) setStatus((s) => (s === 'dang-gui' ? 'da-noi' : s));
    }
  }, [nuot, taiLai]);

  const gui = useCallback(
    (name: string, args: Record<string, unknown> = {}) => {
      if (!apiEnabled || !user) return;
      queue.current.push({ name, args });
      setPending(queue.current.length);
      void day();
    },
    [day, user],
  );

  /* ------------------------------------------------------- vào/ra tài khoản */

  const sauKhiVao = useCallback(
    async (u: ApiUser) => {
      setUser(u);
      setLoi(null);
      await taiLai();
      setStatus('da-noi');
    },
    [taiLai],
  );

  const dangNhap = useCallback(
    async (email: string, matKhau: string) => {
      const { user: u } = await api.dangNhap(email, matKhau);
      await sauKhiVao(u);
    },
    [sauKhiVao],
  );

  const dangKy = useCallback(
    async (email: string, matKhau: string, ten?: string) => {
      const { user: u } = await api.dangKy(email, matKhau, ten);
      await sauKhiVao(u);
    },
    [sauKhiVao],
  );

  const dangXuat = useCallback(async () => {
    await api.dangXuat().catch(() => {});
    queue.current = [];
    setPending(0);
    version.current = undefined;
    nhoVersion(undefined);
    banServer.current = null;
    setUser(null);
    setStatus('chua-dang-nhap');
  }, []);

  const nhapLenServer = useCallback(
    async (data: AppData) => {
      await api.lenh('importLocalData', { data }, todayKey(), version.current);
      // Nhập là thay trắng cả hồ sơ, nên tải lại đầy đủ thay vì vá.
      await taiLai();
      notify.current?.('Đã đưa hồ sơ lên máy chủ');
    },
    [taiLai],
  );

  /* ------------------------------------------------- nối lại lúc mở app */

  useEffect(() => {
    if (!apiEnabled) return;
    let huy = false;
    void (async () => {
      try {
        const { user: u } = await api.toiLaAi();
        if (huy) return;
        setUser(u);
        await taiLai();
        if (!huy) setStatus('da-noi');
      } catch (err) {
        if (huy) return;
        // 401 là bình thường: chỉ là chưa đăng nhập.
        setStatus(err instanceof ApiError && err.offline ? 'mat-mang' : 'chua-dang-nhap');
      }
    })();
    return () => {
      huy = true;
    };
  }, [taiLai]);

  /* ---------------------------------------------- có mạng lại thì gửi tiếp */

  useEffect(() => {
    if (!apiEnabled) return;
    const thu = () => void day();
    window.addEventListener('online', thu);
    // Quay lại tab cũng thử: máy ngủ dậy thì sự kiện `online` không bắn.
    document.addEventListener('visibilitychange', thu);
    return () => {
      window.removeEventListener('online', thu);
      document.removeEventListener('visibilitychange', thu);
    };
  }, [day]);

  return {
    status,
    user,
    pending,
    loi,
    dangNhap,
    dangKy,
    dangXuat,
    nhapLenServer,
    taiLai,
    laTrongTai: status === 'da-noi' || status === 'dang-gui',
    gui,
  };
}
