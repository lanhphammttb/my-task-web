# Tài nguyên cho thế giới 3D — Đạo Trình

Bộ art 2D đã đủ (xem [`art-brief.md`](art-brief.md)). Tài liệu này chỉ nói về lớp
**thế giới 3D** phủ lên trên nền tranh: `src/components/Scene3DBackdrop.tsx` và
bộ dựng hình `src/components/scene3d/build.ts`.

---

## 1. Đang có gì — và tốn bao nhiêu byte

**Không byte nào.** Toàn bộ lớp 3D hiện sinh bằng thuật toán lúc chạy:

| Thứ | Dựng bằng gì |
|---|---|
| Ba tầng núi có sống núi bắt sáng | `ExtrudeGeometry` từ đường cong đỉnh núi, vát cạnh để hứng đèn |
| Sáu đảo tiên lơ lửng | Khối hai mươi mặt bị bóp méo bằng hàm nhiễu theo toạ độ |
| Tháp nhiều tầng trên đảo | Trụ + nón xếp chồng, gộp thành một khối |
| Sương trôi ngang | Canvas 2D vẽ chồng đốm mờ, bọc mặt nạ mềm bốn mép |
| Dòng linh khí bay lên | Shader hạt, hơn một nghìn hạt trong đúng một lượt vẽ |
| Sao trời, quầng sáng xa | Điểm và sprite |
| Đổi sắc theo cảnh giới | Nhuộm dần mọi vật liệu, đột phá là cả thế giới chuyển màu |

Đổi lại: hình khối đơn giản, **không có nhân vật, không có bề mặt vật liệu
thật**. Đó chính là chỗ cần asset thật.

---

## 2. Ba điều bắt buộc, quyết định trước khi đặt bất cứ thứ gì

**1. Trần dung lượng cho toàn bộ 3D: 8 MB.**
`public/art` hiện đã 22,8 MB. Vượt trần này là lần mở app đầu tiên chậm thấy rõ,
mà cái giá phải trả cho một lớp nền thì không đáng.

**2. Model phải đọc được ở dạng bóng.**
Lớp 3D chạy ở độ mờ thấp để tranh 2D phía dưới còn thấy. Chi tiết nhỏ, hoa văn
li ti, chữ khắc — đổ vào đây là mất trắng. **Bóng ngoài phải rõ** mới ăn tiền.

**3. Không đặt lại thứ code đã dựng được.**
Núi, đảo, tháp, mây, hạt sáng đã có. Đặt thêm model cho mấy thứ này chỉ tốn tải
mà nhìn không khá hơn. Cũng **đừng đặt skybox kín trời** — lớp 3D nằm đè lên
tranh, phủ kín là xoá luôn bộ tranh cảnh giới vừa vẽ xong.

---

## 3. Cần đặt gì — xếp theo mức đáng làm

### Ưu tiên 1 — Nhân vật tu sĩ 3D  ⚠️ cần tool chuyên dụng

Thứ duy nhất thật sự thiếu. Hiện khu trung tâm là ảnh chibi 2D đứng yên; thay
bằng nhân vật 3D là đổi hẳn cảm giác — nhân vật ngồi thiền khi vào Bế Quan, hào
quang bùng lên khi đột phá, xoay nhẹ theo góc nhìn.

| Mục | Yêu cầu |
|---|---|
| File | `public/art/model/cultivator.glb` (glTF 2.0 nhị phân) |
| Dung lượng | ≤ 1,5 MB sau nén Draco |
| Lưới | ≤ 15.000 tam giác |
| Xương | Chuẩn Mixamo (để thay animation sau này không phải rig lại) |
| Animation | 3 clip, đặt đúng tên: `idle`, `meditate`, `breakthrough` |
| Texture | Một bộ duy nhất, baseColor + normal, ≤ 1024×1024, nhúng trong glb |
| Trục | Y hướng lên, mặt quay về +Z, gốc toạ độ đặt **dưới chân** |
| Tạo hình | Bám mô tả nhân vật ở mục A6 của `art-brief.md` cho khớp bộ `avatar/` |

### Ưu tiên 2 — Panorama trời tiên cảnh  ⚠️ cần tool sinh ảnh

Ảnh phẳng, không phải model. Dùng làm nền xa cho lớp 3D, thay quầng sáng đang vẽ
bằng gradient. **Bốn tấm** là đủ cho mười cảnh giới:

| File | Dùng cho cảnh giới | Nội dung |
|---|---|---|
| `sky/dawn.webp` | Luyện Khí, Trúc Cơ | Bình minh, mây thấp, sắc lam ngọc |
| `sky/gold.webp` | Kim Đan, Nguyên Anh, Hoá Thần | Nắng vàng xuyên mây, ấm |
| `sky/void.webp` | Luyện Hư, Hợp Thể | Trời đêm sâu, dải ngân hà |
| `sky/storm.webp` | Đại Thừa, Độ Kiếp, Phi Thăng | Mây vần vũ, sắc đỏ tía, có tia sét xa |

Quy cách: equirectangular 2048×1024, `.webp` chất lượng 80, ≤ 400 KB mỗi tấm.
**Không cần `.hdr` thật** — lớp này không dùng chiếu sáng PBR nặng.

