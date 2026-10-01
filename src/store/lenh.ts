import type { FocusSession, Goal, Task } from '../types';

/**
 * Bảng đổi "hành động ở web" thành "lệnh gửi lên server".
 *
 * Cố tình gom hết vào MỘT bảng thay vì rắc lời gọi vào 38 chỗ trong `AppStore`.
 * Ở đây nhìn một phát là thấy hành động nào được gửi đi, hành động nào không,
 * và mỗi cái gửi kèm gì - còn rắc vào từng chỗ thì muốn biết phải đọc cả file,
 * mà thiếu một chỗ cũng chẳng ai nhận ra.
 *
 * Mỗi mục nhận **kết quả** của hành động cùng các tham số của nó, rồi trả về
 * tham số cho lệnh. Trả `null` nghĩa là đừng gửi - dùng cho lúc web đã tự từ
 * chối (không đủ linh thạch, ô đất đang có cây...), vì gửi lên thì server cũng
 * từ chối y hệt, chỉ tổ thành một lần đồng bộ lại vô ích.
 */

type Args = Record<string, unknown>;

/* ------------------------------------------------------ giới hạn của server */

/**
 * Giới hạn độ dài mà lược đồ lệnh bên server đặt ra (`handlers/work.ts`).
 *
 * Phải khớp từng con số. Vượt một ký tự thôi là server trả 400 - mà 400 thì
 * lớp đồng bộ coi là "máy chủ không hiểu mình" và dừng cả hàng đợi, vì không
 * thể biết đó là lỗi của lệnh này hay của cả phiên bản. Chặn từ ô nhập thì
 * người dùng biết ngay, chứ không phải đợi tới lúc đồng bộ mới thấy kẹt.
 */
export const GIOI_HAN = {
  tieuDe: 200,
  ghiChu: 4000,
  nhan: 40,
  soNhan: 20,
  soBuoc: 50,
  tieuDeBuoc: 200,
  moTaMucTieu: 4000,
} as const;

/**
 * Cắt một nhiệm vụ cho vừa giới hạn.
 *
 * Lưới cuối cùng cho những đường không qua form sửa (thêm nhanh, nhân bản...):
 * cắt ở cả hai phía - trong máy và trong lệnh gửi đi - để hai bên cùng giữ một
 * bản, thay vì máy giữ bản dài còn server từ chối.
 */
export function gioiHanNhiemVu<T extends Partial<Pick<Task, 'title' | 'note' | 'tags' | 'subtasks'>>>(t: T): T {
  const ra = { ...t };
  if (typeof ra.title === 'string') ra.title = ra.title.slice(0, GIOI_HAN.tieuDe);
  if (typeof ra.note === 'string') ra.note = ra.note.slice(0, GIOI_HAN.ghiChu);
  if (Array.isArray(ra.tags)) ra.tags = ra.tags.slice(0, GIOI_HAN.soNhan).map((x) => x.slice(0, GIOI_HAN.nhan));
  if (Array.isArray(ra.subtasks)) {
    ra.subtasks = ra.subtasks
      .slice(0, GIOI_HAN.soBuoc)
      .map((x) => (x.title.length > GIOI_HAN.tieuDeBuoc ? { ...x, title: x.title.slice(0, GIOI_HAN.tieuDeBuoc) } : x));
  }
  return ra;
}

/** Một chỗ vượt giới hạn, để form hiện ngay dưới ô nhập. */
export interface VuotGioiHan {
  code: string;
  message: string;
}

