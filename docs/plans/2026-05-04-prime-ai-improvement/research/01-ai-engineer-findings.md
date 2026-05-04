# Findings từ ai-engineer

## Hiện trạng

- Prime AI là rule-based frontend copilot, chưa có LLM runtime thật.
- Grounding dựa vào route + local stores.
- Conversation memory chỉ giữ domain/intent/entity gần nhất.
- Write action đang theo hướng draft/prefill, không silent save.
- Action UI hiện xử lý navigate/open/copy; confirm/cancel draft chưa hoàn thiện.
- Inventory copilot riêng đang gọi Supabase Edge Function.

## Khoảng trống

- Thiếu retrieval/context API chuẩn.
- Thiếu citation/freshness/confidence calibration.
- Thiếu command gateway + approval policy + audit event bất biến.
- Thiếu provenance/why/preview diff/undo/escalate trong UX.
- Evals mới smoke-level, chưa đủ safety/hallucination/permission coverage.

## Đề xuất kiến trúc

- Copilot UI chỉ là UX stream, không là audit/source-of-truth.
- AI Runtime gồm intent router, planner, answer composer.
- Context Gateway read-only, allowlisted, có source/freshness.
- Command Gateway cho mọi mutation: validation, RBAC, confirm, idempotency, audit.
- Skill Registry khai báo context/action/not-allowed/escalation.
- Eval Harness chạy prompt matrix, safety tests, tool permission tests.
