/**
 * Tông môn: bậc đệ tử, cống hiến, và sứ mệnh có đặt cọc.
 *
 * Đây là cơ chế duy nhất trong app bắt người dùng **hứa trước rồi chịu trách
 * nhiệm sau**. Mọi thứ khác đều là "tiêu tài nguyên đổi lấy đồ", làm hay không
 * làm cũng chẳng mất gì. Nhận sứ mệnh thì phải đặt cọc linh thạch: xong trước
 * hạn mới lấy lại được, trễ là mất.
 *
 * Chỗ này có hạn theo **đồng hồ thật**, và đó là ngoại lệ có chủ ý so với linh
 * điền hay thám hiểm. Khác biệt nằm ở chiều của áp lực: hạn chót ép người ta
 * bắt tay vào làm, còn cổng thời gian kiểu "chờ 8 tiếng nữa mới hái được" thì
 * ép người ta ngồi đợi. Cái đầu phục vụ mục đích của ứng dụng, cái sau chống
 * lại nó.
 */
export interface SectRank {
  level: number;
  name: string;
  /** Cống hiến tích luỹ cần có để lên bậc này */
  need: number;
  /** Phần trăm linh thạch cộng thêm khi ở bậc này */
  stonePct: number;
  tone: string;
  note: string;
}

export const RANKS: SectRank[] = [
  {
    level: 1,
    name: 'Ngoại Môn Đệ Tử',
    need: 0,
    stonePct: 0,
    tone: '#94a3b8',
    note: 'Quét sân, gánh nước, thi thoảng được nghe giảng ké. Ai cũng bắt đầu từ đây.',
  },
  {
    level: 2,
    name: 'Nội Môn Đệ Tử',
    need: 120,
    stonePct: 6,
    tone: '#7fb7a8',
    note: 'Có phòng riêng, có phần linh thạch hằng tháng. Đã được gọi bằng sư huynh sư tỷ.',
  },
  {
    level: 3,
    name: 'Chân Truyền',
    need: 400,
    stonePct: 12,
    tone: '#5aa9c9',
    note: 'Được đích thân trưởng lão chỉ dạy. Cả tông môn chỉ mấy người có danh phận này.',
  },
  {
    level: 4,
    name: 'Trưởng Lão',
    need: 1000,
    stonePct: 20,
    tone: '#9b7fd4',
    note: 'Ngồi được vào hàng ghế bàn việc lớn. Lời nói ra có trọng lượng.',
  },
  {
    level: 5,
    name: 'Tông Chủ',
    need: 2400,
    stonePct: 30,
    tone: '#e0a83c',
    note: 'Cả tông môn nhìn vào một người. Đến đây thì cống hiến không còn để đổi chác nữa.',
  },
];

export const MAX_RANK = RANKS.length;

export function rankOf(contribution: number): SectRank {
  let found = RANKS[0];
  for (const r of RANKS) {
    if (contribution >= r.need) found = r;
  }
  return found;
}

/** Bậc kế tiếp, hoặc `null` nếu đã là Tông Chủ. */
export function nextRank(contribution: number): SectRank | null {
  return RANKS.find((r) => r.need > contribution) ?? null;
}

/** Tiến độ 0..1 trong bậc hiện tại. */
export function rankRatio(contribution: number): number {
  const cur = rankOf(contribution);
  const next = nextRank(contribution);
  if (!next) return 1;
  const span = next.need - cur.need;
  return span <= 0 ? 1 : Math.min(1, Math.max(0, (contribution - cur.need) / span));
}

export type MissionId = 'quet_san' | 'tuan_son' | 'ho_phap' | 'toa_quan' | 'tru_ma';

export interface Mission {
  id: MissionId;
  name: string;
  note: string;
  /** Số nhiệm vụ phải hoàn thành trong hạn. 0 nghĩa là không xét */
  tasks: number;
  /** Số phút bế quan phải tích trong hạn. 0 nghĩa là không xét */
  focus: number;
  /** Số ngày kể từ lúc nhận */
  days: number;
  /** Đặt cọc bằng linh thạch. Xong thì lấy lại, trễ thì mất */
  stake: number;
  /** Cống hiến nhận được khi hoàn thành */
  contribution: number;
  /** Linh thạch thưởng thêm, ngoài phần cọc trả lại */
  reward: number;
  /** Bậc tối thiểu mới nhận được sứ mệnh này */
  minRank: number;
}