/** Soát bản nháp nhiệm vụ theo giới hạn của server. Rỗng là hợp lệ. */
export function kiemGioiHanNhiemVu(d: { title: string; note: string; tags: string[]; subtasks: { title: string }[] }): VuotGioiHan[] {
  const ra: VuotGioiHan[] = [];
  if (d.title.trim().length > GIOI_HAN.tieuDe) {
    ra.push({ code: 'title-too-long', message: `Tên nhiệm vụ dài quá: ${d.title.trim().length}/${GIOI_HAN.tieuDe} ký tự.` });
  }
  if (d.note.trim().length > GIOI_HAN.ghiChu) {
    ra.push({ code: 'note-too-long', message: `Ghi chú dài quá: ${d.note.trim().length}/${GIOI_HAN.ghiChu} ký tự.` });
  }
  if (d.tags.length > GIOI_HAN.soNhan) {
    ra.push({ code: 'too-many-tags', message: `Nhiều nhãn quá: ${d.tags.length}/${GIOI_HAN.soNhan} nhãn.` });
  }
  const nhanDai = d.tags.find((t) => t.length > GIOI_HAN.nhan);
  if (nhanDai) {
    ra.push({ code: 'tag-too-long', message: `Nhãn “${nhanDai.slice(0, 20)}…” dài quá ${GIOI_HAN.nhan} ký tự.` });
  }
  if (d.subtasks.length > GIOI_HAN.soBuoc) {
    ra.push({ code: 'too-many-subtasks', message: `Nhiều bước nhỏ quá: ${d.subtasks.length}/${GIOI_HAN.soBuoc} bước.` });
  }
  if (d.subtasks.some((x) => x.title.length > GIOI_HAN.tieuDeBuoc)) {
    ra.push({ code: 'subtask-too-long', message: `Có bước nhỏ dài quá ${GIOI_HAN.tieuDeBuoc} ký tự.` });
  }
  return ra;
}

export function kiemGioiHanMucTieu(d: { title: string; description: string }): VuotGioiHan[] {
  const ra: VuotGioiHan[] = [];
  if (d.title.trim().length > GIOI_HAN.tieuDe) {
    ra.push({ code: 'title-too-long', message: `Tên mục tiêu dài quá: ${d.title.trim().length}/${GIOI_HAN.tieuDe} ký tự.` });
  }
  if (d.description.trim().length > GIOI_HAN.moTaMucTieu) {
    ra.push({ code: 'description-too-long', message: `Mô tả dài quá: ${d.description.trim().length}/${GIOI_HAN.moTaMucTieu} ký tự.` });
  }
  return ra;
}

export function gioiHanMucTieu<T extends Partial<Pick<Goal, 'title' | 'description'>>>(g: T): T {
  const ra = { ...g };
  if (typeof ra.title === 'string') ra.title = ra.title.slice(0, GIOI_HAN.tieuDe);
  if (typeof ra.description === 'string') ra.description = ra.description.slice(0, GIOI_HAN.moTaMucTieu);
  return ra;
}

/*
 * Trường tuỳ chọn gỡ được. Người dùng xoá hạn chót thì patch mang
 * `deadline: undefined`, mà JSON thì nuốt mất `undefined` - server nhận một
 * lệnh sửa không có hạn chót và giữ nguyên cái cũ. Quy ước với server: gửi
 * `null` nghĩa là gỡ.
 */
const GO_DUOC_TASK = ['goalId', 'deadline', 'startTime'] as const;
const GO_DUOC_GOAL = ['targetDate'] as const;

function xoaThanhNull(p: Args, goDuoc: readonly string[]): Args {
  const ra: Args = {};
  for (const [k, v] of Object.entries(p)) {
    if (v !== undefined) ra[k] = v;
    else if (goDuoc.includes(k)) ra[k] = null;
  }
  return ra;
}
type Doi = (ketQua: unknown, ...tham: never[]) => Args | null;

/** Hành động trả về boolean: chỉ gửi khi web đã chấp nhận. */
const neuThanh =
  (dung: (...tham: never[]) => Args): Doi =>
  (ketQua, ...tham) =>
    ketQua === false ? null : dung(...tham);

/** Hành động trả về giá trị hoặc null: chỉ gửi khi có giá trị. */
const neuCo =
  (dung: (ketQua: never, ...tham: never[]) => Args): Doi =>
  (ketQua, ...tham) =>
    ketQua == null ? null : dung(ketQua as never, ...tham);

