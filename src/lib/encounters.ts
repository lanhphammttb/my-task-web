import type { PillGrade } from './pills';

/**
 * Kỳ ngộ: sau mỗi phiên bế quan, có xác suất gặp một biến cố. Người tu chọn
 * một hướng xử lý, rồi bốc kết quả theo trọng số - có thể được cơ duyên, cũng
 * có thể bị tổn thất. Đây là chỗ đưa "biến số" của tu tiên vào app.
 *
 * Thiết kế cố ý: phần thưởng và tổn thất chỉ chạm vào linh thạch, đan dược và
 * tu vi cơ duyên - KHÔNG bao giờ sửa hồ sơ nhiệm vụ đã làm.
 */
export type OutcomeKind = 'stones' | 'pill' | 'encounterXp' | 'nothing';

export interface Outcome {
  /** Trọng số bốc thăm trong cùng một lựa chọn */
  weight: number;
  kind: OutcomeKind;
  /** Số linh thạch / tu vi; âm là mất */
  amount?: number;
  pill?: PillGrade;
  tone: 'good' | 'bad' | 'neutral';
  msg: string;
}

export interface EncounterOption {
  text: string;
  /** Gợi ý mức độ rủi ro cho người chơi thấy trước khi chọn */
  risk: 'an toàn' | 'rủi ro' | 'nguy hiểm';
  outcomes: Outcome[];
}

export interface Encounter {
  id: string;
  title: string;
  description: string;
  options: EncounterOption[];
}

