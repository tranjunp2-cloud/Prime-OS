# Kịch bản video hướng dẫn: Product Master · Warehouses · Orders

- **Người xem:** team nội bộ
- **Thời lượng:** khoảng 4 phút 55 giây
- **Lời thoại:** tiếng Việt, giọng thuyết trình tự nhiên
- **Giao diện:** tiếng Anh. Lời thoại giữ nguyên tên nút, tab và cột như trên màn hình, để người xem dễ tìm theo.
- **Phiên bản:** v3 (19/10/2026).
  - v2: bổ sung luồng *đơn bị giữ cho tới khi mọi dòng hàng được map với Master SKU, có kho và có tồn*.
  - v3: bổ sung cảnh 3b *Review & link listing từ shop*.
  - v4: bổ sung cảnh 9b *Xử lý đơn hàng loạt* (Confirm orders, Print packing slips, Shipping labels). Video dài khoảng 7 phút 30 giây.

> Ký hiệu trong lời thoại:
> - `/` là ngắt hơi ngắn.
> - `(ngừng)` là dừng khoảng 1 giây.
> - **In đậm** là chữ cần nhấn giọng.

---

## Chuẩn bị trước khi quay

1. Chạy `npm run dev:web` rồi mở `http://127.0.0.1:5177/#/overview`. App dùng hash route, đường dẫn có dạng `/#/orders`.
2. Thiết lập trình duyệt:
   - Cửa sổ 1920×1080, zoom 100–110%.
   - Ẩn bookmark bar và extension.
   - Tắt thông báo hệ thống.
3. Bật **Demo → With data** trên cả 3 trang Products, Warehouses và Orders.
4. Để ngôn ngữ ở **EN**. Bản VI mới dịch được một phần, quay sẽ thấy lẫn tiếng Anh và tiếng Việt.
5. **Reset trước mỗi lần quay:**
   - Dùng profile trình duyệt mới, hoặc xoá localStorage của `127.0.0.1:5177`. Tồn đầu kỳ ghi ở cảnh 8 được lưu lại, không xoá thì lần quay sau đơn sẽ không còn bị giữ.
   - Mở đơn **DEMO-PREPARE-PAID** và bấm **Restart prototype**.
6. Dữ liệu dùng xuyên suốt:

| Vai trò trong video | Dữ liệu |
|---|---|
| Sản phẩm mẫu | **Black Hardcover Notebook** (`CR-NTB-BLK-A5`) |
| Kho mẫu | **CyberRecord Japan HQ** (`CR-JP`) |
| Đơn thiếu mapping | **DEMO-MAP-UNLINKED**: dòng *Ceramic Watercolor Mixing Palette* chưa link Product Master |
| Đơn thiếu tồn | **DEMO-MAP-STOCK**: *Artist Precision Paint Brush Set* (`CR-BSH-SET-12`), kho **Vietnam 3PL Partner** có 0/3 |
| Đơn xử lý trọn vòng | **DEMO-PREPARE-PAID** |
| Nhóm listing để review & link | **Artist Precision Paint Brush Set — 12-piece** (`CR-BSH-SET-12`): 5 listing trên Amazon, Shopee, Lazada |

7. Bỏ qua trang *Store stock & purchasing* trong bản này. Trang này cần seed dữ liệu POS trước và thuộc phạm vi video POS.

---

## Cảnh 0 — Mở đầu `0:00 – 0:20`

**Màn hình**
- Title card: *Prime OS · Product Master, Warehouses & Orders — Hướng dẫn nội bộ*.
- Fade sang giao diện app, sidebar hiện đầy đủ.

**Lời thoại**
> Chào cả nhà. / Trong khoảng năm phút tới, mình sẽ đi cùng các bạn qua ba khu vực: **Product Master**, **Warehouses** và **Orders**. (ngừng)
> Quan trọng hơn, mình sẽ cho các bạn thấy ba phần này **nối với nhau** như thế nào. / Tại sao có những đơn bị giữ lại, / và cần sửa ở đâu để đơn chạy tiếp. Ok, bắt đầu nhé.

---

## Cảnh 1 — Danh sách Product Master `0:20 – 0:55`

**Màn hình và thao tác**
1. Sidebar → Products → `/#/products/master-catalog`.
2. Hover các tab **All · To do · Active · Archived**, bấm **To do** rồi quay lại **All**.
3. Highlight lần lượt 3 cột **MASTER STATUS**, **MASTER STOCK**, **LINKED LISTINGS**.

**Chữ trên màn hình:** `Product Master = bản gốc của sản phẩm`