export const LENH: Record<string, Doi> = {
  /* ------------------------------------------------------------- nhiệm vụ */
  // Gửi kèm id mà web vừa sinh, để thẻ nhiệm vụ đang hiện trên màn hình không
  // bị thay bằng thẻ khác khi server trả lời.
  addTask: neuCo((t: Task) => ({
    id: t.id,
    title: t.title.slice(0, GIOI_HAN.tieuDe),
    note: t.note.slice(0, GIOI_HAN.ghiChu),
    date: t.date,
    startTime: t.startTime,
    deadline: t.deadline,
    priority: t.priority,
    tags: t.tags.slice(0, GIOI_HAN.soNhan).map((x) => x.slice(0, GIOI_HAN.nhan)),
    goalId: t.goalId,
    estimateMin: t.estimateMin,
    recurrence: t.recurrence,
    subtasks: t.subtasks
      .slice(0, GIOI_HAN.soBuoc)
      .map((s) => ({ id: s.id, title: s.title.slice(0, GIOI_HAN.tieuDeBuoc), done: s.done })),
  })),

  updateTask: (k, id: never, patch: never) => {
    // Web đã chặn (sửa ngày/ưu tiên của việc đã xong) thì đừng gửi.
    if (k === false) return null;
    const p = patch as Partial<Task>;
    // `status` không đi đường này: đổi trạng thái là chuyện của sổ ghi, phải
    // qua `setStatus` để server ký cho đúng. `firstDoneAt` và `recurDay` do
    // server tự giữ, không lệnh nào được đặt.
    const {
      status: _bo, id: _bo2, focusMin: _bo3, completedAt: _bo4, completedOn: _bo5,
      firstDoneAt: _bo6, recurDay: _bo7, ...con
    } = p;
    return Object.keys(con).length === 0 ? null : { id: id as string, ...xoaThanhNull(gioiHanNhiemVu(con), GO_DUOC_TASK) };
  },

  duplicateTask: neuCo((t: Task, id: never) => ({ id: id as string, newId: t.id, subtaskIds: t.subtasks.map(s => s.id) })),
  setStatus: neuThanh((id: never, status: never) => ({ id: id as string, status: status as string })),
  toggleDone: neuThanh((id: never) => ({ id: id as string })),
  moveTask: neuThanh((id: never, date: never) => ({ id: id as string, date: date as string })),
  toggleSubtask: (_k, taskId: never, subId: never) => ({
    taskId: taskId as string,
    subId: subId as string,
  }),
  pushOverdueToToday: (k) => ((k as number) > 0 ? {} : null),
  clearDone: (k, before: never) =>
    (k as number) > 0 ? (before ? { before: before as string } : {}) : null,

  /* -------------------------------------------------------------- mục tiêu */
  addGoal: neuCo((g: Goal) => ({
    id: g.id,
    title: g.title.slice(0, GIOI_HAN.tieuDe),
    description: g.description.slice(0, GIOI_HAN.moTaMucTieu),
    color: g.color,
    targetDate: g.targetDate,
  })),
  updateGoal: (_k, id: never, patch: never) => {
    const { id: _bo, createdAt: _bo2, ...con } = patch as Partial<Goal>;
    return Object.keys(con).length === 0
      ? null
      : { id: id as string, ...xoaThanhNull(gioiHanMucTieu(con), GO_DUOC_GOAL) };
  },
  removeGoal: (_k, id: never) => ({ id: id as string }),

  /* --------------------------------------------------------------- bế quan */
  // Gửi kèm id phiên web vừa sinh: sổ ghi móc vào id này, và lệnh nào sau đó
  // nhắc tới phiên ấy thì hai bên vẫn nói về cùng một thứ.
  //
  // Gửi kèm cả giờ bắt đầu/kết thúc THẬT của phiên. Lệnh xếp hàng lúc mất
  // mạng có khi tới server sau cả tiếng; không mang giờ thì server coi mọi
  // phiên như vừa kết thúc "bây giờ", ba phiên gửi dồn một lúc sẽ chồng lên
  // nhau và bị chặn như gian lận.
  logSession: neuCo((s: FocusSession) => {
    const batDau = Date.parse(s.startedAt);
    return {
      id: s.id,
      minutes: s.minutes,
      taskId: s.taskId,
      // Mốc hỏng thì thôi không gửi giờ - server tự lấy "bây giờ" như cũ.
      ...(Number.isNaN(batDau)
        ? {}
        : { startedAt: s.startedAt, endedAt: new Date(batDau + s.minutes * 60_000).toISOString() }),
    };
  }),

  /* ------------------------------------------------------------- tu luyện */
  awaken: neuCo(() => ({})),
  rerollRoot: neuCo(() => ({})),
  summon: neuCo(() => ({})),
  feedBeast: neuThanh((id: never) => ({ id: id as string })),
  setActiveBeast: (_k, id: never) => ({ id: id as string | undefined }),
  buyPill: neuThanh((grade: never, qty: never) => ({
    grade: grade as string,
    qty: (qty as number) ?? 1,
  })),
  pickTechnique: neuThanh((id: never) => ({ id: id as string })),
  plantSeed: neuThanh((slot: never, herb: never) => ({
    slot: slot as number,
    herb: herb as string,
  })),
  harvestPlot: neuThanh((slot: never) => ({ slot: slot as number })),
  refinePill: neuCo((_k, grade: never) => ({ grade: grade as string })),
  refineRootElement: neuThanh((from: never, to: never) => ({
    from: from as string,
    to: to as string,
  })),
  condenseRootElement: neuThanh((drop: never) => ({ drop: drop as string })),
  upgradeCave: neuThanh(() => ({})),
  startExpedition: neuThanh((site: never) => ({ site: site as string })),
  resolveExpedition: neuCo(() => ({})),
  openChest: neuCo((_k, ruleId: never) => ({ ruleId: ruleId as string })),
  acceptMission: neuThanh((id: never) => ({ id: id as string })),
  settleMission: neuCo(() => ({})),
  attemptTribulation: neuCo((_k, grade: never) => ({ grade: grade as string })),
  updateSettings: (_k, patch: never) => patch as Args,
};

