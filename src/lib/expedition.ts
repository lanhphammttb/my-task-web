import type { HerbId } from './field';
import type { PillGrade } from './pills';

/**
 * Thám hiểm bí cảnh.
 *
 * Kỳ ngộ vốn là chuyện trời cho: nó tự nổ 35% sau mỗi phiên bế quan và người tu
 * không có cách nào đi tìm. Thám hiểm là mặt còn lại - **mình chủ động chọn nơi
 * đến và chọn mức liều**.
 *
 * Cùng một nguyên tắc với linh điền: chuyến đi không kết thúc sau mấy tiếng
 * đồng hồ mà kết thúc sau **N nhiệm vụ hoàn thành**. Đo bằng đồng hồ thì app
 * đang thưởng cho việc chờ; đo bằng việc đã xong thì muốn đoàn về sớm chỉ có
 * một đường là đi làm. Trạng thái vì thế cũng thuần phái sinh: chỉ lưu mốc số
 * nhiệm vụ lúc lên đường.
 */
export type SiteId = 'linh_thao_coc' | 'co_thap' | 'u_minh' | 'bach_cot';

export type Risk = 'an toàn' | 'rủi ro' | 'nguy hiểm' | 'tuyệt địa';

export interface SiteOutcome {
  /** Trọng số bốc thăm, không cần cộng lại thành 100 */
  weight: number;
  label: string;
  text: string;
  tone: 'good' | 'bad' | 'neutral';
  /** Linh thạch nhận thêm, có thể âm */
  stones?: number;
  /** Tu vi nhận thêm, có thể âm */
  xp?: number;
  herbs?: Partial<Record<HerbId, number>>;
  pill?: PillGrade;
}

export interface Site {
  id: SiteId;
  name: string;
  short: string;
  /** Số nhiệm vụ phải hoàn thành thì đoàn mới về tới nơi */
  needTasks: number;
  /** Phí lên đường, tính bằng linh thạch */
  cost: number;
  risk: Risk;
  image: string;
  tone: string;
  note: string;
  outcomes: SiteOutcome[];
}

export const SITES: Record<SiteId, Site> = {
  linh_thao_coc: {
    id: 'linh_thao_coc',
    name: 'Linh Thảo Cốc',
    short: 'Linh Thảo',
    needTasks: 3,
    cost: 20,
    risk: 'an toàn',
    image: '/art/encounter/linh-thao.jpg',
    tone: '#6fbf73',
    note: 'Thung lũng cỏ thuốc ngay sau núi. Không có gì nguy hiểm, cũng không có gì to tát.',
    outcomes: [
      {
        weight: 45,
        label: 'Hái đầy giỏ',
        text: 'Sương chưa tan, cỏ non mọc kín triền dốc. Bạn hái một lúc là đầy giỏ.',
        tone: 'good',
        herbs: { thanh_diep: 3 },
      },
      {
        weight: 30,
        label: 'Gặp khóm hoa lạ',
        text: 'Trong bụi rậm có mấy nhánh hoa đỏ sẫm, nhựa còn ấm.',
        tone: 'good',
        herbs: { thanh_diep: 2, huyet_tinh: 1 },
      },
      {
        weight: 20,
        label: 'Về tay không',
        text: 'Có người đi trước vặt sạch. Chỉ còn gốc với lá úa.',
        tone: 'neutral',
        stones: 5,
      },
      {
        weight: 5,
        label: 'Vấp phải mạch linh khí',
        text: 'Chân giẫm trúng một khe đá đang toả hơi trắng. Ngồi xuống hít một hồi, đan điền ấm hẳn.',
        tone: 'good',
        xp: 40,
        herbs: { thanh_diep: 2 },
      },
    ],
  },

  co_thap: {
    id: 'co_thap',
    name: 'Cổ Tháp Bí Cảnh',
    short: 'Cổ Tháp',
    needTasks: 6,
    cost: 60,
    risk: 'rủi ro',
    image: '/art/page/tower.jpg',
    tone: '#5aa9c9',
    note: 'Toà tháp đá bỏ hoang, mỗi tầng một cấm chế. Người ta đồn tầng trên cùng còn nguyên.',
    outcomes: [
      {
        weight: 35,
        label: 'Mở được một tầng',
        text: 'Cấm chế đã mục theo năm tháng. Trong hộc đá có túi linh thạch và mấy nhánh thuốc khô.',
        tone: 'good',
        stones: 90,
        herbs: { huyet_tinh: 2 },
      },
      {
        weight: 25,
        label: 'Nhặt được đan cũ',
        text: 'Một cái lọ sứ lăn lóc góc tường, bên trong còn đúng một viên chưa hỏng.',
        tone: 'good',
        pill: 'ha',
        stones: 30,
      },
      {
        weight: 25,
        label: 'Bị cấm chế hất ra',
        text: 'Vừa chạm vào bậc thang thứ chín thì cả người bị đẩy văng xuống chân tháp.',
        tone: 'bad',
        xp: -30,
      },
      {
        weight: 15,
        label: 'Lên tới đỉnh tháp',
        text: 'Trên cùng là một gian trống, giữa gian có bệ đá khắc kín chữ cổ. Đọc xong thì thần thức sáng ra.',
        tone: 'good',
        xp: 160,
        stones: 60,
      },
    ],
  },

  u_minh: {
    id: 'u_minh',
    name: 'U Minh Địa',
    short: 'U Minh',
    needTasks: 10,
    cost: 130,
    risk: 'nguy hiểm',
    image: '/art/page/uminh.jpg',
    tone: '#9b7fd4',
    note: 'Vùng đất không thấy mặt trời, âm khí đặc như sương. Vào được thì có thứ hiếm, ra được mới tính.',
    outcomes: [
      {
        weight: 30,
        label: 'Đào được Kim Tuỷ Chi',
        text: 'Trong khe đá có mạch kim, nấm mọc thành cụm. Loại này ngoài chợ không ai bán.',
        tone: 'good',
        xp: 60,
        herbs: { kim_tuy: 2, huyet_tinh: 2 },
      },
      {
        weight: 25,
        label: 'Cướp được của người đi trước',
        text: 'Một bộ hài cốt còn ôm túi càn khôn. Người này chết chưa lâu.',
        tone: 'good',
        xp: 140,
        stones: 260,
        pill: 'trung',
      },
      {
        weight: 30,
        label: 'Lạc trong âm khí',
        text: 'Đi ba ngày mà vẫn thấy đúng gốc cây ấy. Thoát ra được thì đạo tâm đã lung lay.',
        tone: 'bad',
        xp: -90,
        stones: -40,
      },
      {
        weight: 15,
        label: 'Gặp cổ mộ chưa ai động',
        text: 'Cửa mộ còn nguyên phong ấn. Bên trong là một gian đầy ngọc và một cây sâm tía.',
        tone: 'good',
        xp: 380,
        herbs: { tu_van: 1, kim_tuy: 1 },
        stones: 180,
      },
    ],
  },

  bach_cot: {
    id: 'bach_cot',
    name: 'Tuyệt Địa Bạch Cốt',
    short: 'Bạch Cốt',
    needTasks: 16,
    cost: 260,
    risk: 'tuyệt địa',
    image: '/art/page/bone.jpg',
    tone: '#cf3f2f',
    note: 'Xương trắng chất thành gò, không một ngọn cỏ. Mười người vào thì bảy người không ra. Ba người còn lại đổi đời.',
    outcomes: [
      {
        weight: 30,
        label: 'Moi được từ đống xương',
        text: 'Bới suốt hai ngày trong gò xương, cuối cùng cũng có thứ đáng giá.',
        tone: 'good',
        xp: 150,
        stones: 420,
        herbs: { tu_van: 1 },
      },
      {
        weight: 20,
        label: 'Tìm thấy động phủ tiền bối',
        text: 'Sau vách đá là một động phủ kín, chủ nhân đã hoá tro nhưng đan dược còn nguyên trong lò.',
        tone: 'good',
        pill: 'thuong',
        xp: 400,
        stones: 200,
      },
      {
        weight: 35,
        label: 'Suýt bỏ mạng',
        text: 'Thứ gì đó trong gò xương động đậy. Chạy được ra tới ngoài thì kinh mạch đã tổn.',
        tone: 'bad',
        xp: -300,
        stones: -120,
      },
      {
        weight: 15,
        label: 'Nhặt được một mảnh đạo vận',
        text: 'Giữa tuyệt địa lại có một đoá sen trắng mọc trên hộp sọ. Hái xuống, cả người nhẹ bẫng.',
        tone: 'good',
        xp: 900,
        herbs: { tu_van: 2, kim_tuy: 2 },
      },
    ],
  },
};

