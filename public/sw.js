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
 *  - Mỗi bản build có MÃ BẢN riêng (BAN bên dưới - plugin `ghiMaBanSw` trong
 *    vite.config.ts thay chỗ giữ chỗ bằng mã băm của bản build). Tệp sw.js vì
 *    thế đổi theo từng lần deploy → trình duyệt thấy worker mới → cài, dọn kho
 *    vỏ cũ, nắm quyền → trang tải lại một lần (xem index.html). Trước đây tên
 *    kho đóng cứng `-v3`: sw.js không bao giờ đổi, nên máy đã cài giữ nguyên
 *    worker cũ và kho vỏ cứ phình mãi theo mỗi lần deploy.
 *  - Trang HTML: **mạng trước, có hạn chờ**. Có mạng thì lấy bản mới nhất VÀ
 *    cất lại vào kho (trước đây không cất, nên mất mạng là mở ra đúng bản HTML
 *    từ hồi cài đặt, trỏ tới những chunk đã bị xoá). Mạng chập chờn quá 3,5
 *    giây thì mở bản đã cất cho khỏi treo màn chờ.
 *  - `assets/`: tên tệp đã mang mã băm nên nội dung không bao giờ đổi dưới
 *    cùng một tên. Lấy từ kho thẳng, an toàn tuyệt đối.
 *  - `art/`: dùng bản trong kho ngay, đồng thời lặng lẽ hỏi lại mạng để lần
 *    sau có bản mới (stale-while-revalidate). Tranh thay nội dung mà giữ tên
 *    thì cũng chỉ trễ một lần mở, không kẹt mãi như cache-first.
 *  - `api/`: KHÔNG bao giờ lưu. Dữ liệu cũ mà tưởng mới thì còn hại hơn lỗi mạng.
 */

/** Mã bản build. Ở dev (không qua build) giữ nguyên chuỗi giữ chỗ này. */
const BAN = '__DAO_TRINH_BUILD_ID__';
const TIEN_TO = 'dao-trinh-';
/** Kho vỏ theo từng bản: HTML + chunk JS/CSS + font. Đổi bản là đổi kho. */
const VO = `${TIEN_TO}vo-${BAN}`;
/**
 * Kho tranh KHÔNG theo bản: tranh ít khi đổi mà nặng, deploy nào cũng tải lại
 * 19 MB thì phí. Đã có stale-while-revalidate lo phần làm mới. Giữ đúng tên
 * `-v3` cũ để máy đã cài không phải tải lại tranh đã có.
 */
const ANH = `${TIEN_TO}anh-v3`;
const DUNG = [VO, ANH];
/** Kho tranh giữ tối đa chừng này mục; quá thì bỏ bớt mục cũ nhất. */
const ANH_TOI_DA = 400;
/** Chờ mạng bao lâu cho trang HTML trước khi mở bản đã cất. */
const HAN_CHO_HTML = 3500;

/** Trang dự phòng khi mất mạng. */
const TRANG = '/index.html';

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(VO)
      // `cache: 'reload'`: đi thẳng máy chủ, không lấy bản HTML cũ trong HTTP cache.
      .then((c) => c.add(new Request(TRANG, { cache: 'reload' })))
      .then(() => self.skipWaiting()),
  );
});

/** Bỏ bớt mục cũ nhất cho kho tranh không phình vô hạn. */
async function tiaKho(ten, toiDa) {
  const cache = await caches.open(ten);
  const khoa = await cache.keys();
  const thua = khoa.length - toiDa;
  if (thua <= 0) return;
  // `keys()` trả theo thứ tự cất vào, nên mấy mục đầu là cũ nhất.
  await Promise.all(khoa.slice(0, thua).map((k) => cache.delete(k)));
}

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      // Chỉ dọn kho của chính app (tiền tố `dao-trinh-`), kho lạ thì để yên.
      .then((ten) =>
        Promise.all(
          ten.filter((t) => t.startsWith(TIEN_TO) && !DUNG.includes(t)).map((t) => caches.delete(t)),
        ),
      )
      .then(() => tiaKho(ANH, ANH_TOI_DA))
      .catch(() => {})
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

