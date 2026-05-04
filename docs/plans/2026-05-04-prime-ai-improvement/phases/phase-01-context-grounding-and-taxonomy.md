# Phase 1 — Context grounding + taxonomy

## Mục tiêu

Làm Prime AI hiểu đúng route, domain, intent, entity, nguồn dữ liệu và độ mới trước khi trả lời.

## Việc cần làm

- Audit toàn bộ `CopilotDomain`, `CopilotIntent`, `CopilotEntityRef`.
- Map route hiện tại sang PrimeOS Area/Tower/Floor.
- Chuẩn hóa `CopilotContextSummary` để có source/freshness.
- Thêm debug reason cho domain/intent selection.
- Tách data snapshot khỏi response composition.
- Mở rộng quick prompts theo route đang mở.

## Acceptance

- Prompt cùng nội dung nhưng ở route khác cho context khác hợp lý.
- Mọi câu trả lời data-bound có citation/source/freshness.
- Low-confidence prompt không trả lời chắc chắn.
- Tests cover dashboard/product/order/warehouse/returns/fulfillment/inventory boundary.
