# Bậc động phủ

**Đã đủ cả 5 tấm.** Giữ lại đây để lần sau vẽ lại thì biết đường.

Đặt tên đúng như dưới đây thì web tự nhận (thiếu tấm nào thì tấm đó lùi về
`/art/section/dong-phu.png`, không vỡ gì cả):

| File | Bậc | Mô tả trong app |
| --- | --- | --- |
| `1-hang-da-tho.png` | 1 · Hang Đá Thô | Một hốc đá tránh mưa gió, kê được cái lò con và vỡ được hai vạt đất. |
| `2-dong-phu-so-khai.png` | 2 · Động Phủ Sơ Khai | Đục rộng thêm, dựng cửa đá. Linh khí bắt đầu tụ lại chứ không tản hết. |
| `3-linh-dong.png` | 3 · Linh Động | Khoét trúng một mạch linh khí nhỏ. Lò đan cháy đều hơn hẳn. |
| `4-dong-thien.png` | 4 · Động Thiên | Trong động tự thành khí hậu riêng. Linh thảo trồng đâu cũng tốt. |
| `5-phuc-dia.png` | 5 · Phúc Địa | Đất phúc hiếm có, mây lành che đỉnh. Chỗ này đủ để dưỡng tới ngày phi thăng. |

**Quan trọng: vẽ cả năm tấm từ cùng một góc nhìn**, cùng khung cảnh, chỉ khác ở
chỗ mỗi bậc rộng ra và sáng hơn. Đây là thang nâng cấp - người ta nhìn để biết
1400 linh thạch đổi lấy cái gì, nên phải so được tấm 1 với tấm 5.

Nền trong suốt hoặc nền tối đều được. Thả file thô thẳng vào **thư mục này**
(`public/art/cave/`) rồi chạy `npm run art -- cave` - script tự thu về 512×512
và cất bản gốc sang `art-src/`.

Gửi cả 5 tấm gộp trong một sheet cũng được, miễn là nền trong suốt:

```
node scripts/strip-labels.mjs public/art/cave/sheet.png --dry   # soi dải nhãn
node scripts/strip-labels.mjs public/art/cave/sheet.png         # xoá chữ nung sẵn
node scripts/slice-alpha.mjs  public/art/cave/sheet.png --dry   1-hang-da-tho 2-dong-phu-so-khai 3-linh-dong 4-dong-thien 5-phuc-dia
npm run art -- cave
```
