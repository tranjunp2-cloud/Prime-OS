# Cẩm nang hướng dẫn: Quản lý kho và tồn hàng trên Prime OS (Warehouses)

Dành cho team sản phẩm, thiết kế và vận hành. Tên nút và trạng thái được giữ bằng tiếng Anh để dễ tìm trên màn hình.

Hướng dẫn theo UI prototype hiện tại. Các phần còn mô phỏng hoặc chưa hoàn thiện được ghi rõ trong tài liệu.

## Phần 1 Bức tranh tổng quan

### 1 Nguyên tắc cần nhớ

Thay đổi tồn tại kho sẽ cập nhật tồn trong **Product Master**. Tồn trên từng sàn mặc định độc lập, chỉ gửi cập nhật khi người dùng chủ động thiết lập cho listing.

| Loại kho | Có được sửa tồn không? |
| --- | --- |
| **Kho nội bộ và kho 3PL có quyền quản lý tồn trong Prime OS** | Có. Điều chỉnh và chuyển kho theo từng sản phẩm hoặc SKU biến thể. |
| **Kho do sàn quản lý như FBA hoặc FBS** | Không. Chỉ xem số liệu do bên quản lý kho ghi nhận. |
| **Kho ảo hoặc vị trí chưa xác định** | Không. Cần xác định lại loại kho và quyền quản lý trước. |

> **Cần nhớ:** Không phải kho nào đồng bộ từ sàn về cũng có thể sửa. Quyền quản lý tồn quyết định khả năng thao tác, không chỉ việc kho đó là kho vật lý.

### 2 Tra cứu tồn kho

**Vào đâu:** Warehouses → My warehouses.

1. Dùng **All warehouses** để xem tổng hoặc chọn một kho trong **Choose one warehouse**.
2. Tìm theo tên sản phẩm hoặc SKU. Mở rộng dòng sản phẩm để xem tồn theo kho hoặc từng biến thể.
3. Dùng bộ lọc trạng thái tồn, kênh bán và sắp xếp số lượng để tìm sản phẩm cần xử lý.

| Hiển thị | Cách hiểu |
| --- | --- |
| **0 · Out of stock** | Đã ghi nhận số lượng và hiện không còn hàng. |
| **— · Not recorded** | Chưa ghi nhận số lượng; không được hiểu là 0. |
| **Partial data** | Một số biến thể chưa có số liệu. Tổng mới gồm phần đã ghi nhận. |

> **Đọc đúng số liệu:** **Total across warehouses** cộng số đã ghi nhận ở các kho, kể cả kho ngoài. Đây không phải toàn bộ số hàng Prime OS được quyền bán. Bộ lọc **Selling on** chỉ thể hiện kênh có listing đang hoạt động, không chứng minh đã bật đồng bộ tồn.

## Phần 2 Tạo kho và nhập tồn ban đầu

### 1 Tạo kho nội bộ

**Vào đâu:** Warehouses → Add warehouse → Add Physical Warehouse.

1. Nhập **Warehouse Name**, **Warehouse Code** và địa chỉ. Tên kho, mã kho và **Street Address** là các trường tối thiểu để mở nút tạo.
2. Kiểm tra thông tin và bấm **Create Physical Warehouse**. Mã kho được chuyển thành chữ in hoa.
3. Quay lại danh sách và chọn kho mới để kiểm tra. Tạo kho chưa làm phát sinh số lượng tồn và chưa tự liên kết hoặc đồng bộ tồn với shop.

**Kết quả:** Có thêm một kho nội bộ để ghi nhận hàng. Form này chưa phải luồng tạo kho FBA/FBS hay cấu hình kho 3PL.

### 2 Ghi nhận tồn lần đầu cho sản phẩm

**Vào đâu:** Products → Product Master → mở sản phẩm → Pricing & Inventory → Inventory by location → Add stock location.

1. Chọn kho đang hoạt động, có quyền sửa và chưa ghi nhận tồn cho sản phẩm này.
2. Nhập **Initial stock** bằng số lượng thực tế. Có thể nhập 0 nếu đã kiểm đếm và kho đang trống.
3. Chọn **Adjustment reason**, kiểm tra số lượng rồi bấm **Save location & stock**. Bấm **Cancel** nếu chưa muốn lưu.

**Kết quả:** Kho và Product Master có số tồn đầu tiên; lịch sử ghi **Initial count**. Tồn trên sàn không thay đổi.

| Tình huống | Thao tác đúng |
| --- | --- |
| Chưa từng ghi nhận tồn tại kho | Dùng **Add stock location** để ghi số đầu tiên; không dùng **New Adjustment**. |
| Đã có số tồn, kể cả 0 | Dùng **Adjust stock** để cập nhật số lượng thực tế. |
| Sản phẩm có nhiều biến thể | Điều chỉnh riêng từng **Variant SKU** đã có tồn. Luồng thêm vị trí mới cho biến thể chưa hoàn thiện. |

**Ví dụ:** Kho HCM mới tạo chưa có số liệu cho sản phẩm A. Ghi **Initial stock = 100** sẽ tạo bản ghi **Not recorded → 100**, không coi đây là điều chỉnh từ 0.

> **Phạm vi hiện tại:** **Add stock location** hiện hỗ trợ sản phẩm **Single**. Kho FBA/FBS không xuất hiện như một lựa chọn được phép nhập tồn thủ công.

## Phần 3 Điều chỉnh và chuyển kho

### 1 Điều chỉnh theo số kiểm đếm

**Vào đâu:** Warehouses → chọn kho và sản phẩm → Adjust stock. Hoặc Stock actions & history → New Adjustment.

