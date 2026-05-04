# Báo cáo cook tiếp — Account Management Phases 2–5

Ngày: 2026-05-04

## Đã làm

### Backend IAM APIs

- Thêm dedicated account/IAM endpoints dưới `/api/v1`, không dùng generic CRUD:
  - `GET /api/v1/me`
  - `PATCH /api/v1/me`
  - `GET /api/v1/workspace`
  - `GET /api/v1/role-definitions`
  - `GET /api/v1/workspace-members`
  - `POST /api/v1/workspace-member-invitations`
  - `POST /api/v1/workspace-members/:membershipId/deactivate`
  - `POST /api/v1/workspace-members/:membershipId/reactivate`
  - `GET /api/v1/audit-events`
- Thêm in-memory IAM foundation:
  - principal envelope
  - workspace membership
  - role definitions
  - capabilities
  - member invitations
  - append-only account audit events
- Thêm guardrails:
  - permission checks bằng capabilities
  - duplicate invite prevention
  - invalid email/role validation
  - last-admin cannot deactivate
  - request id trong API/audit

### Frontend Account Center

- `/account` giờ fetch IAM APIs thật.
- Profile display name editable qua `PATCH /api/v1/me`.
- Team members list hiển thị active/invited/suspended.
- Admin có invite member, deactivate/reactivate member.
- Audit recent activity hiển thị từ backend account audit events.
- Security panel vẫn giữ guardrail: chưa bật sessions/password vì bearer token còn stateless.

## Files chính

- `prime-os-phase-1/backend/src/auth.js`
- `prime-os-phase-1/backend/src/server.js`
- `prime-os-phase-1/app/src/pages/Account.tsx`
- `prime-os-phase-1/app/src/pages/Account.test.tsx`

## Verify

- `node --check prime-os-phase-1/backend/src/auth.js` pass.
- `node --check prime-os-phase-1/backend/src/server.js` pass.
- Backend smoke via curl:
  - login admin pass
  - `/api/v1/me` pass
  - `PATCH /api/v1/me` pass
  - `/api/v1/workspace-members` pass
  - `/api/v1/audit-events` pass
- App focused test: `npm test -- Account.test.tsx` pass.
- Full Vitest: `76/76` pass.
- Build dev: `npm run build:dev` pass.

## Còn lại đúng plan

- Chưa làm stateful sessions/revoke vì backend auth còn stateless bearer.
- Chưa làm change password vì cần session/version rotation + rate-limit theo user.
- Chưa làm MFA/SSO/SCIM/custom roles.
- Chưa persistent IAM store; hiện là in-memory foundation phù hợp local/demo phase.
