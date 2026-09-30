# Cẩm nang hướng dẫn Seller: Từ thiết lập đến đăng bán thành công sản phẩm đa sàn trên Prime OS (Product Master & PIM)

Dành cho Seller mới bán hàng trên Amazon, Rakuten, Shopee, TikTok Shop. Làm lần lượt từ thiết lập nền tảng đến kiểm tra sản phẩm đã hiển thị trên gian hàng. Tên nút và trạng thái được giữ bằng tiếng Anh để dễ tìm trên màn hình.

Hướng dẫn theo UI prototype hiện tại. Kết quả mô phỏng trong prototype chưa xác nhận sản phẩm đã được đăng thật lên sàn.

## Phần 1 Bức tranh tổng quan

Prime OS giúp bạn nhập thông tin sản phẩm gốc một lần, dùng lại cho nhiều gian hàng và tùy chỉnh nội dung theo từng sàn.

| Khái niệm | Cách hiểu và ví dụ |
| --- | --- |
| **Product Master** | Bản ghi sản phẩm gốc duy nhất trong danh mục nội bộ, ví dụ Áo thun Prime Basic. |
| **Channel Listing** | Bản đăng bán trên một gian hàng cụ thể, ví dụ áo này trên Shopee VN. |
| **Category** | Danh mục nội bộ vừa phân loại sản phẩm, vừa quy định bộ thuộc tính cần điền. Ví dụ Áo thun có Chất liệu, Màu và Size. |
| **Attribute library** | Thư viện thuộc tính dùng chung. Người quản lý gắn thuộc tính vào từng Category và chọn Required hoặc Optional. |

**Family đã gộp vào Category:** Seller chỉ chọn một Category, không chọn thêm khuôn mẫu. Danh mục trên từng sàn vẫn được đối chiếu riêng qua **Channel mapping**.

### Hành trình đăng bán

```text
Thiết lập shop, kho, Brand và Category
    |
    v
Create draft & continue -> Hoàn thiện dữ liệu, thuộc tính, giá và tồn
    |
    v
Link another channel -> Cấu hình listing theo shop
    |
    v
Publish product -> Chốt bản Master
    |
    v
Manage listing -> Review & publish -> Confirm & publish
    |
    v
Kiểm tra kết quả trên sàn -> Theo dõi tồn và cập nhật nội dung
```

### Hai lớp kiểm tra trước khi bán

| Kiểm tra | Đánh giá gì | Đủ điều kiện khi |
| --- | --- | --- |
| **Product readiness** | Dữ liệu Master, thuộc tính Category, giá, tồn và bước chuẩn bị kênh | Hết mục thiếu trong Complete product. Overall readiness là tiến độ tổng hợp. |
| **Kiểm tra listing** | Nội dung, SKU, giá, tồn và Channel requirements của từng gian hàng | Hết mục cần bổ sung; có thể Review & publish. |

Brand dùng được ngay sau khi lưu; yêu cầu phê duyệt thương hiệu của sàn được xử lý riêng cho listing. Master đầy đủ không có nghĩa mọi listing đều đủ điều kiện đăng bán.

> **Cần nhớ:** Lưu Draft, chốt phiên bản Master và gửi listing lên sàn là ba việc khác nhau. Chốt Master dùng **Publish product** lần đầu hoặc **Publish updates** khi cập nhật; không tự đăng listing lên sàn.

## Phần 2 Bước 1 Thiết lập nền tảng

Thực hiện trước khi bán lần đầu; dùng lại cho các sản phẩm sau.

### 1 Kết nối gian hàng

**Vào đâu:** Sales Channels → Connected Channels → Connect Store.

1. Chọn sàn, đăng nhập và cấp quyền cho đúng gian hàng.
2. Kiểm tra thị trường (Market) và ngôn ngữ nội dung (Locale) được hệ thống gán theo shop.
3. Hoàn tất kết nối.