**Lời thoại**
> Đầu tiên là **Product Master**. / Các bạn cứ hiểu đơn giản, đây là **bản gốc** của mỗi sản phẩm. Tên, SKU, giá, hình ảnh, biến thể… chỉ quản lý ở **một chỗ** này, / rồi từ đây mới nối ra các shop như Shopee, Lazada hay Amazon. (ngừng)
> Tab mình dùng nhiều nhất là **To do**. Nó gom các bản nháp và những sản phẩm đang có vấn đề. (ngừng)
> Trong bảng thì để ý ba cột: / **Master Status** cho biết đã active hay chưa, / **Master Stock** là tổng tồn kho, / còn **Linked Listings** là sản phẩm này đang được nối với listing ở những shop nào.

---

## Cảnh 2 — Từ sản phẩm sang tồn kho theo kho `0:55 – 1:15`

**Màn hình và thao tác**
1. Gõ `notebook` vào ô **Search products**.
2. Ở dòng *Black Hardcover Notebook*, bấm **3 variants**.
3. Bấm vào số tồn (*Recorded stock*) của biến thể **Black / A4** để bung danh sách theo kho, rồi zoom vào danh sách đó.

**Chữ trên màn hình:** `Product → Stock by warehouse`

**Lời thoại**
> Mình mở thử cuốn **Black Hardcover Notebook**, có ba biến thể A4, B5, A5. / Bấm vào số tồn của từng biến thể là thấy ngay nó đang nằm ở kho nào, bao nhiêu cái. (ngừng)
> Đây là **mối nối đầu tiên**: sản phẩm biết tồn kho của nó nằm ở đâu.

---

## Cảnh 3 — Tạo Product Master mới `1:15 – 1:50`

**Màn hình và thao tác** (tua nhanh 1.5x đoạn điền form)
1. Bấm **Create Product Master**.
2. Điền form:
   - Product name: `Classic Leather Sneakers`
   - Chọn một Category
   - Product type: **With variants**
   - Bấm **Generate SKU**
3. Bấm **Create draft & continue** để vào trang chỉnh sửa.
4. Hover menu trái: **Overview → Product setup → Channel listings**.
5. Highlight thẻ **Product readiness** (đang *1/6*), rồi chỉ chuột vào nút **Complete product** trên header (không bấm). Nút này chỉ đổi thành **Activate Master** khi readiness đã đủ.

**Chữ trên màn hình:** `Readiness xanh hết → mới Activate`

**Lời thoại**
> Tạo sản phẩm mới thì bấm **Create Product Master**: điền tên, danh mục, loại sản phẩm, / SKU thì bấm **Generate SKU** cho nhanh. Bấm **Create draft & continue** là có ngay một bản nháp. (ngừng)
> Trong trang chỉnh sửa, các bạn nhớ giúp mình ô **Product readiness** bên phải. Nó liệt kê còn thiếu gì: mô tả, hình ảnh, giá biến thể, kho… / Khi còn thiếu, nút trên cùng là **Complete product**. Đủ hết thì nó mới chuyển thành **Activate Master**. (ngừng)
> Còn nếu có sẵn file Excel từ shop thì dùng **Import products**. Hệ thống sẽ gợi ý ghép từng listing với Master có sẵn.

---

## Cảnh 3b — Review & link listing từ shop *(mới)* `1:50 – 2:45`

**Màn hình và thao tác**
1. Ở trang Product Master, highlight banner **"26 shop listings to review"**.
2. Bấm **Review & link (26)** để mở *Review shop listings*. Hover khung hướng dẫn 3 bước, rồi bấm **Got it**.
3. Highlight cột **Product Master** ở nhóm *Artist Precision Paint Brush Set — 12-piece* (*Suggested for 5 listings*).
4. Bấm tab **No suggestion**, chỉ vào nút **Choose Master**, rồi quay lại tab **All**.
5. Bấm **Review 5 listings** để mở *Compare product details*:
   - Highlight bảng so sánh các listing.
   - Highlight cột **Master · value to save**.
6. Tick ô *I reviewed all 5 listings…*, rồi bấm **Link all 5 listings**.
7. Ở bước *Review before saving*, bấm **Link all 5 listings** lần nữa.
8. Highlight kết quả **"5 listings linked to 1 Master"** và dòng *Master status and details unchanged…*

**Chữ trên màn hình:** `Listing từ shop → Product Master`

