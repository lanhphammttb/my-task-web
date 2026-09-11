/**
 * Công pháp - cách tu, không phải cấp tu.
 *
 * Đây là cơ chế duy nhất trong app mà một lựa chọn hôm nay định hình mọi ngày
 * sau đó: công pháp không cho thêm sức mạnh, nó đổi *tỷ giá* giữa công sức và
 * tu vi. Chọn Thuỷ Vân thì ngồi lâu một việc mới bõ; chọn Kim Cang thì dọn
 * nhiều việc vụn mới bõ. Không có cái nào mạnh hơn cái nào - chỉ có cái hợp
 * với lối làm việc thật của người dùng.
 *
 * Vì thế mọi hệ số đều là đánh đổi có được có mất, và tổng lợi ích của bốn
 * công pháp cố ý giữ xấp xỉ nhau.
 */
export type TechniqueId = 'thuy_van' | 'kim_cang' | 'hau_tho' | 'pha_chap';

export interface Technique {
  id: TechniqueId;
  name: string;
  /** Tên ngắn cho chỗ chật */
  short: string;
  /** Nhân tu vi từ nhiệm vụ hoàn thành */
  taskMul: number;
  /** Nhân tu vi từ bế quan */
  focusMul: number;
  /** Nhân linh thạch kiếm được từ công việc */
  stoneMul: number;
  /** Nhân phần tu vi hao tổn khi độ kiếp thất bại */
  lossMul: number;
  tone: string;
  note: string;
  /** Nói thẳng công pháp này hợp với ai, để người dùng chọn đúng ngay từ đầu */
  fit: string;
}

export const TECHNIQUES: Record<TechniqueId, Technique> = {
  thuy_van: {
    id: 'thuy_van',
    name: 'Thuỷ Vân Quyết',
    short: 'Thuỷ Vân',
    taskMul: 0.85,
    focusMul: 1.4,
    stoneMul: 1,
    lossMul: 1,
    tone: '#5aa9c9',
    note: 'Tâm như nước lặng, một hơi kéo dài không dứt. Bế quan cho tu vi vượt trội, nhưng việc lặt vặt gần như không sinh lợi.',
    fit: 'Hợp người làm sâu một việc trong nhiều giờ liền.',
  },
  kim_cang: {
    id: 'kim_cang',
    name: 'Kim Cang Quyết',
    short: 'Kim Cang',
    taskMul: 1.35,
    focusMul: 0.85,
    stoneMul: 1,
    lossMul: 1,
    tone: '#cbb994',
    note: 'Chém sắt như chém bùn, việc tới là dứt. Mỗi nhiệm vụ xong cho tu vi đậm, nhưng ngồi thiền lâu lại phí.',
    fit: 'Hợp người mỗi ngày phải dọn rất nhiều việc nhỏ.',
  },
  hau_tho: {
    id: 'hau_tho',
    name: 'Hậu Thổ Quyết',
    short: 'Hậu Thổ',
    // Tu vi phải chậm lại thật. Để nguyên 1.0 thì công pháp này chỉ toàn lợi -
    // nhiều linh thạch hơn, độ kiếp đỡ đau hơn, mà chẳng mất gì - và nó sẽ đè
    // bẹp ba lựa chọn kia thay vì là một lối tu riêng.
    taskMul: 0.9,
    focusMul: 0.9,
    stoneMul: 1.4,
    lossMul: 0.65,
    tone: '#c79a5b',
    note: 'Đất dày chở vạn vật, không nhanh nhưng không đổ. Tu vi chậm lại một nhịp, đổi lại linh thạch dồi dào và độ kiếp hỏng cũng ít hao.',
    fit: 'Hợp người muốn tích của, ngại rủi ro, đi đường dài.',
  },
  pha_chap: {
    id: 'pha_chap',
    name: 'Phá Chấp Quyết',
    short: 'Phá Chấp',
    taskMul: 1.25,
    focusMul: 1.25,
    stoneMul: 0.7,
    lossMul: 1.6,
    tone: '#cf3f2f',
    note: 'Bỏ hết đường lui, chỉ còn đường tiến. Tu vi tăng cả hai đằng, nhưng linh thạch ít hẳn và độ kiếp hỏng thì mất rất đau.',
    fit: 'Hợp người chấp nhận trả giá để đi nhanh.',
  },
};

export const TECHNIQUE_ORDER: TechniqueId[] = ['thuy_van', 'kim_cang', 'hau_tho', 'pha_chap'];

/**
 * Lần chọn đầu miễn phí - không ai đáng bị phạt vì chưa biết mình hợp lối nào.
 * Từ lần đổi thứ hai trở đi giá tăng dần, để công pháp là một cam kết chứ không
 * phải cái nút bật tắt theo tâm trạng.
 */
export const TECHNIQUE_SWAP_COST = 60;

export function techniqueSwapCost(swaps: number): number {
  return TECHNIQUE_SWAP_COST * (Math.max(0, swaps) + 1);
}

export function techniqueById(id?: TechniqueId): Technique | undefined {
  return id ? TECHNIQUES[id] : undefined;
}

/** Hệ số của công pháp đang tu; chưa chọn thì mọi thứ giữ nguyên tỷ giá gốc. */
export function techniqueMuls(id?: TechniqueId): Pick<Technique, 'taskMul' | 'focusMul' | 'stoneMul' | 'lossMul'> {
  const t = techniqueById(id);
  return {
    taskMul: t?.taskMul ?? 1,
    focusMul: t?.focusMul ?? 1,
    stoneMul: t?.stoneMul ?? 1,
    lossMul: t?.lossMul ?? 1,
  };
}