| Gian hàng | Thị trường | Ngôn ngữ bắt buộc |
| --- | --- | --- |
| Shopee VN | Việt Nam | Tiếng Việt — vi-VN |
| Rakuten JP | Nhật Bản | Tiếng Nhật — ja-JP |
| Amazon US | Hoa Kỳ | Tiếng Anh — en-US |

**Kết quả:** Shop hiển thị Connected, đúng thị trường và ngôn ngữ. Nếu còn Initial Syncing, chờ đồng bộ ban đầu hoàn tất.

> **Lưu ý:** Ngôn ngữ của shop được cố định theo thị trường. Nếu thiếu tiếng Nhật cho Rakuten JP, hệ thống chặn đăng bán; không tự lấy tiếng Anh thay thế.

### 2 Tạo kho vật lý

**Vào đâu:** Warehouses → Add warehouse.

1. Tạo kho thực tế như Kho HCM, Kho Hà Nội hoặc Kho 3PL Nhật Bản.
2. Điền địa chỉ, thông tin vận hành và liên kết các shop được phép lấy hàng từ kho.

**Kết quả:** Kho hoạt động và có đúng danh sách shop được phép sử dụng. Liên kết kho với shop chưa có nghĩa đã bật đồng bộ số tồn ra sàn.

### 3 Thiết lập thương hiệu

**Vào đâu:** Products → Brands.

1. Tạo hồ sơ Brand, nhập Canonical name và các thông tin liên quan, rồi bấm Save.
2. Trong Details, dùng Matching aliases cho các tên tương đương, ví dụ SONY và ソニー, để nhận diện đúng thương hiệu khi nhập dữ liệu.
3. Trong Channel mapping, điền tên hoặc mã thương hiệu theo từng sàn cần bán.

**Kết quả:** Brand có thể được chọn ngay trong Product Master. Kênh chưa có mapping không chặn việc dùng Brand ở Master.

> **Lưu ý:** Matching aliases giúp nhận diện tên, không thay thế Channel mapping hoặc quyền bán thương hiệu do sàn yêu cầu.

### 4 Chuẩn bị Category và thuộc tính

**Vào đâu:** Products → Categories & Attributes → Categories.

1. Chọn Category phù hợp; nếu chưa có, nhờ người quản lý dùng Add Category → Create category.
2. Mở Category → Attributes → Add attribute để gắn trường từ thư viện; chọn Required cho trường bắt buộc hoặc Optional cho trường không bắt buộc.
3. Kiểm tra Channel mapping để đối chiếu danh mục nội bộ với danh mục trên từng sàn.
4. Bấm Save Configuration. Nếu có Review category impact, xem sản phẩm bị ảnh hưởng rồi Confirm changes.

**Kết quả:** Khi Seller chọn Category, các trường tương ứng tự xuất hiện trong Product attributes.

> **Lưu ý:** Category con không tự kế thừa thuộc tính của Category cha. Cấu hình dùng chung có thể ảnh hưởng nhiều sản phẩm; chỉ sửa giá trị riêng tại Product Master.

## Phần 3 Bước 2 Tạo và hoàn thiện Product Master

### 1 Tạo bản nháp

**Vào đâu:** Products → Product Master → Create Product Master.

1. Chọn Single cho sản phẩm đơn hoặc Configurable cho sản phẩm có nhiều lựa chọn Màu/Size.
2. Nhập Master SKU duy nhất và Product name.
3. Bấm Create draft & continue. Category, giá và tồn được bổ sung sau bước tạo nhanh.

**Kết quả:** Bản nháp được tạo, không báo trùng SKU.

### 2 Điền thông tin và bản dịch

**Vào đâu:** Bản Draft → Product data → Basic information.

1. Hoàn thiện tên, mô tả và chọn Brand đã lưu.
2. Tại Product category, chọn Category đang Active → Confirm Category.
3. Điền trường Required trong Product attributes; trường Optional có thể để trống. Bộ thông số được tải theo Category đã chọn.
4. Dùng bộ chọn ngôn ngữ trên thanh đầu trang để nhập tên, mô tả và thuộc tính có bản dịch cho các shop định bán.

