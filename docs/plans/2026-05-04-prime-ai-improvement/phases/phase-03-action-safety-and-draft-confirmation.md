# Phase 3 — Action safety + draft confirmation

## Mục tiêu

Cho Prime AI hỗ trợ thao tác nhưng giữ nguyên trust boundary: draft trước, confirm sau, audit-ready.

## Việc cần làm

- Hoàn thiện UI cho `confirm_draft` và `cancel_draft`.
- Thêm draft preview/diff component.
- Thêm risk level + guardrail copy cho action.
- Chuẩn hóa action schema cho navigate/open/copy/draft.
- Không cho destructive mutation trực tiếp từ frontend copilot.

## Acceptance

- Write prompt chỉ tạo draft/prefill, không silent save.
- User thấy rõ thay đổi trước khi confirm.
- Risky action yêu cầu confirmation rõ ràng.
- Tests cover unsafe mutation/refusal/confirm path.
