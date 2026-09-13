import type { Goal, Task } from '../types';

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
    title: t.title,
    note: t.note,
    date: t.date,
    startTime: t.startTime,
    deadline: t.deadline,
    priority: t.priority,
    tags: t.tags,
    goalId: t.goalId,
    estimateMin: t.estimateMin,
    recurrence: t.recurrence,
    subtasks: t.subtasks.map((s) => ({ title: s.title, done: s.done })),
  })),

  updateTask: (_k, id: never, patch: never) => {
    const p = patch as Partial<Task>;
    // `status` không đi đường này: đổi trạng thái là chuyện của sổ ghi, phải
    // qua `setStatus` để server ký cho đúng.
    const { status: _bo, id: _bo2, focusMin: _bo3, completedAt: _bo4, ...con } = p;
    return Object.keys(con).length === 0 ? null : { id: id as string, ...con };
  },

  removeTask: (_k, id: never) => ({ id: id as string }),
  setStatus: neuThanh((id: never, status: never) => ({ id: id as string, status: status as string })),
  toggleDone: neuThanh((id: never) => ({ id: id as string })),
  moveTask: (_k, id: never, date: never) => ({ id: id as string, date: date as string }),
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
    title: g.title,
    description: g.description,
    color: g.color,
    targetDate: g.targetDate,
  })),
  updateGoal: (_k, id: never, patch: never) => ({ id: id as string, ...(patch as Partial<Goal>) }),
  removeGoal: (_k, id: never) => ({ id: id as string }),

  /* --------------------------------------------------------------- bế quan */
  logSession: (_k, minutes: never, taskId: never) => ({
    minutes: minutes as number,
    taskId: taskId as string | undefined,
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
 *  - `duplicateTask`: web sinh id mới cho cả việc lẫn các việc con, mà lệnh
 *    tương ứng bên server lại tự sinh id của nó. Chưa đáng để làm cho khớp.
 *  - `resolveEncounter`: kỳ ngộ do server bốc và trả về trong kết quả của
 *    `logSession`; cách web đang tự bốc là đường cũ, sẽ bỏ khi chuyển hẳn.
 *  - `replaceAll`, `loadSample`, `resetAll`: mấy cái này thay trắng toàn bộ hồ
 *    sơ. Cho gửi lên thì thành cửa hậu xoá sạch dữ liệu trên máy chủ bằng một
 *    lời gọi - muốn làm phải là một lệnh riêng, có hỏi lại cho tử tế.
 *  - `resealLedger`: ký lại sổ bằng khoá của web, mà sổ trên server ký bằng
 *    khoá khác. Khi đã đăng nhập thì nút này vô nghĩa.
 */
export const KHONG_GUI = [
  'duplicateTask',
  'resolveEncounter',
  'replaceAll',
  'loadSample',
  'resetAll',
  'resealLedger',
] as const;
