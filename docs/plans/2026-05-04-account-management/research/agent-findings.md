# Findings từ agents — Account Management

## Product Manager

- MVP đang quá rộng nếu gồm profile, team, role matrix, sessions, audit, MFA, multi-tenant.
- Nên tách `persona` khỏi `role`.
- Ship now: `Tài khoản của tôi` + `Thành viên` admin-only + role đơn giản `Admin / Operator / Viewer`.
- Không ship MVP: permission matrix, sessions revoke, audit screen, MFA/SSO/SCIM, custom roles, workspace branding nặng.
- Placement tốt nhất: top-right account menu vào `/account`; chưa thêm group sidebar mới.

## API Designer

- Không dùng generic CRUD `/api/:resource` cho IAM/account vì bypass invariants.
- Sessions hiện không revoke được vì bearer token stateless; cần `session_id/jti`, session store, revoke table.
- Cần tách `principal`, `workspace_membership`, `role_key`, `seat_type`.
- API nên theo `/api/v1/me`, `/api/v1/workspace-members`, `/api/v1/role-definitions`, `/api/v1/audit-events`.
- `role_key` quyết định quyền; `seat_type` chỉ billing/packaging.
- Cần error envelope + `X-Request-Id` + audit có `request_id`.

## Security Auditor

- Local demo auth ổn cho demo kín, chưa đủ production account management.
- High risks: stateless bearer không revoke, tenant isolation chưa có, RBAC runtime lệch plan, audit thiếu append-only.
- Chốt `workspaceId/tenantId` trước Phase 1, không để Phase 6.
- Demo credentials cần preventive gate ở startup/CI/deploy, banner chỉ phụ.
- Invite flow cần token hash, expiry, single-use, tenant/email binding.

## UI Designer

- Shell hiện search-first; sidebar là operating areas. Không nên thêm 7 item account vào sidebar.
- Tạo 1 route `/account`, bên trong local subnav.
- Top-right header nên thành avatar/account chip có menu: Hồ sơ, Bảo mật, Đăng xuất.
- Reuse design system hiện có; không redesign.
- Desktop: local subnav sticky; mobile: card stack/segmented tabs, tránh horizontal matrix/table.
- MVP roles nên read-only preset explorer nếu backend chưa support full matrix.
