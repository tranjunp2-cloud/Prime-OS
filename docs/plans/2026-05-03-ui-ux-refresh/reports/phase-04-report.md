# Báo cáo Phase 04 — Đồng bộ Admin Web với PrimeOS

Ngày: 2026-05-03
Trạng thái: Hoàn thành
Phạm vi chính:
- `prime-os-phase-1/admin-web/src/index.css`

## Mục tiêu
Làm admin-web cảm giác cùng một hệ PrimeOS với main app: màu sắc, surface, shadow, focus state, motion, card/sidebar/form/table polish. Không thay đổi auth, API, data flow hoặc quyền truy cập.

## Đã thực hiện
- Đồng bộ token màu admin theo hướng PrimeOS light-first:
  - background trung tính hơn;
  - primary gần hệ violet/indigo của main app;
  - border/surface/muted nhất quán hơn;
  - success/warning/danger rõ contrast hơn.
- Thêm token motion/focus/shadow:
  - `--motion-fast`, `--motion-standard`, `--motion-ease`;
  - `--focus-ring`;
  - `--shadow-panel`.
- Thêm focus-visible rõ cho button, link, input, textarea, select, nav item, record row, tile button.
- Giảm gradient nền body để admin giống control room hơn, bớt “landing page”.
- Login card dùng shadow panel token và nền trắng ổn định hơn.
- Sidebar nền sáng hơn, hover/active state dùng surface token thay vì màu rời rạc.
- Topbar blur mạnh hơn, giữ cảm giác shell giống main app.
- Page header admin thêm accent rail bên trái giống PageHeader main app.
- Button primary chuyển về màu token `--primary`, hover rõ hơn.
- Record row hover/active state rõ hơn, bỏ gradient cũ.
- Filter/record-column dùng `--surface-muted` thay vì hardcode màu.
- Input/toggle có border focus rõ hơn.
- Status badge thêm border theo tone để không phụ thuộc màu nền đơn thuần.
- Thêm `prefers-reduced-motion` để giảm motion khi user bật reduced motion.

## Lý do thiết kế
- Chỉ chỉnh CSS để giảm rủi ro cho CRUD/auth.
- Không đổi component tree, không đổi request path, không đổi session/token logic.
- Giữ admin là “control room” nhưng cùng hệ visual với main PrimeOS.
- Tăng accessibility: focus ring, reduced motion, status badge có border + text.

## Kiểm chứng
Đã chạy:

```bash
cd prime-os-phase-1/admin-web
npm run build
```

Kết quả: build admin-web thành công.

Auth smoke qua backend local:

```bash
curl -X POST http://127.0.0.1:8180/api/auth/login \
  -H 'content-type: application/json' \
  --data '{"email":"admin@primeos.local","password":"Admin@PrimeOS2026!"}'
```

Kết quả: nhận token hợp lệ, role `admin`, thấy 24 resource.

## File thay đổi
- `prime-os-phase-1/admin-web/src/index.css`
- `docs/plans/2026-05-03-ui-ux-refresh/reports/phase-04-report.md`
- `docs/plans/2026-05-03-ui-ux-refresh/phase-04-admin-web-alignment.md`

## Chưa làm trong Phase 4
- Chưa tách shared token package giữa main app và admin-web.
- Chưa redesign JSX layout admin vì phase này ưu tiên an toàn, CSS-only.
- Chưa chạy browser visual QA; phần đó thuộc Phase 5.

## Đề xuất Phase 5
Tiếp theo nên chạy QA/a11y/responsive:
- main build/test;
- admin build;
- browser smoke desktop/mobile;
- keyboard focus path;
- reduced-motion/contrast check;
- ghi danh sách non-blocker nếu còn.