**Kết quả:** Thông tin bắt buộc được điền đủ; có bản dịch cho thị trường cần bán.

### 3 Nhập mã vạch

**Vào đâu:** Product data → Basic information → GTIN / Barcode.

1. Nhập mã vạch của sản phẩm; với biến thể, bổ sung mã tương ứng trong phần biến thể.
2. Kiểm tra mã theo yêu cầu sàn và xử lý cảnh báo nếu có.

**Kết quả:** Mã được lưu và không còn cảnh báo cần xử lý.

### 4 Thêm hình ảnh

**Vào đâu:** Product data → Media.

1. Bấm Upload product images hoặc Add images để tải ảnh từ máy tính. UI hiện yêu cầu ít nhất 3 ảnh, tối đa 9 ảnh.
2. Dùng Set as main để chọn ảnh chính; ảnh này có nhãn Main.

**Kết quả:** Ảnh tải xong, có ảnh chính và không còn lỗi bắt buộc.

### 5 Thiết lập giá tồn và biến thể

**Vào đâu:** Pricing & Inventory.

1. Với Single product, điền Cost price, Selling price và Currency.
2. Với Product with variants, chọn Variant options như Màu/Size; chọn giá trị để sinh tổ hợp và hoàn thiện SKU, giá của từng biến thể thực sự bán.
3. Ghi nhận tồn tại kho do Prime OS quản lý. Dùng Add stock location khi chưa có bản ghi tại kho; dùng Adjust stock khi đã có tồn, kể cả tồn bằng 0.

**Kết quả:** SKU có giá và tồn đúng kho. Thuộc tính ghi Managed by variants được quản lý ở biến thể, không cần nhập lại ở thông số chung.

> **Quy tắc tồn kho:** Chỉ sản phẩm Single hoặc biến thể con có tồn. Sản phẩm cha không nhập tồn riêng. Chọn thuộc tính tạo biến thể cho một sản phẩm không tự thay đổi cấu hình Category dùng chung.

### 6 Kiểm tra dữ liệu Master

**Vào đâu:** Product readiness hoặc nút Complete product.

1. Bấm từng mục còn thiếu để tới đúng chỗ cần sửa: Category Active, thuộc tính Required, mô tả, ảnh, giá, tồn hoặc thông tin đóng gói.
2. Nếu còn Prepare at least one channel for publishing, chuyển sang bước liên kết kênh bên dưới.

**Kết quả:** Dữ liệu Master đủ để mở Link another channel. Khi thiếu thông tin bắt buộc, vẫn có thể lưu Draft để hoàn thiện sau.

## Phần 4 Bước 3 Đăng bán đa sàn

### 1 Thêm sản phẩm vào gian hàng

**Vào đâu:** Product Master → Sales Channels → Link another channel.

1. Chọn shop cần bán → Set up … channel(s); kiểm tra nội dung đúng ngôn ngữ và yêu cầu của shop.
2. Nếu phát hiện listing đã có trên sàn, chọn giữ dữ liệu kênh hoặc xem từng khác biệt trước khi liên kết.
3. Bấm Review channel changes, kiểm tra kết quả dự kiến rồi xác nhận tạo hoặc liên kết listing.

**Kết quả:** Listing liên kết với Master, chưa đăng lên sàn. Thay đổi của Master được lưu trước khi mở bước thiết lập kênh.

### 2 Chốt phiên bản Master

**Vào đâu:** Thanh hành động của Product Master.

1. Xử lý các mục còn thiếu trong Complete product.
2. Khi đủ điều kiện, bấm Publish product lần đầu hoặc Publish updates cho bản đã xuất bản.
3. Chọn Publish Product Master only → Publish revision nếu chỉ chốt dữ liệu gốc.