/**
 * Những hành động CỐ TÌNH không gửi lên server, và lý do:
 *
 *  - `resolveEncounter`: có gửi, nhưng gửi TAY trong AppStore chứ không qua
 *    bảng này - chỉ khi server đang giữ kỳ ngộ (`pendingEncounter`). Chạy một
 *    mình thì kỳ ngộ bốc ở máy và không có gì để gửi.
 *  - `removeTask`: cũng gửi tay, và gửi TRỄ: xoá xong còn vài giây để bấm
 *    "Hoàn tác", hết giờ mới gửi. Server không có lệnh khôi phục, nên hoàn tác
 *    chỉ làm được khi lệnh xoá chưa đi.
 *  - `replaceAll`, `loadSample`, `resetAll`: mấy cái này thay trắng toàn bộ hồ
 *    sơ. Cho gửi lên thì thành cửa hậu xoá sạch dữ liệu trên máy chủ bằng một
 *    lời gọi - muốn làm phải là một lệnh riêng, có hỏi lại cho tử tế.
 *  - `resealLedger`: ký lại sổ bằng khoá của web, mà sổ trên server ký bằng
 *    khoá khác. Khi đã đăng nhập thì nút này vô nghĩa.
 */
export const KHONG_GUI = [
  'resolveEncounter',
  'removeTask',
  'replaceAll',
  'loadSample',
  'resetAll',
  'resealLedger',
] as const;

/**
 * Lệnh nào được nhận thêm tham số phụ do chính hành động sinh ra.
 *
 * Hoàn thành một việc lặp lại thì web sinh luôn lần kế tiếp với id mới. Id ấy
 * không nằm trong tham số người gọi truyền vào, cũng không nằm trong giá trị
 * trả về (`boolean`), nên phải đi đường riêng - xem `bocLenh` trong AppStore.
 */
export const NHAN_PHU = new Set(['setStatus', 'toggleDone']);