export const ENCOUNTERS: Encounter[] = [
  {
    id: 'hang-dong',
    title: 'Kỳ Ngộ Hang Động',
    description:
      'Xuất định, ngươi thấy một luồng hắc khí bốc lên từ hang tối phía đông. Gần đó có vách đá cheo leo phát ra kim quang lấp lánh.',
    options: [
      {
        text: 'Vào hang tối tìm bảo vật',
        risk: 'nguy hiểm',
        outcomes: [
          { weight: 35, kind: 'stones', amount: 60, tone: 'good', msg: 'Trong hang có một túi linh thạch của tiền nhân bỏ lại. Thu được 60 viên!' },
          { weight: 20, kind: 'pill', pill: 'trung', tone: 'good', msg: 'Ngươi tìm được một hộp đan cũ, bên trong còn một viên Độ Kiếp Đan (Trung)!' },
          { weight: 45, kind: 'stones', amount: -25, tone: 'bad', msg: 'Quái dơi trong hang phục kích. Ngươi tháo chạy, rơi mất 25 linh thạch.' },
        ],
      },
      {
        text: 'Leo vách đá kim quang',
        risk: 'rủi ro',
        outcomes: [
          { weight: 60, kind: 'stones', amount: 30, tone: 'good', msg: 'Kim quang là mạch linh thạch lộ thiên. Đào được 30 viên.' },
          { weight: 40, kind: 'nothing', tone: 'neutral', msg: 'Chỉ là đá lân tinh phản chiếu. Về tay không nhưng ngắm được cảnh đẹp.' },
        ],
      },
      {
        text: 'Bỏ qua, về động phủ',
        risk: 'an toàn',
        outcomes: [{ weight: 100, kind: 'nothing', tone: 'neutral', msg: 'Ngươi cẩn thận rời đi. Đạo tâm vững hơn của cải.' }],
      },
    ],
  },
  {
    id: 'tan-hon',
    title: 'Tàn Hồn Tiền Bối',
    description:
      'Một luồng thần thức cổ xưa thức tỉnh, hoá thành lão giả tiên phong đạo cốt: "Tiểu bối, ta thấy ngươi cốt cách tinh kỳ. Ta có một đoạn tâm pháp, ngươi có muốn nhận?"',
    options: [
      {
        text: 'Quỳ nhận truyền thừa',
        risk: 'rủi ro',
        outcomes: [
          { weight: 55, kind: 'encounterXp', amount: 120, tone: 'good', msg: 'Tâm pháp nhập thể, tu vi tăng vọt 120 điểm!' },
          { weight: 25, kind: 'pill', pill: 'thuong', tone: 'good', msg: 'Lão giả tặng luôn một viên Độ Kiếp Đan (Thượng) rồi tan vào hư không.' },
          { weight: 20, kind: 'encounterXp', amount: -40, tone: 'bad', msg: 'Thần thức quá mạnh, kinh mạch ngươi chịu không nổi. Tổn 40 tu vi.' },
        ],
      },
      {
        text: 'Hỏi rõ lai lịch trước',
        risk: 'an toàn',
        outcomes: [
          { weight: 50, kind: 'encounterXp', amount: 45, tone: 'good', msg: 'Lão giả khen ngươi cẩn trọng, truyền một đoạn khẩu quyết ngắn. Tu vi +45.' },
          { weight: 50, kind: 'nothing', tone: 'neutral', msg: 'Lão giả cười nhạt: "Kẻ đa nghi khó thành đại đạo", rồi biến mất.' },
        ],
      },
    ],
  },
  {
    id: 'linh-thao',
    title: 'Vườn Linh Thảo Hoang',
    description:
      'Ngươi lạc vào một thung lũng đầy linh thảo trăm năm. Nhưng giữa vườn có một con Thủ Hộ Thú đang ngủ.',
    options: [
      {
        text: 'Hái nhanh rồi chạy',
        risk: 'rủi ro',
        outcomes: [
          { weight: 55, kind: 'stones', amount: 45, tone: 'good', msg: 'Hái được một bó linh thảo, bán được 45 linh thạch.' },
          { weight: 45, kind: 'stones', amount: -20, tone: 'bad', msg: 'Thú tỉnh giấc! Ngươi chạy thoát nhưng rơi mất 20 linh thạch.' },
        ],
      },
      {
        text: 'Đánh thức và thương lượng',
        risk: 'nguy hiểm',
        outcomes: [
          { weight: 30, kind: 'pill', pill: 'ha', tone: 'good', msg: 'Thủ Hộ Thú nhận ngươi có thiện ý, tặng một viên Độ Kiếp Đan (Hạ).' },
          { weight: 30, kind: 'stones', amount: 80, tone: 'good', msg: 'Nó dẫn ngươi tới mạch linh thạch phía sau. Thu 80 viên!' },
          { weight: 40, kind: 'encounterXp', amount: -30, tone: 'bad', msg: 'Nó nổi giận, một vuốt đánh ngươi bay ra khỏi thung lũng. Tổn 30 tu vi.' },
        ],
      },
      {
        text: 'Lặng lẽ rút lui',
        risk: 'an toàn',
        outcomes: [{ weight: 100, kind: 'nothing', tone: 'neutral', msg: 'Của rơi giữa đường chưa chắc là của mình. Ngươi rời đi bình an.' }],
      },
    ],
  },
  {
    id: 'ma-tu',
    title: 'Ma Tu Chặn Đường',
    description:
      'Một ma tu mặt đầy vết xăm hắc khí chắn đường: "Đạo hữu, để lại linh thạch thì đi được. Bằng không…"',
    options: [
      {
        text: 'Nghênh chiến',
        risk: 'nguy hiểm',
        outcomes: [
          { weight: 45, kind: 'stones', amount: 70, tone: 'good', msg: 'Ngươi thắng! Lục túi hắn được 70 linh thạch.' },
          { weight: 55, kind: 'stones', amount: -40, tone: 'bad', msg: 'Hắn mạnh hơn dự tính. Ngươi thoát được nhưng mất 40 linh thạch.' },
        ],
      },
      {
        text: 'Đưa linh thạch cho qua',
        risk: 'an toàn',
        outcomes: [{ weight: 100, kind: 'stones', amount: -15, tone: 'bad', msg: 'Mất 15 linh thạch nhưng giữ được thân. Người biết lùi mới đi xa.' }],
      },
    ],
  },
  {
    id: 'thien-vien',
    title: 'Thiên Viên Nứt Vỡ',
    description:
      'Giữa lúc nhập định, một khe hư không mở ra trước mặt, bên trong lấp lánh vô số ánh sáng lạ.',
    options: [
      {
        text: 'Bước vào khe hư không',
        risk: 'nguy hiểm',
        outcomes: [
          { weight: 25, kind: 'encounterXp', amount: 200, tone: 'good', msg: 'Bên trong là một mảnh tiểu thế giới! Linh khí đậm đặc, tu vi tăng 200.' },
          { weight: 25, kind: 'pill', pill: 'thuong', tone: 'good', msg: 'Ngươi vớt được một viên Độ Kiếp Đan (Thượng) trôi nổi trong hư không.' },
          { weight: 50, kind: 'encounterXp', amount: -60, tone: 'bad', msg: 'Hư không loạn lưu xé nát hộ thể. Ngươi bị đẩy ra, tổn 60 tu vi.' },
        ],
      },
      {
        text: 'Đứng ngoài quan sát, ghi lại',
        risk: 'an toàn',
        outcomes: [
          { weight: 70, kind: 'encounterXp', amount: 35, tone: 'good', msg: 'Ngươi ghi lại quy luật khe nứt, ngộ ra chút đạo lý. Tu vi +35.' },
          { weight: 30, kind: 'nothing', tone: 'neutral', msg: 'Khe nứt đóng lại trước khi ngươi hiểu được gì.' },
        ],
      },
    ],
  },
  {
    id: 'dan-lo',
    title: 'Đan Lô Bỏ Hoang',
    description:
      'Trong hốc núi có một đan lô cổ còn vương dược hương. Đáy lô đọng lại mấy viên đan chưa rõ phẩm chất.',
    options: [
      {
        text: 'Nuốt thử một viên',
        risk: 'nguy hiểm',
        outcomes: [
          { weight: 40, kind: 'encounterXp', amount: 90, tone: 'good', msg: 'Là bổ nguyên đan! Khí tức dâng lên, tu vi +90.' },
          { weight: 60, kind: 'encounterXp', amount: -45, tone: 'bad', msg: 'Đan đã biến chất thành độc. Ngươi vận công đẩy độc, tổn 45 tu vi.' },
        ],
      },
      {
        text: 'Mang về Đan Đường nhờ xem',
        risk: 'an toàn',
        outcomes: [
          { weight: 60, kind: 'pill', pill: 'ha', tone: 'good', msg: 'Đan sư luyện lại thành một viên Độ Kiếp Đan (Hạ) cho ngươi.' },
          { weight: 40, kind: 'stones', amount: 25, tone: 'good', msg: 'Đan không dùng được, nhưng cái lô cổ bán được 25 linh thạch.' },
        ],
      },
    ],
  },
];

/** Xác suất gặp kỳ ngộ sau một phiên bế quan hoàn tất. */
export const ENCOUNTER_CHANCE = 0.35;

export function pickEncounter(rand: () => number = Math.random): Encounter {
  return ENCOUNTERS[Math.floor(rand() * ENCOUNTERS.length) % ENCOUNTERS.length];
}

/** Bốc kết quả theo trọng số trong một lựa chọn. */
export function rollOutcome(option: EncounterOption, rand: () => number = Math.random): Outcome {
  const total = option.outcomes.reduce((s, o) => s + o.weight, 0);
  let roll = rand() * total;
  for (const o of option.outcomes) {
    if (roll < o.weight) return o;
    roll -= o.weight;
  }
  return option.outcomes[option.outcomes.length - 1];
}