**Lời thoại**
> Cách thứ ba, và cũng là cách dùng nhiều nhất: **Review & link**. (ngừng)
> Khi kết nối shop, listing trên Shopee, Lazada, Amazon được kéo về đây. / Banner phía trên cho biết còn bao nhiêu listing chưa được nối với Product Master. (ngừng)
> Hệ thống đã tự gom các listing giống nhau và gợi ý sẵn một Master. / Listing nào không có gợi ý thì bấm **Choose Master** để tự chọn. / Ví dụ bộ cọ vẽ này có năm listing ở ba shop, mình bấm **Review 5 listings**. (ngừng)
> Bảng so sánh đặt từng listing cạnh nhau: tiêu đề, mô tả, SKU, thương hiệu… / Cột cuối là giá trị sẽ lưu vào Master. / Các bạn kiểm tra đúng sản phẩm, đúng quy cách, đừng chỉ nhìn tên hay SKU. (ngừng)
> Kiểm tra xong thì tick xác nhận, bấm **Link all 5 listings**, xem lại một lần rồi xác nhận. (ngừng)
> Vậy là năm listing đã nối vào một Master. / Bước này chỉ lưu liên kết: dữ liệu Master, nội dung trên shop, tồn kho và đồng bộ đều không đổi.

---

## Cảnh 4 — Tổng quan Warehouses `1:50 – 2:20`

**Màn hình và thao tác**
1. Sidebar → Warehouses → `/#/warehouses`.
2. Hover danh sách kho bên trái, dừng ở *Fulfillment By Shopee MY* để thấy nhãn **Read only**.
3. Bấm **CyberRecord Japan HQ**.
4. Highlight lần lượt 4 cột **Stock · For orders · Other holds · Available (ATP)**.

**Chữ trên màn hình:** `Available (ATP) = Stock − For orders − Other holds`

**Lời thoại**
> Giờ sang **Warehouses**. / Bên trái là danh sách kho: kho nội bộ, kho đối tác 3PL, / và kho do sàn vận hành như Fulfillment by Shopee hay FBA. Mấy kho của sàn thì hệ thống **chỉ đọc số**. (ngừng)
> Mình chọn **CyberRecord Japan HQ**. Bốn con số cần phân biệt: / **Stock** là hàng thực có trong kho, / **For orders** là phần đã giữ cho đơn, / **Other holds** là phần giữ vì lý do khác, / và **Available**, hay ATP, là số **còn bán được thật sự**.

---

## Cảnh 5 — Thao tác tồn kho `2:20 – 2:45`

**Màn hình và thao tác**
1. Ở một dòng sản phẩm, bấm **Actions** và hover qua danh sách: *Receive stock · Adjust stock · Record opening stock · Transfer stock · Manage holds*.
2. Chọn **Adjust stock**:
   - Nhập *Actual stock count*.
   - Reason: **Physical stock count**.
   - Bấm **Record adjustment**.
   - Zoom vào banner kết quả.
3. Mở nhanh **Stock activity**.

**Lời thoại**
> Mỗi dòng có menu **Actions**: nhập hàng, điều chỉnh, chuyển kho, giữ hàng. / Ví dụ kiểm kê thấy lệch, chọn **Adjust stock**, nhập số đếm thực tế, chọn lý do, rồi **Record adjustment**. (ngừng)
> Mọi thay đổi đều nằm trong **Stock activity**. Số có lệch thì cứ vào đây truy lại.

---

## Cảnh 6 — Cầu nối sang đơn hàng `2:45 – 2:55`

**Màn hình và thao tác:** bấm vào con số ở cột **For orders** để mở popover *Order references*.

**Chữ trên màn hình:** `Warehouse ← Order reservation`

**Lời thoại**
> Còn cột **For orders**, bấm vào là thấy những đơn nào đang giữ hàng ở kho này. (ngừng) Và đó là cầu nối sang **Orders**.

---

## Cảnh 7 — Danh sách Orders `2:55 – 3:15`

**Màn hình và thao tác**
1. Sidebar → Orders → `/#/orders`.
2. Lướt chuột qua các tab vòng đời **All · Awaiting confirmation · Preparing · Ready to ship · Shipping · Delivered · Completed**.
3. Bật **Needs review**.
4. Highlight cột **NEXT ACTION**.

**Lời thoại**
> Trang **Orders** gom đơn từ mọi kênh, PrimeWeb, POS, Shopee, TikTok Shop, Lazada, vào một bảng. Các tab đi theo đúng vòng đời của đơn. (ngừng)
> Bật **Needs review** để lọc những đơn có vấn đề. / Còn cột **Next action** luôn cho biết bước tiếp theo cần làm.

---

## Cảnh 8 — Vì sao đơn bị giữ? *(mới)* `3:15 – 4:05`

**Chữ trên màn hình:** `Listing → Master SKU → Warehouse → Stock`
Hiện sơ đồ 4 ô nối bằng mũi tên. Ô bị thiếu sẽ nhấp nháy đỏ ở từng ví dụ.

