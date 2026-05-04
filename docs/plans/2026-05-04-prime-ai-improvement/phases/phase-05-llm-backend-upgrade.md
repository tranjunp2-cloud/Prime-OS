# Phase 5 — LLM/backend upgrade

## Mục tiêu

Nâng Prime AI lên LLM thật nhưng vẫn grounded, secure, observable.

## Việc cần làm

- Tạo backend AI adapter; không gọi LLM từ frontend.
- Tạo Context Gateway read-only với allowlist + source/freshness.
- Bắt structured JSON output từ model.
- Thêm refusal rules cho thiếu quyền/thiếu context/unsafe ask.
- Tạo Command Gateway cho một flow rủi ro thấp trước.
- Tách UI stream khỏi business audit.

## Acceptance

- Không có secret/API key trong frontend.
- LLM chỉ trả lời dựa trên retrieved context.
- Mutation đi qua command schema + RBAC + confirm + audit.
- Evals chứng minh hallucination thấp trước khi rollout rộng.