/** Tên dễ đọc của từng lệnh, để báo lỗi bằng tiếng người. */
export const TEN_LENH: Record<string, string> = {
  addTask: 'thêm nhiệm vụ',
  updateTask: 'sửa nhiệm vụ',
  duplicateTask: 'nhân bản nhiệm vụ',
  removeTask: 'xoá nhiệm vụ',
  setStatus: 'đổi trạng thái nhiệm vụ',
  toggleDone: 'đánh dấu hoàn thành',
  moveTask: 'dời nhiệm vụ',
  toggleSubtask: 'tick bước nhỏ',
  pushOverdueToToday: 'dời việc quá hạn',
  clearDone: 'dọn việc đã xong',
  addGoal: 'thêm mục tiêu',
  updateGoal: 'sửa mục tiêu',
  removeGoal: 'xoá mục tiêu',
  logSession: 'ghi phiên bế quan',
  awaken: 'khai quang linh căn',
  rerollRoot: 'tẩy linh căn',
  summon: 'triệu hồi linh thú',
  feedBeast: 'cho linh thú ăn',
  setActiveBeast: 'đổi linh thú theo',
  buyPill: 'mua đan',
  pickTechnique: 'chọn công pháp',
  plantSeed: 'gieo hạt',
  harvestPlot: 'hái linh thảo',
  refinePill: 'luyện đan',
  refineRootElement: 'tẩy tuỷ',
  condenseRootElement: 'ngưng luyện linh căn',
  upgradeCave: 'nâng động phủ',
  startExpedition: 'lên đường thám hiểm',
  resolveExpedition: 'đón đoàn thám hiểm',
  openChest: 'mở hòm',
  acceptMission: 'nhận sứ mệnh',
  settleMission: 'kết toán sứ mệnh',
  attemptTribulation: 'độ kiếp',
  resolveEncounter: 'giải kỳ ngộ',
  updateSettings: 'đổi cài đặt',
  importLocalData: 'đưa hồ sơ lên máy chủ',
};

export const tenLenh = (name: string) => TEN_LENH[name] ?? name;

/** Id mà một lệnh tạo ra. Lệnh ấy bị từ chối thì các id này không tồn tại. */
export function idTaoRa(name: string, args: Args): string[] {
  const lay = (k: string) => (typeof args[k] === 'string' ? [args[k] as string] : []);
  switch (name) {
    case 'addTask':
    case 'addGoal':
    case 'logSession':
      return lay('id');
    case 'duplicateTask':
      return lay('newId');
    case 'setStatus':
    case 'toggleDone':
      return lay('nextId');
    default:
      return [];
  }
}

/**
 * Tách các lệnh phụ thuộc vào một id đã không còn (vì lệnh tạo ra nó bị từ chối).
 *
 * Lệnh nhắm thẳng vào id ấy (sửa, xoá, tick...) thì bỏ luôn: gửi lên chắc chắn
 * bị từ chối, mà mỗi lần từ chối là một lần báo lỗi làm người dùng rối. Lệnh
 * chỉ NHẮC tới id ở trường phụ thì gỡ trường ấy rồi gửi tiếp - phiên bế quan
 * gắn với một nhiệm vụ không thêm được vẫn là 25 phút đã ngồi thật, không được
 * mất theo.
 *
 * Chạy theo đúng thứ tự hàng đợi và lan dần: nhân bản một việc đã bị bỏ thì
 * bản sao cũng thành id chết.
 */
export function tachPhuThuoc<T extends { name: string; args: Args }>(
  chet: Iterable<string>,
  hang: readonly T[],
): { bo: T[]; sua: T[] } {
  const ids = new Set(chet);
  const bo: T[] = [];
  const sua: T[] = [];
  for (const item of hang) {
    const a = item.args;
    const nham = (k: string) => typeof a[k] === 'string' && ids.has(a[k] as string);
    if (nham('id') || (item.name === 'toggleSubtask' && nham('taskId'))) {
      bo.push(item);
      for (const id of idTaoRa(item.name, a)) ids.add(id);
      continue;
    }
    const go = [
      ...(item.name === 'logSession' && nham('taskId') ? ['taskId'] : []),
      ...((item.name === 'addTask' || item.name === 'updateTask') && nham('goalId') ? ['goalId'] : []),
    ];
    if (go.length) {
      const args = { ...a };
      for (const k of go) delete args[k];
      sua.push({ ...item, args });
    }
  }
  return { bo, sua };
}
