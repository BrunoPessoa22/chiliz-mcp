# Engineering standards

Professional engineers will judge this project. Write code that a senior engineer would approve in code review. When you're not sure something meets that bar, say so instead of guessing.

Scale the checks to the change. A copy or layout edit doesn't need a security review. A change to authentication, data, payments, infrastructure or agent tools does. For a full review, use the `production-audit` skill.

## Before changing anything
- Read the relevant code first and follow the patterns already in the repo. Don't add a library, framework or pattern when an existing one does the job.
- Don't add new infrastructure or services without a demonstrated need. When you propose one, state the monthly cost and what it takes to operate.
- For changes to authentication, payments, data deletion, the database schema or infrastructure: explain the plan, the risks and how to roll back. Within work the owner has already asked for, you may prepare and test these changes on a branch. Get explicit approval before anything reaches production or real data.

## Running commands
- Before running a script, check what it executes and which environment and credentials it uses.
- Run tests, seeds, load tests and migration experiments only in isolated environments with disposable data.
- Apply production migrations only through the project's release process, with a tested rollout and a rollback or forward-recovery plan. Any production smoke check must be explicitly scoped and non-destructive.

## Never
- Commit secrets, API keys or `.env` files, or copy secret values into code, logs, docs or chat. Secrets come from environment variables or a secret manager. If you find one in the repo, stop and flag its location without repeating its value.
- Disable, skip or weaken a test or lint rule to make it pass. Fix the cause.
- Swallow errors (empty `catch`, `except: pass`). Handle the error, or log it with context and re-raise.
- Leave mock data, hardcoded credentials, debug endpoints or unimplemented stubs in code that runs in production.
- Run destructive commands against production data or infrastructure (drop, delete, force-push, `terraform destroy`) without explicit approval.

## When the change touches these areas
- **Endpoints**: validate input at the boundary. Enforce permission on the server for the requested action on the requested resource, covering tenant boundaries, roles, ownership and sharing rules where they apply. Being logged in is not permission.
- **Network calls**: set a timeout. Retry with backoff only when the operation is safe to repeat.
- **Reads**: bound potentially large reads with pagination or a limit. For a new query pattern, check the existing indexes and the query plan, and add or change an index only when the expected workload or a measurement justifies it.
- **Slow work** (LLM calls, emails, file processing): choose request-time, streaming or background processing deliberately, and don't block a request on work that can outlast its timeout.
- **State**: keep durable user data in storage that survives the deployment's restarts and redeployments, with backup and recovery that fit the data. Never make process memory or temporary local files the only copy of important data. Persistent local storage (SQLite on a persistent volume, for example) is fine when it fits the deployment and recovery needs, and so are in-memory caches. If the app needs several instances, make sure sessions and shared state work across them. Record the setup under "Project commands".
- **Schema**: change it only through versioned migrations with a data-safe rollout and a rollback or forward-fix plan.
- **Logging**: log errors with enough context to debug, and never log secrets or personal data.
- **Agents and LLM features**: give tools only the access they need, keep each user's data out of reach of agents acting for other users, cap iterations, time and spend, and make side effects (emails, payments, posts) safe to retry without happening twice.
- **Paid APIs**: give every loop, cron or retry that calls one a hard limit.

## Verifying changes
- Add or update meaningful tests for changed behavior, especially authorization, money and data writes.
- Run the checks relevant to the change, plus every check the project's CI or release process requires.
- Flag anything that adds recurring cost, with a rough monthly estimate.

## When you finish a task
Summarize what changed, which checks you ran and their results, and what you didn't run or couldn't verify. Say clearly whether the change is only written, tested locally or in staging, or deployed. Don't say something works unless you ran it.

## Project commands
- Install: `npm ci` (CI workflows); `npm install` (README)
- Run locally: `npm run dev` (tsx, stdio MCP server); or `npm run build` then `npm start` (package.json, README)
- Test: `npm test` (Jest); `npm run test:unit`, `npm run test:integration` (package.json). CI runs integration tests with `CHILIZ_RPC_URL` and `NETWORK=testnet` (test.yml)
- Lint and type check: type check `npx tsc --noEmit` (build.yml). Lint: unknown; there is no `lint` script or ESLint config, so CI's `npm run lint --if-present` does nothing (package.json, test.yml)
- Checks required by CI or release: on push and pull_request to `main`, build.yml `build` (`npm ci`, `npm run build`, `npx tsc --noEmit`) and test.yml `test` on Node 18.x and 20.x (unit, integration, coverage). Releases run `npm test` and `npm run build` in release.yml (`v*.*.*` tags) and publish.yml (release created). `main` is not protected, so no check is required to merge (GitHub API, 404 "Branch not protected")
- Deploy: server published to npm and GitHub Packages when a GitHub release is created (publish.yml); self-host with `docker-compose up -d` (README). Landing page: `cd landing-page && npx vercel` by hand (README; vercel.json disables Git deploys); GitHub Pages serves the `gh-pages` branch (deployment records)
- Storage, backups and number of instances: no database; in-memory caches (src/utils/cache.ts) and an encrypted key file `.keys.enc` in the working directory (src/security/key-manager.ts). docker-compose.yml starts Redis (`REDIS_URL`) but src/ doesn't use it. Backups: unknown. Instances: one container in docker-compose.yml, otherwise one stdio process per MCP client (src/index.ts)