1. Chọn **Warehouse** và **Product**. Nếu có biến thể, chọn đúng **Variant SKU**.
2. Xem **Current stock**, nhập **New stock** là tổng số thực tế còn lại, không phải số muốn cộng hoặc trừ.
3. Chọn **Adjustment reason**, kiểm tra chênh lệch rồi bấm **Record adjustment**.

**Ví dụ:** Hệ thống đang ghi 100, kiểm đếm còn 92 → nhập **92**. Hệ thống tự tính giảm 8, lưu lý do và cập nhật Product Master.

> **Kiểm tra trước khi lưu:** Chỉ nhận số nguyên từ 0 trở lên, có thay đổi và có lý do. Nếu tồn bị thay đổi trong lúc mở form, đóng rồi mở lại để kiểm tra số mới. SKU chưa có số tồn hoặc kho chỉ đọc sẽ bị chặn.

### 2 Chuyển hàng giữa hai kho

**Vào đâu:** Warehouses → Stock actions & history → Transfer Stock.

1. Chọn **Source Warehouse** và **Destination Warehouse**. Hai kho phải khác nhau và đều có quyền sửa tồn.
2. Chọn **Product or SKU**; với sản phẩm nhiều biến thể, chọn SKU cụ thể.
3. Nhập **Transfer Quantity** là số nguyên dương, không vượt quá số đã ghi nhận tại kho nguồn. Bấm **Create Transfer**.

**Kết quả:** Chuyển 20 từ HCM có 100 sang Hà Nội có 30 → HCM còn 80, Hà Nội có 50. Tổng hai kho vẫn là 130; tồn trên sàn không đổi.

> **Giới hạn quan trọng:** Prototype trừ kho nguồn và cộng kho đích ngay khi xác nhận. Chưa có luồng thực tế **xuất kho → đang vận chuyển → nhận hàng**; cũng chưa kiểm tra lượng đã giữ cho đơn trước khi chuyển.

### 3 Kiểm tra lịch sử

**Vào đâu:** Warehouses → Stock actions & history → Stock Adjustments.

Xem SKU, kho, số trước và sau, lý do, thời gian. Lần ghi nhận đầu tiên hiển thị **Initial count**; thao tác điều chỉnh hiển thị phần tăng hoặc giảm.

> **Phân biệt:** Lịch sử điều chỉnh được lưu trên thiết bị hiện tại; **Operator** đang là **Local demo**. Danh sách **Stock Transfers** vẫn là dữ liệu mẫu, chưa tự thêm phiếu từ thao tác chuyển kho.

## Phần 4 Liên kết gian hàng và phạm vi prototype

### 1 Liên kết shop khác với đồng bộ tồn

Tại **Warehouses**, mở **Locations & shops** hoặc **Warehouse details → Linked shops** để xem các shop liên quan và trạng thái kết nối. **Manage shop connections** đưa bạn tới **Sales Channels → Connected Channels**.

Một shop đã liên kết với kho không có nghĩa mọi thay đổi tồn đều được gửi lên shop đó. Muốn gửi tồn, cần cấu hình riêng cho listing.

**Cấu hình ở đâu:** Product Master → mở sản phẩm → Sales Channels → Manage listing → Price & inventory → Adjust inventory → Stock sync policy.

| Lựa chọn | Ý nghĩa |
| --- | --- |
| **Do not publish stock** | Không gửi số tồn. Giữ tồn của listing độc lập với Master. |
| **Automatic sync** | Thiết lập lấy tồn từ nguồn đã chọn; có thể giữ lại **Safety buffer** và giới hạn bằng **Channel allocation cap**. |
| **Manual update** | Nhập **Quantity to send** cho listing, không sửa tồn thực tế tại kho. |

Xem số lượng dự kiến trước khi **Review & publish**.

> **Lưu ý:** Kết quả trong prototype chưa xác nhận tồn đã cập nhật thật lên sàn. Với **Amazon FBA**, tồn do Amazon quản lý; Master không ghi đè.

### 2 Tồn hiện có và ATP không phải một số

**Stock on hand** là lượng đã ghi nhận tại kho. **ATP** là lượng có thể cam kết cho đơn sau khi trừ phần đã giữ và mức dự phòng. Không dùng **Total across warehouses** thay cho ATP.

**Stock breakdown** trong phần nâng cao đang dùng số mẫu. ATP được minh họa bằng **On hand − Reserved − Safety stock**; nếu kết quả âm thì hiển thị 0. Chưa liên thông đầy đủ với đơn hàng và việc giữ hoặc nhả tồn.

### 3 Những phần cần hoàn thiện tiếp

- **Tạo kho:** Dữ liệu kho mới chỉ giữ trong phiên hiện tại. **Manager**, **Phone Number** và **Allow Negative Stock** chưa được lưu hoặc áp dụng đầy đủ.
- **Tồn biến thể:** Cần bổ sung luồng nhập số đầu tiên cho SKU chưa có tồn tại một vị trí mới.
- **Chuyển kho:** Cần phiếu chuyển thực, trạng thái giao nhận và lịch sử. Hiện mới thay đổi số lượng ngay trong prototype.
- **Mapping và routing:** **Link Warehouse** hiện chỉ báo thao tác; các tùy chọn chọn kho giao hàng chưa điều khiển đơn thực tế. Đồng bộ với nhà cung cấp cần được kiểm chứng khi tích hợp.

> **Tóm tắt cho team:** Chọn đúng kho và SKU → kiểm tra số đã ghi nhận → lưu số thực tế kèm lý do → kiểm tra Product Master và lịch sử. Chỉ thiết lập gửi tồn ra sàn khi có nhu cầu rõ ràng.
