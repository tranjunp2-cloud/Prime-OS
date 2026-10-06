# Phạm vi thiết kế Settings trên Prime OS

Settings cung cấp cấu hình dùng chung cho các luồng vận hành. Team Design cần xử lý từng nhóm cấu hình riêng, với quyền truy cập, kiểm tra dữ liệu và phạm vi ảnh hưởng rõ ràng; không gom tất cả thành một form dài.

**Trong kế hoạch:** P1, 8 ngày làm việc, ngày 35–42 tương ứng tuần 7–9. Estimate thuộc tổng 80 ngày / 16 tuần của 1 designer, không phải phần việc cộng thêm.

**Đầu ra:** Cấu trúc màn hình Settings, bảng phân quyền, màn hình xem trước ảnh hưởng của thay đổi, trạng thái kiểm tra dữ liệu và luồng khôi phục khi có lỗi.

## General & Business

Thiết kế thông tin pháp nhân, khu vực và ngôn ngữ, tiền tệ, múi giờ, thuế/VAT, thông tin xuất hóa đơn và các chính sách mặc định.

Các tình huống cần làm rõ:

- Đổi tiền tệ hoặc múi giờ khi đã có đơn hàng.
- Thiếu thông tin pháp nhân, thuế hoặc chọn khu vực chưa được hỗ trợ.
- Xem trước những dữ liệu và hoạt động bị ảnh hưởng trước khi lưu.

**Luồng liên quan:** Onboarding, Orders, Billing và Analytics.

## Team & Access

Thiết kế luồng mời nhân sự, mẫu vai trò, quyền theo tính năng, workspace, cửa hàng hoặc chi nhánh và lịch sử truy cập.

Các tình huống cần làm rõ:

- Lời mời hết hạn hoặc email đã tồn tại.
- Không cho xóa hoặc hạ quyền quản trị viên cuối cùng.
- Quyền của nhân sự thay đổi trong lúc đang thao tác.

**Luồng liên quan:** Toàn bộ workspace, phê duyệt và kiểm tra lịch sử thao tác.

## Payments

Thiết kế kết nối nhà cung cấp thanh toán, phương thức thanh toán, tài khoản nhận tiền, COD, chế độ thử nghiệm hoặc chạy thật và trạng thái nhận thông báo giao dịch.

Các tình huống cần làm rõ:

- Thông tin xác thực hết hạn hoặc nhà cung cấp mất kết nối.
- Thanh toán quá thời gian chờ hoặc nhận thông báo giao dịch lặp lại.
- Không trộn giao dịch thử nghiệm với dữ liệu thật.

**Luồng liên quan:** Orders, POS, PrimeWeb và Billing.

## Shipping & Delivery

Thiết kế cấu hình đơn vị vận chuyển, cấp dịch vụ, địa chỉ lấy hoặc trả hàng, quy tắc phí, vùng phục vụ, hỗ trợ COD và phương án giao hàng thay thế.

Các tình huống cần làm rõ:

- Địa chỉ không khớp với dữ liệu của đơn vị vận chuyển.
- Dịch vụ tạm ngừng hoặc địa chỉ nằm ngoài vùng giao hàng.
- Không lấy được phí, lỡ lịch lấy hàng hoặc không có phương án thay thế.

**Luồng liên quan:** Warehouse, Orders, Returns và COD.

## Nguyên tắc kết nối với các luồng khác

Khi thiếu cấu hình hoặc gặp lỗi cấu hình, luồng nghiệp vụ cần dẫn người dùng về đúng màn hình Settings để xử lý. Phạm vi cấu hình phải phân biệt rõ mức toàn hệ thống, workspace và cửa hàng hoặc chi nhánh.

Đây là phạm vi cần thiết kế, không phải xác nhận các khả năng trên đã hoàn tất trong prototype.
