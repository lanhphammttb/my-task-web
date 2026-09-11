import path from 'node:path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    restoreMocks: true,
    // Bài trong App.test dựng nguyên cả ứng dụng rồi mở lần lượt từng bảng.
    // Động Phủ và Tiên Lộ giờ khá nhiều mục, dựng hết trong jsdom đã ngót một
    // giây mỗi lượt; chạy song song với các tệp khác thì có lượt chạm ngưỡng
    // 5 giây mặc định và trượt oan. Nới ra cho có chỗ thở.
    testTimeout: 20000,
  },
});
