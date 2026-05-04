# Phase 4 — Evals + telemetry + QA

## Mục tiêu

Tạo regression guard để bot càng cải thiện càng ít lỗi, đo được chất lượng thật.

## Việc cần làm

- Mở rộng prompt matrix theo domain/intent/action.
- Thêm golden prompts VI/EN.
- Thêm safety cases: prompt injection, unsafe mutation, hallucinated entity.
- Track fallback/clarify/domain accuracy/action accuracy.
- Viết QA checklist riêng cho Prime AI.

## Acceptance

- Có test suite fail nếu bot bịa entity/action.
- Có metrics trước/sau mỗi phase.
- Có checklist manual cho UX/a11y/responsive Prime AI.
