# Báo cáo Phase 02 — Shell, Navigation, Search

Ngày: 2026-05-03
Trạng thái: Hoàn thành
Phạm vi chính:
- `prime-os-phase-1/app/src/components/layout/AppLayout.tsx`
- `prime-os-phase-1/app/src/components/layout/AppSidebar.tsx`

## Mục tiêu
Cải thiện trải nghiệm shell điều hành của PrimeOS theo hướng search-first và navigation rõ nhóm hơn, lấy cảm hứng từ 21st.dev nhưng giữ đúng ngữ cảnh vận hành của PrimeOS.

## Đã thực hiện
- Thêm breadcrumb trong header desktop dựa trên route hiện tại.
- Breadcrumb dùng `getPrimeNavPath()` và `getShellNavLabel()` nên tự đồng bộ với nav tree và đa ngôn ngữ hiện có.
- Làm nút mở command/search gọn hơn theo pattern shortcut kiểu 21st.dev: hiển thị `⌘K` thay vì `Cmd K` dài.
- Đồng bộ command/search popover dùng token shadow mới từ Phase 1 qua utility `.panel-shadow`.
- Đồng bộ transition của search result row qua `.prime-transition-fast`.
- Làm sidebar rõ taxonomy hơn bằng heading nhóm cho từng area.
- Thêm count badge nhỏ cho mỗi area trên sidebar desktop để tăng khả năng scan.
- Cập nhật trạng thái active/hover của sidebar dùng utility motion chung thay vì transition hardcode rời rạc.
- Bật scrollbar rõ ràng cho sidebar bằng `.scrollbar-visible` để navigation dài dễ nhận biết hơn.

## Lý do thiết kế
- Không rewrite shell hoặc command palette vì hệ thống đã có search/palette tốt.
- Chỉ nâng hierarchy và discoverability: breadcrumb + group heading + shortcut affordance.
- Giữ cấu trúc route/nav hiện tại để tránh phá routing test và deep link.
- Tận dụng token Phase 1 để tránh style mới rời rạc.

## Kiểm chứng
Đã chạy:

```bash
cd prime-os-phase-1/app
npm run build:dev
npm run test -- App.legacy-routes.test.tsx
```

Kết quả:
- Build dev: pass.
- Legacy route tests: 7/7 pass.

Ghi chú:
- Vite vẫn cảnh báo chunk lớn hơn 500kB. Đây là cảnh báo bundle splitting có sẵn, không phát sinh từ Phase 2.
- Vitest có cảnh báo React Router future flags. Đây là cảnh báo upstream/test environment, không phải lỗi.

## File thay đổi
- `prime-os-phase-1/app/src/components/layout/AppLayout.tsx`
- `prime-os-phase-1/app/src/components/layout/AppSidebar.tsx`
- `docs/plans/2026-05-03-ui-ux-refresh/reports/phase-02-report.md`
- `docs/plans/2026-05-03-ui-ux-refresh/phase-02-shell-navigation-search.md`

## Chưa làm trong Phase 2
- Chưa đổi cấu trúc route/nav tree lớn.
- Chưa làm mobile nav mới.
- Chưa chỉnh dashboard/card/table page-level; phần đó thuộc Phase 3.
- Chưa chỉnh admin-web; phần đó thuộc Phase 4.

## Đề xuất Phase 3
Tiếp theo nên polish dashboard/page patterns:
- chuẩn hóa KPI card, page header, table state;
- cải thiện empty/loading/error states;
- tăng clarity cho status badge và chart summary.