export const SITE_ORDER: SiteId[] = ['linh_thao_coc', 'co_thap', 'u_minh', 'bach_cot'];

export interface Expedition {
  site: SiteId;
  /** Số nhiệm vụ đã xác thực tại đúng lúc lên đường - mốc để đo đường về */
  startedAtTasks: number;
  startedAt: string;
}

export interface ExpeditionState {
  expedition: Expedition;
  site: Site;
  /** Số nhiệm vụ đã xong kể từ lúc lên đường */
  done: number;
  need: number;
  /** 0..1 */
  ratio: number;
  ready: boolean;
  remain: number;
}

export function expeditionState(e: Expedition, taskCount: number): ExpeditionState {
  const site = SITES[e.site];
  // Kẹp về 0 như linh điền: sổ ghi có thể hạ số nhiệm vụ đã xác thực xuống nếu
  // phát hiện dữ liệu bị sửa, lúc ấy chuyến đi coi như vừa khởi hành.
  const done = Math.max(0, taskCount - e.startedAtTasks);
  const need = site.needTasks;
  return {
    expedition: e,
    site,
    done,
    need,
    ratio: need === 0 ? 1 : Math.min(1, done / need),
    ready: done >= need,
    remain: Math.max(0, need - done),
  };
}

/** Bốc kết quả theo trọng số. `rand` tách ra để test cố định được. */
export function rollSiteOutcome(site: Site, rand: () => number = Math.random): SiteOutcome {
  const total = site.outcomes.reduce((s, o) => s + o.weight, 0);
  let roll = rand() * total;
  for (const o of site.outcomes) {
    if (roll < o.weight) return o;
    roll -= o.weight;
  }
  return site.outcomes[site.outcomes.length - 1];
}

/** Kỳ vọng tu vi của một bí cảnh - dùng để kiểm tra cân bằng, không hiện ra UI. */
export function expectedXp(site: Site): number {
  const total = site.outcomes.reduce((s, o) => s + o.weight, 0);
  return site.outcomes.reduce((s, o) => s + (o.xp ?? 0) * (o.weight / total), 0);
}