**Kết quả:** Có phiên bản Master đã xuất bản; danh sách Product Master hiển thị Active. Listing vẫn được kiểm tra và gửi riêng.

### 3 Hoàn thiện yêu cầu của từng listing

**Vào đâu:** Sales Channels → Manage listing.

1. Dùng Complete next item để tới mục còn thiếu; kiểm tra Listing, SKU mapping, Variants & channel media, Price & inventory và Channel requirements.
2. Điền yêu cầu riêng, như ASIN / catalog match của Amazon hoặc Catalog ID của Rakuten; kiểm tra cả bản dịch đúng thị trường.
3. Nếu cần tên, nội dung hoặc giá riêng, sửa trong listing đó; Master và listing của shop khác không bị thay đổi.

**Kết quả:** Nút chuyển sang Review & publish khi đủ thông tin. Lỗi của mỗi kênh được xử lý riêng.

### 4 Kiểm tra tồn và chọn cách quản lý

**Vào đâu:** Warehouses để cập nhật tồn kho; Manage listing → Price & inventory → Adjust inventory để cấu hình tồn gửi ra shop.

| Loại tồn | Cách hiểu |
| --- | --- |
| **Master Stock** | Tổng tồn từ các kho vật lý do Prime OS quản lý. Cập nhật tại kho sẽ tự cập nhật Master Stock. |
| **Channel Stock** | Số tồn của sản phẩm trên từng shop. Mặc định được quản lý độc lập với Master Stock. |

1. Nhập hoặc cập nhật tồn đúng SKU tại kho do Prime OS quản lý; kho bên ngoài có nhãn Read only không được chỉnh trực tiếp.
2. Trong Stock sync policy, giữ Do not publish stock nếu quản lý tồn sàn độc lập; chọn Automatic sync nếu muốn đồng bộ, hoặc Manual update để chỉ định số lượng gửi.
3. Khi bật gửi tồn, kiểm tra Inventory source, Safety buffer và Channel allocation cap; xem trước Quantity to send trước khi xác nhận.

**Kết quả:** Seller biết mỗi shop đang dùng tồn độc lập hay tồn được cấp từ kho nội bộ.

> **Lưu ý:** Warehouse Stock cập nhật Master Stock tự động, nhưng không tự bật đồng bộ ra sàn. Số lượng gửi cho listing không phải thao tác điều chỉnh tồn kho. Amazon FBA do Amazon quản lý, không lấy Master Stock ghi đè.

### 5 Gửi listing và xác nhận đang bán

**Vào đâu:** Manage listing → Review & publish.

1. Xem lại nội dung, SKU, Selling price và Quantity to send.
2. Bấm Confirm & publish, theo dõi phản hồi và sửa lỗi của listing nếu có.
3. Khi vận hành với kết nối thật, mở trang sản phẩm trên sàn để xác nhận đang bán đúng thông tin.

| Trạng thái trên màn hình quản lý listing | Ý nghĩa và việc cần làm |
| --- | --- |
| Draft / Draft saved | Bản nháp; chưa xác nhận gửi lên sàn. |
| Ready for review | Có thể kiểm tra lần cuối trước khi gửi. |
| Submitted | Đã qua bước gửi trong luồng hiện tại; vẫn cần kiểm tra kết quả trên sàn. |

**Kết quả:** Chỉ xác nhận hoàn tất khi sản phẩm hiển thị đúng trên gian hàng thật. Nếu UI chỉ có Save reviewed draft, màn hình đó chưa kết nối gửi thật; lưu nháp không phải đăng bán.

## Phần 5 Bước 4 Vận hành hằng ngày

### 1 Cập nhật sản phẩm đang bán

**Vào đâu:** Product Master → Product data; sau đó Sales Channels.