**8a. Thiếu mapping, đơn DEMO-MAP-UNLINKED**
1. Mở đơn **DEMO-MAP-UNLINKED**.
2. Zoom lần lượt vào:
   - Dòng *"Map every order line to a Master SKU with stock first."* ngay dưới **Next step**
   - Khung **Needs review**
3. Ở dòng *Ceramic Watercolor Mixing Palette 12 Well*, zoom vào nhãn **Needs product mapping · Listing SHP-CER-PAL-12 is not linked to a Product Master**.
4. Bấm **Map product** để mở hộp *Review mapping*, có hai lựa chọn **Find a Product Master** và **Create new Master**.
5. Bấm **Back to order**.

**8b. Thiếu tồn, đơn DEMO-MAP-STOCK, rồi sửa ngay**
1. Mở đơn **DEMO-MAP-STOCK**. Zoom vào **Not enough stock · Vietnam 3PL Partner has 0 of 3 units of CR-BSH-SET-12. Receive or adjust stock in that warehouse.**
2. Sang **Warehouses** và chọn **Vietnam 3PL Partner**.
3. Gõ `CR-BSH-SET-12` vào ô tìm kiếm. Bảng hiện *No warehouse products match*.
4. Bấm **Record opening stock** và điền:
   - Tìm `CR-BSH-SET-12`
   - Nhập `10`
   - Tick ô xác nhận
   - Bấm **Save opening stock**
5. Zoom vào banner *Opening stock saved for 1 SKU…*.
6. Quay lại đơn **DEMO-MAP-STOCK**: cảnh báo đã biến mất và nút **Prepare shipment** bấm được.

> Tua nhanh 1.5x đoạn bước 2–4 của 8b.

**Lời thoại**
> Giờ tới một điểm **mới và rất quan trọng**. (ngừng)
> Một đơn chỉ được chuẩn bị khi **từng dòng hàng** trong đơn đi qua đủ bốn mắt xích: / listing trên shop phải nối với một **Master SKU**, / shop đó phải có **kho xuất hàng**, / và kho đó phải **đủ tồn**. Chỉ cần một dòng thiếu là **cả đơn chờ**. (ngừng)
> Ví dụ đơn Shopee này. Dòng bảng pha màu báo **Needs product mapping**, tức listing chưa được nối với Product Master nào. / Bấm **Map product**, mình chọn một Master có sẵn hoặc tạo Master mới, ngay tại đây, không cần rời khỏi đơn. (ngừng)
> Đơn thứ hai thì lỗi khác: **Not enough stock**. Kho Vietnam 3PL đang có không trên ba bộ cọ. / Mình sang Warehouses, chọn đúng kho đó. SKU này chưa từng được ghi nhận ở đây, nên mình bấm **Record opening stock**, nhập số thực tế đang có là mười, rồi lưu. (ngừng)
> Quay lại đơn: / cảnh báo **biến mất**, nút Prepare shipment đã bấm được. (ngừng)
> Các bạn để ý là mỗi cảnh báo đều **ghi rõ phải sửa ở đâu**: map sản phẩm, gán kho cho shop, hay nhập thêm hàng. Cứ làm theo dòng hướng dẫn đó là được.

---

## Cảnh 9 — Xử lý đơn tới khi hoàn tất `4:05 – 4:40`

**Màn hình và thao tác** (tua nhanh 2x từ bước 4, lời thoại chạy liên tục)
1. Mở đơn **DEMO-PREPARE-PAID**.
2. Zoom vào thanh 6 bước và ô **Next step**.
3. Chỉ vào **Dispatch warehouse** và cột **Inventory** (*Sample stock · 44*).
4. Bấm **Prepare shipment**:
   - Xem lại thông tin điền sẵn (thanh toán, kho xuất, carrier SPX Express, mã vận đơn).
   - Tick ô *I checked all 3 units, packed the parcel and attached the shipping label.*
   - Bấm **Mark ready to ship**.
5. Bấm **Record carrier pickup** (nhập mã biên nhận), tiếp theo là **Simulate tracking update** → **Delivered**, cuối cùng là **Complete order**.
6. Chỉ vào phần **Shipping & packaging** (*Open sample label*).

