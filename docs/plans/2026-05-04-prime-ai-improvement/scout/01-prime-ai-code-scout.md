# Scout code Prime AI

## File chính

- `prime-os-phase-1/app/src/hooks/use-global-copilot-engine.ts`: runtime hook, message state, quick prompts, telemetry.
- `prime-os-phase-1/app/src/lib/copilot/context.ts`: resolver chính, context summary, candidate scoring, response/actions.
- `prime-os-phase-1/app/src/lib/copilot/knowledge.ts`: knowledge pack static.
- `prime-os-phase-1/app/src/components/copilot/types.ts`: domain/intent/action/draft/debug contracts.
- `prime-os-phase-1/app/src/components/copilot/GlobalCopilotActions.tsx`: render action buttons, hiện hỗ trợ navigate/open/copy.
- `prime-os-phase-1/app/src/components/copilot/GlobalCopilotWorkspace.tsx`: shell UI workspace.
- `prime-os-phase-1/app/src/hooks/use-inventory-copilot.ts`: inventory copilot riêng, gọi Supabase Edge Function.

## Tests hiện có

- `prime-os-phase-1/app/src/hooks/use-global-copilot-engine.test.tsx`
- `prime-os-phase-1/app/src/lib/copilot/context.test.ts`
- `prime-os-phase-1/app/src/lib/copilot/copilot.prompt-matrix.test.ts`
- `prime-os-phase-1/app/src/lib/copilot/knowledge.test.ts`

## Nhận định

- Nền hiện tại tốt cho regression vì deterministic.
- Nên cải thiện contract/evals trước khi thêm LLM.
- Có sẵn types cho draft/action safety nhưng UI/flow chưa dùng hết.
- Inventory copilot là boundary riêng; Prime AI nên route/ground thay vì ôm deep inventory diagnostics.
