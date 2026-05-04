# Phase 2 — Response quality + clarification

## Mục tiêu

Làm câu trả lời ngắn, đúng việc, có evidence, có next action, biết hỏi lại khi thiếu dữ kiện.

## Việc cần làm

- Chuẩn response template: kết luận → bằng chứng → hành động tiếp theo.
- Tạo clarification templates cho ambiguous prompt.
- Thêm follow-up continuity theo entity gần nhất.
- Chuẩn hóa tone tiếng Việt operator-first.
- Giảm fallback generic bằng fallback có lựa chọn.

## Acceptance

- Ambiguous prompts trả về câu hỏi làm rõ + 2–3 option.
- Entity follow-up dùng đúng entity cuối, không nhầm domain.
- Response không bịa số liệu/entity ngoài snapshot.