**Lời thoại**
> Với một đơn đã đủ điều kiện như đơn này, mọi thứ rất thẳng. / Thanh trên cùng là **sáu bước**, ô **Next step** gợi ý luôn nút cần bấm. Dispatch warehouse là kho xuất, cột Inventory cho biết tồn còn đủ không. (ngừng)
> Bấm **Prepare shipment**: thông tin vận chuyển đã điền sẵn, mình chỉ cần kiểm hàng, tick xác nhận đã đóng gói, rồi **Mark ready to ship**. / Shipper lấy hàng thì **Record carrier pickup**. / Sau đó trạng thái giao hàng được cập nhật từ đơn vị vận chuyển. Trong bản demo, mình bấm **Simulate tracking update** để giả lập. / Giao xong thì **Complete order**. Tem và phiếu đóng gói cần in lúc nào cũng có sẵn.

---

## Cảnh 9b — Xử lý đơn hàng loạt *(mới)* `5:50 – 6:45`

**Màn hình và thao tác**
1. Ở `/#/orders`, mở bộ lọc **Available actions** và chọn **Can confirm**. Bảng còn 3 đơn: DEMO-CONFIRM-COD, -PAID, -BANK.
2. Tick ô chọn tất cả. Highlight thanh **3 orders selected** ở đáy màn hình, gồm *Confirm orders (3) · Print packing slips (0) · More*.
3. Bấm **Confirm orders (3)**:
   - Highlight dòng *3 eligible · 0 will be skipped*.
   - Bấm **Confirm 3 orders**.
   - Highlight kết quả *3 succeeded* và từng dòng *Confirmed · Preparing*.
4. Bấm **Print packing slips (3)** ngay trong hộp kết quả. Highlight *3 packing slips sent to the print dialog…*, rồi bấm **Done**.
5. Đổi bộ lọc **Available actions** sang **Shipping label not printed**, rồi tick chọn tất cả 2 đơn.
6. Bấm **Shipping labels (2)** để mở *Print shipping labels*. Highlight các link **Open sample label**, rồi bấm **Done**.

**Chữ trên màn hình:** `Confirm → Packing slips → Shipping labels`

**Lời thoại**
> Đó là xử lý từng đơn. Nhưng mỗi ngày có rất nhiều đơn, nên trang Orders có ba thao tác hàng loạt: / **xác nhận đơn**, **in phiếu đóng gói**, và **in tem vận chuyển**. (ngừng)
> Đầu tiên, lọc **Available actions** theo **Can confirm** để chỉ lấy những đơn đủ điều kiện, rồi chọn tất cả. / Thanh thao tác hiện ra ở dưới. Con số trong ngoặc là số đơn đủ điều kiện cho từng thao tác. (ngừng)
> Bấm **Confirm orders**. Hệ thống kiểm tra lại từng đơn và báo trước đơn nào sẽ bị bỏ qua. / Xác nhận xong, cả ba đơn chuyển sang Preparing. (ngừng)
> Ngay trong kết quả có luôn bước tiếp theo: **Print packing slips**. / Phiếu đóng gói được gửi sang hộp thoại in, trạng thái đơn không đổi. (ngừng)
> Cuối cùng là tem vận chuyển. Lọc các đơn **chưa in tem**, chọn tất cả, rồi bấm **Shipping labels**. / Mỗi đơn có link mở tem gốc của đơn vị vận chuyển để in trước khi bàn giao hàng.

---

## Cảnh 10 — Tổng kết `4:40 – 4:55`

**Màn hình:** lại sơ đồ `Listing → Master SKU → Warehouse → Stock → Order`, các ô lần lượt sáng xanh.

**Lời thoại**
> Tóm lại nhé. / **Product Master** là gốc dữ liệu, / **Warehouses** cho biết hàng ở đâu và còn bán được bao nhiêu, / **Orders** là nơi hàng rời khỏi kho. (ngừng)
> Đơn nào bị giữ, cứ đọc cảnh báo trên dòng hàng, nó chỉ đúng mắt xích đang thiếu. / Có gì thắc mắc thì ping mình trên channel. Cảm ơn cả nhà!

---

## Ghi chú hậu kỳ

- **Phụ đề:** xuất `.srt` từ đúng lời thoại ở trên, giữ nguyên các thuật ngữ tiếng Anh.
- **Nhạc nền:** lo-fi hoặc corporate nhẹ, khoảng −25 dB dưới giọng nói. Hạ thêm nhạc ở cảnh 8 để người xem tập trung.
- **Chuyển cảnh:** dùng thẻ tiêu đề 1 giây giữa các phần: `01 Product Master`, `02 Warehouses`, `03 Orders`, `04 Khi đơn bị giữ`.
- **Sơ đồ 4 mắt xích ở cảnh 8 và 10:** dựng bằng motion graphic (Remotion) để dùng lại cho các video sau.
- **Con trỏ chuột:** bật highlight con trỏ và hiệu ứng click.