### Ưu tiên 3 — Linh thú 3D  ⚠️ cần tool chuyên dụng

Bay lượn quanh đảo tiên, hoặc đứng cạnh nhân vật khi đã thu phục. Bộ tranh
`public/art/beast/` sẵn 17 con — **dùng chính mấy tấm ấy làm ảnh mẫu** cho tool
sinh model, khỏi lệch tạo hình.

Làm trước ba con dễ nhận nhất: **Thanh Long, Bạch Hổ, Phượng Hoàng.**

| Mục | Yêu cầu |
|---|---|
| File | `public/art/model/beast/<slug>.glb`, trùng slug với ảnh 2D đang có |
| Dung lượng | ≤ 800 KB mỗi con |
| Lưới | ≤ 8.000 tam giác |
| Animation | 1 clip `float` (bay lượn tại chỗ) là đủ |

### Ưu tiên 4 — Pháp bảo / phi kiếm  ⚠️ cần tool chuyên dụng

Vật nhỏ, xoay quanh nhân vật, mở dần theo cảnh giới. Đây là thứ **làm sau cùng**
vì phải có mới thấy thiếu, chưa có cũng không ai để ý.

≤ 2.000 tam giác, ≤ 200 KB mỗi món. Bốn món cho chín cảnh giới là đủ.

### Ưu tiên 5 — Âm thanh  ⚠️ cần bạn cấp file có bản quyền

Đang có `ambient.mp3`. Thiếu tiếng điểm nhấn, mỗi tiếng chỉ 1–2 giây:

| File | Khi nào kêu |
|---|---|
| `sfx/breakthrough.webm` | Đột phá cảnh giới thành công |
| `sfx/complete.webm` | Xong một nhật khoá |
| `sfx/bell.webm` | Vào và ra Bế Quan |

Opus mono 48 kbps, ≤ 60 KB mỗi tiếng.

---

## 4. Video — không cần thêm

Đã có `thien-loi.mp4` (thiên lôi) và `tu.mp4`. Ba file media hiện chiếm 8,6 MB,
tức hơn một phần ba toàn bộ `public/art`. **Đừng thêm video mới.** Cần hiệu ứng
động gì nữa thì làm bằng shader — vừa nhẹ hơn vài chục lần, vừa đổi màu được
theo cảnh giới, thứ mà video quay sẵn chịu chết.

---

## 5. Ai làm được gì

| Việc | Ai |
|---|---|
| Núi, đảo, tháp, sương, hạt linh khí, chuyển sắc cảnh giới | ✅ đã xong bằng code |
| Texture sinh bằng thuật toán: đá, nhiễu, gradient, sprite hạt | ✅ tôi viết code sinh được |
| Cắt, nén, đổi định dạng, tách nền ảnh gửi tới | ✅ script `npm run art` |
| **Tranh vẽ: panorama trời, icon mới** | ⚠️ **cần bạn cấp** — tôi không có công cụ sinh ảnh, và code thì không vẽ ra được nét tranh khớp bộ art hiện có |
| **Model `.glb` (nhân vật, linh thú, pháp bảo)** | ⚠️ **cần bạn cấp** — phải có tool 3D và tài khoản trả phí |
| **File âm thanh** | ⚠️ **cần bạn cấp** — vấn đề bản quyền |

### Tool cho phần cần bạn làm

| Việc | Tool | Ghi chú |
|---|---|---|
| Sinh model từ ảnh 2D có sẵn | Meshy, Tripo, Luma | Đưa thẳng ảnh trong `public/art/beast/` vào |
| Gắn xương và animation người | Mixamo | Miễn phí, xuất ra đúng chuẩn xương cần dùng |
| Dọn lưới, giảm poly, xuất glb | Blender | Miễn phí |
| Nén trước khi giao | `npx gltf-transform optimize vào.glb ra.glb` | Thường giảm 60–80% dung lượng |

**Giao file cho tôi ở dạng thô cũng được** — nặng vài chục MB, chưa nén, chưa
giảm poly đều xử lý được. Chỉ **ba điều phải đúng** vì sửa lại rất tốn công:
trục Y hướng lên, gốc toạ độ dưới chân, và tên clip animation đúng như bảng trên.

---

## 6. Prompt mẫu cho tool sinh model

Dán vào Meshy/Tripo, kèm ảnh mẫu lấy từ `public/art/`:

**Nhân vật**
```
young Chinese xianxia cultivator, flowing hanfu robes, long black hair,
stylized game character, clean readable silhouette, T-pose, symmetrical,
low poly game asset, single texture atlas, no base, no pedestal
```

**Linh thú**
```
Chinese mythological <tên con vật> spirit beast, xianxia style, stylized
game creature, bold readable silhouette, low poly game asset, single
texture atlas, neutral pose, no base, no pedestal
```

**Nhắc lại điều dễ quên nhất**
1. `no base, no pedestal` — tool rất hay dựng kèm bệ đá, mà bệ ấy phải xoá tay.
2. `T-pose, symmetrical` cho nhân vật, nếu không thì Mixamo gắn xương hỏng.
3. Đưa ảnh mẫu vào, đừng chỉ tả bằng chữ — không thì mỗi con ra một phong cách.
