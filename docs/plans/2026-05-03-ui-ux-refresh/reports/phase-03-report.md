# Báo cáo Phase 03 — Dashboard & Page Polish

Ngày: 2026-05-03
Trạng thái: Hoàn thành
Phạm vi chính:
- Shared UI primitives
- Page header/data state
- KPI card/status/table/chart nền tảng

## Mục tiêu
Tăng độ rõ ràng và tính nhất quán của các dashboard/page vận hành mà không rewrite từng page. Phase này ưu tiên pattern dùng chung để các trang Dashboard, Prime Overview, Orders, Inventory, Products, Fulfillment, Returns hưởng lợi đồng loạt.

## Đã thực hiện
- Card nền tảng dùng `surface-shadow` và `prime-transition` để depth/hover ổn định hơn.
- Table row dùng `prime-transition-fast` thay vì transition hardcode, giúp hover/selected state đồng bộ hơn.
- Badge dùng motion utility chung và bỏ focus shadow hardcode cũ.
- PageHeader có accent rail bên trái để tăng hierarchy và giúp người dùng nhận diện vùng tiêu đề nhanh hơn.
- PageHeader title dùng `font-display` thống nhất với hệ visual PrimeOS.
- EmptyState chuyển sang `surface-solid` + radius lớn hơn để đồng bộ với card/page surface.
- PageDataState error state chuyển sang `surface-solid`, giữ layout lỗi/retry rõ hơn.
- SummaryMetricCard áp dụng `.data-number` cho số liệu để tránh nhảy layout và tăng khả năng đọc KPI.
- SummaryMetricCard icon surface bo tròn hơn, đồng bộ với token/radius mới.
- ChartContainer có role/aria-label mặc định để chart không hoàn toàn “vô hình” với assistive tech khi caller chưa truyền label.

## Lý do thiết kế
- Không chỉnh từng trang riêng lẻ để tránh scope nở rộng.
- Tập trung shared primitives vì app đã có nhiều page dùng `Card`, `Table`, `Badge`, `PageHeader`, `PageDataState`, `SummaryMetricCard`.
- Giữ nguyên data flow, route, API, business logic.
- Tận dụng token Phase 1 thay vì thêm style rời rạc.

## Kiểm chứng
Đã chạy:

```bash
cd prime-os-phase-1/app
npm run build:dev
npm run test -- App.legacy-routes.test.tsx src/pages/Warehouses.test.tsx
```

Kết quả:
- Build dev: pass.
- Test: 8/8 pass.

Ghi chú:
- Vite vẫn cảnh báo chunk lớn hơn 500kB. Đây là cảnh báo bundle splitting có sẵn, không phát sinh từ Phase 3.
- Vitest vẫn có cảnh báo React Router future flags. Đây là cảnh báo upstream/test environment, không phải lỗi.

## File thay đổi
- `prime-os-phase-1/app/src/components/ui/card.tsx`
- `prime-os-phase-1/app/src/components/ui/table.tsx`
- `prime-os-phase-1/app/src/components/ui/badge.tsx`
- `prime-os-phase-1/app/src/components/ui/chart.tsx`
- `prime-os-phase-1/app/src/components/system/PageHeader.tsx`
- `prime-os-phase-1/app/src/components/system/PageDataState.tsx`
- `prime-os-phase-1/app/src/components/system/EmptyState.tsx`
- `prime-os-phase-1/app/src/components/system/SummaryMetricCard.tsx`
- `docs/plans/2026-05-03-ui-ux-refresh/reports/phase-03-report.md`
- `docs/plans/2026-05-03-ui-ux-refresh/phase-03-dashboard-pages-polish.md`

## Chưa làm trong Phase 3
- Chưa redesign từng dashboard/page riêng.
- Chưa làm responsive table fallback mới.
- Chưa viết chart summary riêng cho từng biểu đồ vì cần ngữ cảnh dữ liệu cụ thể.
- Chưa chỉnh admin-web; phần đó thuộc Phase 4.

## Đề xuất Phase 4
Tiếp theo nên align `admin-web` với PrimeOS main app:
- port token màu/surface/radius;
- polish login/sidebar/table/form;
- giữ nguyên auth/API behavior.
