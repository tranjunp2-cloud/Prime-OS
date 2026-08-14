# Repository Structure

PrimeOS uses a small polyglot monorepo. Keep deployable applications, shared data,
documentation, research artifacts, presentations, and developer tools in separate
top-level areas.

## Top-level ownership

| Path | Purpose |
| --- | --- |
| `apps/web` | Main React/Vite operator application |
| `apps/admin` | React/Vite administration application |
| `apps/api` | Express API and its API-level tests |
| `packages` | Assets or contracts shared by multiple applications |
| `tools` | Standalone developer and content-generation tools |
| `docs` | Maintained product and engineering documentation |
| `research` | Experiments, evaluations, extracts, and research evidence |
| `presentations` | Presentation sources and bundled presentation assets |
| `references` | Third-party references, legacy material, and supporting reports |

## Placement rules

- Put runtime code in the owning application; promote it to `packages` only when
  at least two applications consume it.
- Keep tests beside their owning application (`src/**/*.test.*` or `test/`).
- Store roadmap and commercial source data under `docs/management/data`.
- Store dated implementation notes under `docs/journals`; session records belong
  in `docs/journals/sessions`.
- Do not commit generated build output, dependencies, logs, PID files, local
  credentials, or test artifacts. The root `.gitignore` covers these categories.
- Use kebab-case for new folders and documentation/data filenames.

## Dependency management

JavaScript applications are npm workspaces declared in the root `package.json`.
Run installs and repository-wide checks from the repository root. Python tools
keep their own project metadata and setup instructions inside their tool folder.

## Repository checks

```bash
npm ci
npm run check
```

`npm run check` runs linting, web and API tests, and development-mode builds for
both frontends.
