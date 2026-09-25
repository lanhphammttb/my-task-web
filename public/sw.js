/*
 * Service worker - để app mở được khi mất mạng và cài lên màn hình chính.
 *
 * Cả ứng dụng vốn chạy bằng localStorage, tức là *đáng lẽ* offline hoàn hảo.
 * Vậy mà mất mạng là không mở nổi, chỉ vì trình duyệt không tải nổi mấy tệp
 * tĩnh. Tệp này lấp đúng khoảng đó.
 *
 * VIẾT TAY chứ không dùng Workbox, vì cái cần kiểm soát ở đây rất cụ thể: thư
 * mục `art/` nặng 19 MB. Precache tất tần tật là bắt người ta tải 19 MB ngay
 * lần đầu mở app - tệ hơn hẳn vấn đề đang chữa. Ở đây chỉ giữ phần vỏ, còn ảnh
 * thì gặp cái nào lưu cái đó.
 *
 * Nguyên tắc để KHÔNG BAO GIỜ kẹt ở bản cũ:
 *
 *  - Trang HTML: **mạng trước**. Có mạng thì luôn lấy bản mới nhất, nên đẩy
 *    bản mới lên là lần mở sau đã thấy. Mất mạng mới lấy bản đã lưu.
 *  - `assets/`: tên tệp đã mang mã băm nên nội dung không bao giờ đổi dưới
 *    cùng một tên. Lấy từ cache thẳng, an toàn tuyệt đối.
 *  - `api/`: KHÔNG bao giờ lưu. Dữ liệu cũ mà tưởng mới thì còn hại hơn lỗi mạng.
 */

const VO = 'dao-trinh-vo-v3';
const ANH = 'dao-trinh-anh-v3';
const DUNG = [VO, ANH];

/** Trang dự phòng khi mất mạng. */
const TRANG = '/index.html';

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VO).then((c) => c.add(TRANG)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((ten) => Promise.all(ten.filter((t) => !DUNG.includes(t)).map((t) => caches.delete(t))))
      .then(() => self.clients.claim()),
  );
});

/*
 * Đối chiếu kho, BỎ QUA `Vary`.
 *
 * Đây là chỗ làm mất nguyên buổi. Tệp đã nằm trong kho hẳn hoi, mà mất mạng
 * vẫn `net::ERR_FAILED`: `cache.match` mặc định tôn trọng header `Vary`, nên
 * bản lưu bằng `cache.add(url)` (request trần) không khớp với request thật của
 * trình duyệt khi nạp mô-đun (`mode: 'cors'`, có `Origin`). Trượt, rơi xuống
 * `fetch`, mà offline thì `fetch` chết.
 *
 * Ở đây địa chỉ đã đủ để định danh - tệp trong `assets/` đều mang mã băm - nên
 * bỏ `Vary` là đúng, không mất gì.
 */
const doiChieu = (cache, req) => cache.match(req, { ignoreVary: true });

/*
 * Cất được không.
 *
 * `res.ok` nhận cả dải 200-299, trong đó có **206 Partial Content** - thứ máy
 * chủ trả về khi trình duyệt xin MỘT KHÚC tệp. Video luôn được xin theo khúc.
 * Mà `cache.put` từ chối thẳng 206:
 *
 *   TypeError: Failed to execute 'put' on 'Cache':
 *   Partial response (status code 206) is unsupported
 *
 * Lỗi ấy làm vỡ lời hứa đã đưa cho `respondWith`, nghĩa là request coi như
 * HỎNG - nên video độ kiếp không tải nổi, chỉ mờ đi rồi đứng nguyên. Một dòng
 * `res.ok` sai kéo theo cả một đoạn phim không chạy.
 */
const catDuoc = (res) => res.status === 200;

/** Lấy từ mạng, lưu lại, hỏng thì lấy bản đã lưu. */
async function mangTruoc(req, kho) {
  const cache = await caches.open(kho);
  try {
    const res = await fetch(req);
    if (catDuoc(res)) cache.put(req, res.clone());
    return res;
  } catch (err) {
    const cu = await doiChieu(cache, req);
    if (cu) return cu;
    throw err;
  }
}

/** Có trong kho thì dùng luôn; chưa có thì tải rồi cất. */
async function khoTruoc(req, kho) {
  const cache = await caches.open(kho);
  const cu = await doiChieu(cache, req);
  if (cu) return cu;
  const res = await fetch(req);
  if (catDuoc(res)) cache.put(req, res.clone());
  return res;
}

/*
 * Ươm kho vỏ sau lần tải đầu.
 *
 * Lần mở ĐẦU tiên, trang tải xong hết tệp rồi service worker mới nắm quyền -
 * nên mấy tệp ấy đi thẳng qua mạng, không qua tay worker, và không nằm trong
 * kho. Tải lại lúc mất mạng là trắng màn hình: HTML có (đã precache) nhưng JS
 * thì không.
 *
 * Trang tự liệt kê đúng những tệp nó đang dùng rồi gửi sang đây. Làm vậy thì
 * tên tệp mang mã băm không cần biết trước, khỏi phải sinh danh sách lúc build.
 */
self.addEventListener('message', (e) => {
  if (e.data?.kieu !== 'uom-kho' || !Array.isArray(e.data.urls)) return;
  e.waitUntil(
    caches.open(VO).then(async (cache) => {
      const chuaCo = [];
      for (const u of e.data.urls) {
        if (!(await cache.match(u, { ignoreVary: true }))) chuaCo.push(u);
      }
      // Từng tệp một: `addAll` mà một tệp hỏng là hỏng cả mẻ.
      await Promise.all(chuaCo.map((u) => cache.add(u).catch(() => {})));
    }),
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;

  /*
   * Xin một khúc tệp thì để thẳng cho mạng, không xen vào.
   *
   * Trình duyệt phát video bằng cách xin từng khúc (`Range`), và bản trả về là
   * 206 - thứ không cất vào kho được. Đáp lại bằng một bản ĐẦY ĐỦ lấy từ kho
   * cũng sai: trình duyệt xin byte 1000-2000 mà nhận cả tệp thì nó tính sai
   * mốc thời gian, tua hỏng. Lùi ra là cách đúng duy nhất.
   */
  if (request.headers.has('range')) return;

  const url = new URL(request.url);
  // Chỉ lo phần của chính mình; CDN hay miền khác thì để nguyên.
  if (url.origin !== self.location.origin) return;

  // Dữ liệu thì không bao giờ lưu.
  if (url.pathname.startsWith('/api/')) return;

  // Điều hướng trang: mạng trước, mất mạng thì mở bản đã lưu.
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request).catch(() =>
        caches.open(VO).then((c) => doiChieu(c, TRANG)).then((r) => r ?? Response.error()),
      ),
    );
    return;
  }

  if (url.pathname.startsWith('/assets/')) {
    e.respondWith(khoTruoc(request, VO));
    return;
  }

  if (url.pathname.startsWith('/art/')) {
    e.respondWith(khoTruoc(request, ANH));
    return;
  }

  // Còn lại (manifest, icon, font rời): mạng trước cho chắc là mới.
  e.respondWith(mangTruoc(request, VO));
});