1. Sửa dữ liệu dùng chung, kiểm tra và bấm Publish updates để chốt phiên bản mới.
2. Với listing báo Updates not synced, bấm Review & sync; hoặc chọn nhiều listing → Sync selected channels.
3. Chọn trường cần cập nhật, kiểm tra nội dung tùy chỉnh rồi Confirm & sync … listing(s).
4. Mở Manage listing, kiểm tra bản nháp và xác nhận gửi; theo dõi kết quả trên sàn.

**Kết quả:** Chỉ trường và listing đã chọn nhận dữ liệu mới. Cập nhật bản nháp không tự gửi lên sàn hoặc bật đồng bộ tồn.

### 2 Đổi Category hoặc bộ thuộc tính

**Đổi Category của một sản phẩm:** Product data → Product category → chọn Category mới → Confirm Category → Review category change.

1. Xem trường mới, trường không còn áp dụng và trường Required còn thiếu.
2. Bấm Apply to draft, bổ sung thông tin rồi lưu/chốt Master. Cancel thì giữ nguyên Category cũ.
3. Dữ liệu và bản dịch cũ được giữ lại; các giá trị ngoài Category mới nằm ở Saved values outside this category. Listing đang bán không tự đổi.

**Sửa Category dùng chung:** Categories & Attributes → Category → Attributes → Save Configuration → Review category impact → Confirm changes. Kiểm tra sản phẩm bị ảnh hưởng trước khi xác nhận; trường Required mới phải được bổ sung cho từng sản phẩm.

### 3 Xử lý tồn thấp

**Vào đâu:** Warehouses để kiểm tra kho; Manage listing → Price & inventory để kiểm tra chính sách tồn shop.

| Tình huống | Ý nghĩa | Xử lý |
| --- | --- | --- |
| Master Stock thấp | Tồn tại kho nội bộ đang thấp. | Nhập thêm hàng, kiểm tra hàng giữ cho đơn hoặc điều chuyển khi phù hợp. |
| Tồn shop thấp | Tồn của riêng shop đang thấp. | Cập nhật tồn shop; nếu đã bật đồng bộ, kiểm tra nguồn và giới hạn phân bổ. |

**Kết quả:** Bổ sung hoặc điều chỉnh đúng nơi thiếu hàng. Shop vẫn có thể hết tồn dù Master Stock còn nhiều.

### 4 Hỏi nhanh đáp gọn

**Tôi sửa tên nhưng trên Shopee chưa đổi?**

Kiểm tra Publish updates, cảnh báo Updates not synced và tên riêng của listing. Sau Review & sync, kiểm tra cả bước gửi listing lên sàn.

**Vì sao chỉ thấy Complete product thay vì Publish product?**

Bấm Complete product và xử lý các mục thiếu: Category Active, thuộc tính Required, ảnh, giá, tồn và bước chuẩn bị kênh.

**Tạo Brand xong có dùng ngay được không?**

Có. Chọn Brand đã lưu trong Master; cấu hình Channel mapping và đáp ứng yêu cầu phê duyệt riêng của sàn khi cần. Không dùng Matching aliases thay cho quyền bán thương hiệu.

**Vì sao Amazon đã bán được nhưng Rakuten chưa được?**

Mỗi listing có điều kiện riêng. Mở Manage listing của Rakuten, kiểm tra nội dung tiếng Nhật và Channel requirements; dùng Complete next item để tới phần còn thiếu.

### 5 Năm mốc xác nhận hoàn tất

- [ ] **Nền tảng:** Shop kết nối đúng, kho sẵn sàng, Brand đã lưu và Category Active phù hợp.
- [ ] **Master:** Đủ thuộc tính Required, đã Publish product hoặc Publish updates và có phiên bản đã xuất bản.
- [ ] **Listing:** Đúng shop, ngôn ngữ, yêu cầu sàn; đã xem lại và xác nhận gửi.
- [ ] **Tồn kho:** Số tồn đã được kiểm tra; quy tắc đồng bộ chỉ bật khi cần.
- [ ] **Đang bán:** Đã kiểm tra trang sản phẩm trên sàn thật, không chỉ dựa vào kết quả prototype.
