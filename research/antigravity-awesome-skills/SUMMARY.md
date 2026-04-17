# antigravity-awesome-skills

## Repo name
antigravity-awesome-skills

Local path: `/Users/admin/Desktop/Prime OS/upstream/antigravity-awesome-skills`

## Repo purpose
Thu vien installable gom hon 1,400 `SKILL.md` playbooks, catalog metadata, bundles va workflow playbooks cho AI coding assistants. Gia tri chinh nam o cach repo dong goi tri thuc tac vu thanh skill co trigger, category, tags, usage guide, installer va workflow metadata.

## Core concept
Repo nay xem tri thuc van hanh cua agent nhu mot catalog co cau truc:

- `skills/<skill-name>/SKILL.md` la don vi tri thuc nho, co muc dich, trigger va instructions.
- `data/catalog.json`, `skills_index.json` la lop registry co the search, filter, install.
- `data/bundles.json` gom skill theo role/goal.
- `data/workflows.json` gom cac playbook nhieu buoc theo outcome.
- `docs/` va `CATALOG.md` tao lop onboarding, governance, quality bar.

## What to reuse
- Pattern "skill library" cho Prime OS AI Operator: moi Tower/Floor co the co playbook, action recipe, troubleshooting recipe va decision recipe rieng.
- Metadata model: `id`, `name`, `description`, `category`, `tags`, `triggers`, `path`.
- Bundle model: nhom skill theo vai tro nhu seller operator, service agent, inventory planner, campaign manager.
- Workflow model: outcome-driven sequence, vi du "launch campaign", "resolve service issue", "recover stockout risk".
- Quality/governance docs cho viec viet skill noi bo: skill anatomy, quality bar, security guardrails, source tracking.

## What NOT to reuse directly
- Khong import full catalog vao Prime OS core vi qua rong, nhieu skill khong lien quan commerce.
- Khong coi `SKILL.md` la workflow engine. Skill chi la instruction artifact, khong phai state machine hay control plane.
- Khong copy cac skill third-party vao product neu chua review license, trust boundary va domain fit.
- Khong de skill library quyet dinh domain model Prime OS. Prime OS taxonomy Area - Tower - Floor van la source of truth.

## Relevant modules/files
- `README.md`: dinh vi repo la installable skill library, bundles, workflows.
- `CATALOG.md`: catalog generated theo category, skill description, triggers.
- `data/catalog.json`: registry machine-readable cho skill search/install.
- `data/workflows.json`: workflow metadata theo steps va recommended skills.
- `data/bundles.json`: role/goal bundles.
- `docs/QUALITY_BAR.md`: chat luong va expectation cho skill.
- `docs/SECURITY_GUARDRAILS.md`: boundary an toan cho agent instructions.
- `docs/SKILL_TEMPLATE.md`, `docs/SKILL_ANATOMY.md`: template va anatomy de viet skill.
- `skills/langgraph/SKILL.md`, `skills/ai-agent-development/SKILL.md`, `skills/architecture-decision-records/SKILL.md`: nhom skill lien quan AI operator, architecture va ADR.

## Mapping to Prime OS
| Prime OS area/tower | Mapping |
| --- | --- |
| Intelligence Area - AI Operator Tower | Build internal skill library cho AI operator: explain KPI, draft workflow, suggest fix, propose next best action. |
| Intelligence Area - Automation & Alerts Tower | Map alert playbooks thanh workflow skill: detect, triage, recommend, confirm, execute. |
| Demand Area | Skill bundles cho campaign planning, content, lead qualification, retargeting. |
| Customer Area | Skill bundles cho support response, complaint triage, retention follow-up, B2B account review. |
| Ecom Area - COS Tower | Operator skills cho product setup, inventory exception, order routing, fulfillment exception, audit review. |
| Control plane + decision layer | Dung skill nhu decision recipe, khong dung nhu transaction authority. |

## Risks / mismatch with our architecture
- Repo la instruction/catalog system, khong giai quyet transaction consistency, authorization, audit hay live data grounding.
- Skill text co the tro thanh source of hallucination neu khong gan voi entity state va permission model.
- Context overload neu dua qua nhieu skill vao runtime agent.
- Chat luong skill khong dong deu, can curate rieng cho Prime OS.
- Metadata hien tai phu hop coding assistant hon la commerce operator.

## Evaluation scores
| Criteria | Score | Notes |
| --- | ---: | --- |
| Strategic fit with Prime OS | 4 | Rat tot cho AI operator playbook va internal knowledge library. |
| DDD fit | 2 | Khong phai domain architecture repo. |
| Workflow orchestration fit | 3 | Co workflow metadata, nhung khong co durable execution. |
| Control plane fit | 2 | Chi nen lam decision/playbook layer. |
| AI operator fit | 5 | Rat hop cho skill taxonomy va prompt governance. |
| Frontend copilot fit | 2 | It lien quan UI runtime. |
| Production readiness | 3 | Tot nhu catalog/installable docs, khong phai production commerce service. |
| Complexity cost | 3 | Rong va nhieu noise, can curate. |
| Reuse difficulty | 3 | De lay pattern, kho lay nguyen catalog. |

## Recommended adoption style
pattern extraction

## Suggested next action
Thiet ke `Prime OS Operator Skill Registry` voi 20-30 skill dau tien theo Area - Tower - Floor, moi skill bat buoc co: trigger, applicable entities, required live context, allowed actions, confirmation rules, audit output va fallback path.