/** Cất vào kho mà không bao giờ làm hỏng câu trả lời đang gửi đi. */
const cat = (cache, req, res) => cache.put(req, res).catch(() => {});

/** Lấy từ mạng, lưu lại, hỏng thì lấy bản đã lưu. */
async function mangTruoc(req, kho) {
  const cache = await caches.open(kho);
  try {
    const res = await fetch(req);
    if (catDuoc(res)) cat(cache, req, res.clone());
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
  if (catDuoc(res)) cat(cache, req, res.clone());
  return res;
}

/**
 * Stale-while-revalidate: trả bản trong kho ngay, đồng thời hỏi mạng để cập
 * nhật cho lần sau. `fetch` ở đây vẫn tôn trọng HTTP cache (tranh có
 * max-age 7 ngày), nên phần lớn lượt "hỏi lại" không tốn một byte mạng nào.
 */
async function cuTruocRoiLamMoi(e, kho) {
  const req = e.request;
  const cache = await caches.open(kho);
  const cu = await doiChieu(cache, req);
  const moi = fetch(req).then(async (res) => {
    if (catDuoc(res)) await cat(cache, req, res.clone());
    return res;
  });
  if (cu) {
    e.waitUntil(moi.catch(() => {}));
    return cu;
  }
  return moi;
}

/**
 * Điều hướng trang: mạng trước, nhưng không chờ mãi.
 *
 * Bản HTML mới tải về thì CẤT LẠI (dưới khoá `/index.html` - mọi đường dẫn đều
 * được rewrite về đúng trang ấy), để lần mở lúc mất mạng là bản gần nhất chứ
 * không phải bản từ hồi cài worker.
 */
async function dieuHuong(e) {
  const cache = await caches.open(VO);
  const mang = fetch(e.request).then(async (res) => {
    // Trang bị chuyển hướng thì không cất: đem nó trả cho một lượt điều hướng
    // khác sẽ bị trình duyệt từ chối (redirect mode không khớp).
    const laHtml = (res.headers.get('content-type') || '').includes('text/html');
    if (catDuoc(res) && !res.redirected && laHtml) await cat(cache, TRANG, res.clone());
    return res;
  });
  // Dù trả bản cũ vì mạng chậm, vẫn để lượt tải chạy tiếp mà cất bản mới.
  e.waitUntil(mang.catch(() => {}));

  let hen;
  const hetGio = new Promise((giai) => {
    hen = setTimeout(giai, HAN_CHO_HTML, 'het-gio');
  });
  try {
    const kq = await Promise.race([mang, hetGio]);
    if (kq !== 'het-gio') return kq;
    // Mạng quá chậm: có bản cất thì mở luôn, không có thì đành chờ tiếp.
    const cu = await doiChieu(cache, TRANG);
    return cu ?? (await mang);
  } catch (err) {
    const cu = await doiChieu(cache, TRANG);
    if (cu) return cu;
    return Response.error();
  } finally {
    clearTimeout(hen);
  }
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
        // Chỉ nhận tệp của chính mình, và không bao giờ nhận /api.
        let url;
        try {
          url = new URL(u, self.location.origin);
        } catch {
          continue;
        }
        if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) continue;
        if (!(await cache.match(url.href, { ignoreVary: true }))) chuaCo.push(url.href);
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

  if (request.mode === 'navigate') {
    e.respondWith(dieuHuong(e));
    return;
  }

  if (url.pathname.startsWith('/assets/')) {
    e.respondWith(khoTruoc(request, VO));
    return;
  }

  if (url.pathname.startsWith('/art/')) {
    e.respondWith(cuTruocRoiLamMoi(e, ANH));
    return;
  }

  // Chính sw.js thì trình duyệt tự lo, không đi qua đây; còn lại (manifest,
  // icon, font rời): mạng trước cho chắc là mới.
  e.respondWith(mangTruoc(request, VO));
});
