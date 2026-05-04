# Báo cáo Phase 1 — Account Center read-only

Ngày: 2026-05-04

## Đã làm

- Tạo route `/account` auth-guarded trong PrimeOS shell.
- Thêm `Account Center` read-only dựa trên `AuthContext` và session hiện tại.
- Thêm header account chip thay cho cụm email/logout cũ.
- Account chip có avatar initials, full name/email, role badge, dropdown menu.
- Dropdown gồm: Hồ sơ của tôi, Bảo mật, Thành viên admin-only, Đăng xuất.
- Thêm breadcrumb metadata cho `/account` nhưng không thêm account vào sidebar.
- Không fake session revoke/password/audit khi backend chưa có session store/audit thật.

## Files chính

- `prime-os-phase-1/app/src/pages/Account.tsx`
- `prime-os-phase-1/app/src/App.tsx`
- `prime-os-phase-1/app/src/components/layout/AppLayout.tsx`
- `prime-os-phase-1/app/src/lib/prime/prime-navigation.ts`
- `prime-os-phase-1/app/src/pages/Account.test.tsx`
- `prime-os-phase-1/app/src/lib/prime/prime-navigation.test.ts`

## Guardrails giữ đúng plan

- Không thêm 7 mục account vào sidebar.
- Không tạo controls security enterprise giả.
- Không đụng backend IAM/session trong Phase 1.
- Không dùng generic CRUD cho IAM/account.
- Members invite/deactivate chỉ hiện như roadmap/disabled tới khi có backend IAM.

## Verify

- Focused tests: `npm test -- Account.test.tsx prime-navigation.test.ts` pass.
- Full Vitest: `76/76` pass.
- Build dev: `npm run build:dev` pass.

## Next phase đề xuất

Phase 2: `GET/PATCH /api/v1/me` additive + edit display name + audit `account.profile.updated`.
