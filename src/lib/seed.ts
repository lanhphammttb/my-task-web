import type { AppData, Task } from '../types';
import { addDays, dateKey } from './date';
import { DEFAULT_SETTINGS, uid } from './storage';

const at = (offset: number) => dateKey(addDays(new Date(), offset));
const iso = (offset: number, time: string) => `${at(offset)}T${time}:00`;

/** Dữ liệu mẫu cho lần chạy đầu tiên, để người dùng thấy ngay app hoạt động ra sao. */
export function seedData(): AppData {
  const goalWork = { id: uid(), title: 'Bàn giao dự án Q3', description: 'Hoàn tất và nghiệm thu trước cuối quý.', color: '#6366f1', targetDate: at(21), archived: false, createdAt: new Date().toISOString() };
  const goalHealth = { id: uid(), title: 'Sức khỏe & thể lực', description: 'Tập luyện đều 4 buổi/tuần.', color: '#10b981', targetDate: at(60), archived: false, createdAt: new Date().toISOString() };
  const goalLearn = { id: uid(), title: 'Học tiếng Anh giao tiếp', description: 'Đủ tự tin họp bằng tiếng Anh.', color: '#f59e0b', targetDate: at(90), archived: false, createdAt: new Date().toISOString() };

  const make = (t: Partial<Task> & { title: string; date: string }): Task => ({
    id: uid(),
    note: '',
    priority: 'medium',
    status: 'todo',
    tags: [],
    estimateMin: 30,
    focusMin: 0,
    subtasks: [],
    recurrence: 'none',
    createdAt: new Date().toISOString(),
    ...t,
  });

  const tasks: Task[] = [
    make({
      title: 'Chốt tài liệu bàn giao module thanh toán',
      date: at(0),
      startTime: '09:00',
      deadline: iso(0, '12:00'),
      priority: 'urgent',
      estimateMin: 90,
      goalId: goalWork.id,
      tags: ['công việc', 'deadline'],
      subtasks: [
        { id: uid(), title: 'Rà soát sơ đồ luồng', done: true },
        { id: uid(), title: 'Viết hướng dẫn vận hành', done: false },
        { id: uid(), title: 'Gửi email cho khách hàng', done: false },
      ],
    }),
    make({ title: 'Họp daily với team', date: at(0), startTime: '08:30', estimateMin: 15, priority: 'high', tags: ['họp'], recurrence: 'weekdays', goalId: goalWork.id }),
    make({ title: 'Review pull request của Nam', date: at(0), startTime: '14:00', estimateMin: 45, priority: 'high', goalId: goalWork.id, tags: ['công việc'] }),
    make({ title: 'Chạy bộ 5km', date: at(0), startTime: '18:00', estimateMin: 40, priority: 'medium', goalId: goalHealth.id, tags: ['sức khỏe'], recurrence: 'daily' }),
    make({ title: 'Học 20 từ vựng mới', date: at(0), estimateMin: 25, priority: 'low', goalId: goalLearn.id, tags: ['học'], recurrence: 'daily' }),
    make({ title: 'Lập kế hoạch sprint tuần tới', date: at(1), startTime: '09:30', estimateMin: 60, priority: 'high', goalId: goalWork.id, tags: ['kế hoạch'] }),
    make({ title: 'Gọi điện cho nhà cung cấp', date: at(1), estimateMin: 20, priority: 'medium', deadline: iso(1, '17:00') }),
    make({ title: 'Viết báo cáo tiến độ tháng', date: at(3), estimateMin: 120, priority: 'urgent', deadline: iso(3, '16:00'), goalId: goalWork.id, tags: ['báo cáo'] }),
    make({ title: 'Luyện nói 30 phút với AI', date: at(2), estimateMin: 30, priority: 'medium', goalId: goalLearn.id, tags: ['học'] }),
    make({ title: 'Tập gym buổi tối', date: at(2), startTime: '19:00', estimateMin: 60, priority: 'medium', goalId: goalHealth.id, tags: ['sức khỏe'] }),
    make({ title: 'Dọn hộp thư và phân loại email', date: at(-1), estimateMin: 30, priority: 'low', status: 'done', completedAt: `${at(-1)}T10:00:00` }),
    make({ title: 'Chuẩn bị slide demo', date: at(-1), estimateMin: 90, priority: 'high', status: 'done', goalId: goalWork.id, completedAt: `${at(-1)}T15:30:00` }),
    make({ title: 'Chạy bộ 5km', date: at(-1), estimateMin: 40, priority: 'medium', status: 'done', goalId: goalHealth.id, completedAt: `${at(-1)}T18:40:00` }),
    make({ title: 'Học 20 từ vựng mới', date: at(-2), estimateMin: 25, priority: 'low', status: 'done', goalId: goalLearn.id, completedAt: `${at(-2)}T21:00:00` }),
    make({ title: 'Họp review với khách hàng', date: at(-2), estimateMin: 60, priority: 'high', status: 'done', goalId: goalWork.id, completedAt: `${at(-2)}T11:00:00` }),
    make({ title: 'Tổng kết tháng & đặt mục tiêu mới', date: at(7), estimateMin: 60, priority: 'high', tags: ['kế hoạch'] }),
  ];

  return {
    version: 1,
    tasks,
    goals: [goalWork, goalHealth, goalLearn],
    sessions: [
      { id: uid(), date: at(-2), minutes: 50, startedAt: `${at(-2)}T09:00:00` },
      { id: uid(), date: at(-1), minutes: 75, startedAt: `${at(-1)}T14:00:00` },
      { id: uid(), date: at(-3), minutes: 25, startedAt: `${at(-3)}T16:00:00` },
    ],
    settings: { ...DEFAULT_SETTINGS },
    // Không gán sẵn linh căn: để người dùng tự khai quang ở lần mở đầu tiên.
    beasts: [],
    stonesSpent: 0,
    pills: { ha: 0, trung: 0, thuong: 0 },
    tuViPenalty: 0,
    gateRealm: 0,
    failStreak: 0,
    encounterXp: 0,
    stonesBonus: 0,
    ledger: [],
    lastSeenAt: new Date().toISOString(),
  };
}