export const MISSIONS: Record<MissionId, Mission> = {
  quet_san: {
    id: 'quet_san',
    name: 'Quét Sân Tạp Dịch',
    note: 'Việc vặt của ngoại môn. Nhẹ nhàng, cốt để biết mặt nhau.',
    tasks: 8,
    focus: 0,
    days: 3,
    stake: 25,
    contribution: 40,
    reward: 30,
    minRank: 1,
  },
  tuan_son: {
    id: 'tuan_son',
    name: 'Tuần Sơn Hộ Đạo',
    note: 'Đi vòng quanh núi, kiểm tra cấm chế. Đòi hỏi phải đều đặn chứ không dồn một hôm.',
    tasks: 20,
    focus: 0,
    days: 7,
    stake: 70,
    contribution: 120,
    reward: 110,
    minRank: 1,
  },
  ho_phap: {
    id: 'ho_phap',
    name: 'Hộ Pháp Bế Quan',
    note: 'Ngồi canh cho sư huynh bế quan. Việc này tính bằng thời gian nhập định, không tính bằng số việc.',
    tasks: 0,
    focus: 480,
    days: 7,
    stake: 90,
    contribution: 160,
    reward: 140,
    minRank: 2,
  },
  toa_quan: {
    id: 'toa_quan',
    name: 'Toạ Quan Luyện Tâm',
    note: 'Vừa lo việc tông môn vừa giữ nhịp tu luyện. Đòi hỏi cả hai mặt cùng lúc.',
    tasks: 35,
    focus: 900,
    days: 14,
    stake: 200,
    contribution: 420,
    reward: 340,
    minRank: 3,
  },
  tru_ma: {
    id: 'tru_ma',
    name: 'Trừ Ma Vệ Đạo',
    note: 'Sứ mệnh của hàng trưởng lão. Nửa tháng ròng, không có chỗ cho ngày lười.',
    tasks: 60,
    focus: 1500,
    days: 14,
    stake: 400,
    contribution: 900,
    reward: 700,
    minRank: 4,
  },
};

export const MISSION_ORDER: MissionId[] = ['quet_san', 'tuan_son', 'ho_phap', 'toa_quan', 'tru_ma'];

export interface ActiveMission {
  id: MissionId;
  /** Số nhiệm vụ đã xác thực tại lúc nhận - mốc để đo phần làm được trong hạn */
  startTasks: number;
  /** Tổng phút bế quan tại lúc nhận */
  startFocus: number;
  acceptedAt: string;
  /** Hạn chót, dạng ISO */
  dueAt: string;
  /** Đã đặt cọc bao nhiêu - chép lại phòng khi bảng sứ mệnh đổi số về sau */
  stake: number;
}

export interface MissionState {
  active: ActiveMission;
  mission: Mission;
  doneTasks: number;
  doneFocus: number;
  /** 0..1, lấy phần chậm nhất trong các chỉ tiêu */
  ratio: number;
  met: boolean;
  /** Quá hạn mà chưa đạt */
  expired: boolean;
  /** Còn bao nhiêu mili giây nữa hết hạn; âm là đã quá */
  msLeft: number;
}

export function missionState(
  active: ActiveMission,
  taskCount: number,
  focusMinutes: number,
  now: Date = new Date(),
): MissionState | null {
  const mission = MISSIONS[active.id];
  if (!mission) return null;
  // Kẹp về 0 như mọi chỗ khác: sổ ghi có thể hạ số đã xác thực xuống nếu phát
  // hiện dữ liệu bị sửa, lúc ấy coi như vừa nhận sứ mệnh chứ không được âm.
  const doneTasks = Math.max(0, taskCount - active.startTasks);
  const doneFocus = Math.max(0, focusMinutes - active.startFocus);

  const parts: number[] = [];
  if (mission.tasks > 0) parts.push(Math.min(1, doneTasks / mission.tasks));
  if (mission.focus > 0) parts.push(Math.min(1, doneFocus / mission.focus));

  // Sứ mệnh đòi cả hai mặt thì phải đạt cả hai, nên tiến độ là mặt chậm nhất.
  const ratio = parts.length === 0 ? 1 : Math.min(...parts);
  const met = ratio >= 1;
  const msLeft = new Date(active.dueAt).getTime() - now.getTime();

  return { active, mission, doneTasks, doneFocus, ratio, met, expired: !met && msLeft <= 0, msLeft };
}

/** "còn 2 ngày 5 giờ" hoặc "đã quá hạn 3 giờ". */
export function timeLeftLabel(msLeft: number): string {
  const past = msLeft < 0;
  const total = Math.abs(msLeft);
  const days = Math.floor(total / 86400000);
  const hours = Math.floor((total % 86400000) / 3600000);
  const mins = Math.floor((total % 3600000) / 60000);

  let body: string;
  if (days > 0) body = `${days} ngày ${hours} giờ`;
  else if (hours > 0) body = `${hours} giờ ${mins} phút`;
  else body = `${mins} phút`;

  return past ? `đã quá hạn ${body}` : `còn ${body}`;
}

/** Hạn chót tính từ lúc nhận. */
export function dueDateOf(mission: Mission, from: Date = new Date()): string {
  return new Date(from.getTime() + mission.days * 86400000).toISOString();
}
