# Báo cáo Phase 01 — Nền tảng Design System

Ngày: 2026-05-03
Trạng thái: Hoàn thành
Phạm vi: `prime-os-phase-1/app/src/index.css`

## Mục tiêu
Chuẩn hóa nền tảng UI cho PrimeOS trước khi chỉnh shell, navigation, dashboard và admin. Phase này tập trung vào token, focus state, motion và utility nền tảng; không thay đổi logic nghiệp vụ.

## Đã thực hiện
- Bổ sung token chuyển động:
  - `--motion-fast`: 150ms
  - `--motion-standard`: 200ms
  - `--motion-slow`: 300ms
  - `--motion-ease`: easing dùng chung cho tương tác UI
- Bổ sung token focus:
  - `--focus-ring-size`
  - `--focus-ring-offset`
  - `--focus-ring-color`
- Bổ sung token shadow:
  - `--shadow-surface`
  - `--shadow-panel`
  - `--shadow-command`
- Đồng bộ shadow light/dark mode để các surface có chiều sâu nhất quán hơn.
- Mở rộng `:focus-visible` cho `button`, `input`, `textarea`, `select`, link và interactive elements.
- Chuyển focus ring sang dạng 2 lớp: nền + ring, dễ nhìn hơn trên cả light/dark mode.
- Chuyển transition của button sang token motion chung thay vì hardcode `200ms ease-out`.
- Cho `.surface-command` dùng `--shadow-command` để command/modal sau này thống nhất.
- Thêm utility class nền tảng:
  - `.prime-transition`
  - `.prime-transition-fast`
  - `.surface-shadow`
  - `.panel-shadow`
  - `.touch-target`
  - `.data-number`

## Lý do thiết kế
- Giữ thay đổi nhỏ, đúng Karpathy guideline: không rewrite component, không đổi API, không chạm logic.
- Phase 1 chỉ đặt nền móng để Phase 2–4 dùng lại token thay vì thêm style rời rạc.
- Focus state rõ hơn giúp keyboard navigation/accessibility tốt hơn.
- Motion token giúp toàn hệ thống có nhịp tương tác 150–300ms, đúng checklist UI/UX.
- `.touch-target` chuẩn bị cho các nút/icon cần vùng click tối thiểu 44px ở các phase sau.

## Kiểm chứng
Đã chạy:

```bash
cd prime-os-phase-1/app
npm run build:dev
```

Kết quả: build thành công.

Ghi chú: Vite vẫn cảnh báo chunk lớn hơn 500kB. Đây là cảnh báo có sẵn về bundle splitting, không phát sinh từ Phase 1.

## File thay đổi
- `prime-os-phase-1/app/src/index.css`
- `docs/plans/2026-05-03-ui-ux-refresh/reports/phase-01-report.md`

## Chưa làm trong Phase 1
- Chưa chỉnh sidebar/header/search.
- Chưa chỉnh dashboard/card/table cụ thể.
- Chưa chỉnh admin-web.
- Chưa thêm test mới vì phase này chỉ thay CSS token nền tảng và build đã pass.

## Đề xuất Phase 2
Tiếp theo nên làm shell/navigation/search:
- gom nhóm sidebar theo Demand, Customer, Ecom, Intelligence, COS, Admin;
- thêm command/search affordance kiểu 21st.dev;
- chuẩn hóa active nav, breadcrumb, mobile nav.
