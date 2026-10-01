import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { loadEnv } from 'vite';
import type { Plugin } from 'vite';
// `defineConfig` lấy từ vitest để giữ được khối `test`; `loadEnv` thì chỉ vite
// mới xuất ra.
import { defineConfig } from 'vitest/config';

/** Backend mà dev server chuyển tiếp tới. Đổi bằng `VITE_API_PROXY` trong .env. */
const API_MAC_DINH = 'https://my-task-api-theta.vercel.app';

const chuyenTiep = (mode: string) => ({
  '/api': {
    target: loadEnv(mode, import.meta.dirname, '').VITE_API_PROXY || API_MAC_DINH,
    changeOrigin: true,
    rewrite: (duong: string) => duong.replace(/^\/api/, ''),
  },
});

/** Chỗ giữ chỗ trong public/sw.js, thay bằng mã bản build. */
const CHO_MA_BAN = '__DAO_TRINH_BUILD_ID__';

/**
 * Đóng dấu mã bản build vào `dist/sw.js`.
 *
 * Trình duyệt chỉ cài worker mới khi NỘI DUNG sw.js đổi. Trước đây tệp này
 * đóng cứng tên kho `-v3`, deploy bao nhiêu lần nó vẫn y hệt từng byte - máy đã
 * cài cứ chạy worker cũ, còn kho vỏ phình dần. Mã bản lấy từ mã băm của mọi
 * tệp build ra (tên chunk đã mang mã băm nội dung), nên: mã đổi đúng khi mã
 * nguồn đổi, build lại y nguyên thì mã giữ nguyên (không bắt người dùng tải lại
 * vô cớ).
 */
function ghiMaBanSw(): Plugin {
  let outDir = 'dist';
  let maBan = '';
  return {
    name: 'dao-trinh:ma-ban-sw',
    apply: 'build',
    configResolved(cfg) {
      outDir = path.resolve(cfg.root, cfg.build.outDir);
    },
    generateBundle(_opts, bundle) {
      const bam = createHash('sha256');
      for (const ten of Object.keys(bundle).sort()) {
        const tep = bundle[ten];
        bam.update(ten);
        // index.html không mang mã băm trong tên - băm luôn nội dung của nó.
        if (tep.type === 'asset' && ten.endsWith('.html')) bam.update(String(tep.source));
      }
      maBan = bam.digest('hex').slice(0, 12);
    },
    writeBundle() {
      // public/ được chép sang dist trước bước này, nên sw.js đã nằm sẵn đó.
      const sw = path.join(outDir, 'sw.js');
      if (!existsSync(sw)) return;
      const goc = readFileSync(sw, 'utf8');
      if (!goc.includes(CHO_MA_BAN)) {
        this.error(`public/sw.js thiếu chỗ giữ chỗ ${CHO_MA_BAN} - worker sẽ không bao giờ tự cập nhật.`);
      }
      writeFileSync(sw, goc.split(CHO_MA_BAN).join(maBan));
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), ghiMaBanSw()],

  /*
   * Chuyển tiếp `/api` sang backend, thay vì để trình duyệt gọi thẳng.
   *
   * Không phải để tránh CORS - CORS đã mở sẵn cho localhost:5173. Mà vì COOKIE:
   * phiên đăng nhập được đặt `SameSite=Lax`, nên trình duyệt KHÔNG lưu nó khi
   * localhost gọi sang một tên miền khác. Đăng ký trả về 201 đàng hoàng, cookie
   * bị vứt lặng lẽ, rồi mọi lệnh sau đó đều 401 và app báo "chưa đăng nhập".
   *
   * Hạ xuống `SameSite=None` thì chữa được triệu chứng nhưng mở đường cho CSRF,
   * và trình duyệt đang dần chặn hẳn cookie bên thứ ba. Chuyển tiếp thì trình
   * duyệt chỉ thấy MỘT nguồn là localhost:5173, cookie thành cookie của chính
   * nó - đúng y cách bản deploy đang chạy, nơi `vercel.json` trỏ `/api/*` sang
   * backend. Dev giống thật là chỗ đáng giá nhất của cách này.
   */
  server: { proxy: chuyenTiep(mode) },

  /*
   * `vite preview` cũng phải chuyển tiếp y như dev.
   *
   * Nó phục vụ đúng thư mục `dist` mà Vercel sẽ phục vụ, nên nếu thiếu proxy
   * thì bản xem thử không gọi nổi API - trong khi bản thật thì gọi được nhờ
   * `rewrites` trong vercel.json. Xem thử mà khác hàng thật ở đúng chỗ dễ sai
   * nhất thì xem để làm gì.
   */
  preview: { proxy: chuyenTiep(mode) },
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
    /*
     * Test luôn chạy ở chế độ KHÔNG CÓ SERVER.
     *
     * Vite nạp tệp `.env` cho cả lúc test, nên máy nào có `VITE_API_URL` là bộ
     * test máy ấy tự động gọi mạng - chậm, và kết quả phụ thuộc vào server có
     * đang bật hay không. Ép rỗng để mọi máy chạy giống nhau; đường đi có server
     * đã có bộ test riêng bên `my-task-api`.
     */
    env: { VITE_API_URL: '' },
  },
}));
