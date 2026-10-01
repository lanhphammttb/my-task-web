import { createContext, useContext } from 'react';
import type { Ctx, HanhDong } from './AppStore';

/** Toàn bộ: hồ sơ lẫn hành động. Đổi mỗi khi hồ sơ đổi. */
export const AppContext = createContext<Ctx | null>(null);
/** Chỉ hành động - danh tính ổn định suốt đời `AppProvider`. */
export const HanhDongContext = createContext<HanhDong | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp phải được dùng bên trong <AppProvider>');
  return ctx;
}

/**
 * Chỉ các hành động - không kèm hồ sơ. Dùng cho component chỉ cần gọi việc
 * (nút bấm, ô thêm nhanh...): nó không vẽ lại mỗi khi hồ sơ đổi.
 */
export function useAppActions() {
  const ctx = useContext(HanhDongContext);
  if (!ctx) throw new Error('useAppActions phải được dùng bên trong <AppProvider>');
  return ctx;
}
