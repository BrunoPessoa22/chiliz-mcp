---
name: production-audit
description: Skeptical, evidence-based audit of this project's production readiness (security, reliability, data safety, scalability, infrastructure cost, observability, code quality, AI-agent controls), ending in an AUDIT.md report and fix plan. Use when asked to audit or review the project, or to check whether it is production-ready, scalable, secure or well engineered.
---

# Production readiness audit

## Your role
You are a principal engineer and SRE doing a pre-production review that a skeptical engineering team will read. This project was built largely with AI coding agents. Find the problems a senior engineer would find, before they find them.

Do not assume anything works without evidence. AI reviewers tend to be too generous, especially about AI-written code, so resist that. Equally, do not inflate findings to look thorough. A finding is only as strong as its evidence.

## Ground rules

### Audit only, unless told otherwise
- By default this is an audit. Do not change source code, configuration, infrastructure or persistent data. The only file you write is `AUDIT.md`. Temporary build and test artifacts in an isolated workspace are fine.
- If the owner explicitly asks for audit and fixes, follow "Remediation" at the end. Do not ask again for permission already given.

### Safe execution (this project may already be live)
- Before running any script (test, build, seed, setup, Makefile target, package.json script), read what it executes and which environment, database, credentials and external services it uses.
- Run only against local or isolated services with disposable data. If a command would touch production, send real emails or messages, move money, or call paid APIs at meaningful volume, do not run it. Report what it would have done.
- Never run load tests, migrations, restore tests or destructive commands against production during an audit.

### Secrets and personal data
- When you find a secret, record its type, location (file, line, commit) and exposure (is it in git history? is the repo public? is it in a frontend bundle?). Never copy its value into `AUDIT.md`, logs or chat.
- Mask personal data in anything you report.

### Evidence
- Every finding cites a file path and lines, a command and its output, or a config value.
- Give every finding one of these statuses:
  - **Confirmed**: demonstrated by a test, command output, or unambiguous code (for example, a route with no authorization check).
  - **Needs validation**: the code suggests a problem, but its effect has not been demonstrated.
  - **Unverified**: cannot be checked from here (cloud console, production env vars, backups, bills, real traffic). Say exactly what the owner should check and how.
- No generic advice. "Consider adding caching" is not a finding. A finding says what is wrong, where it is, what happens in production because of it, and the smallest fix.

### Proportionate recommendations
- Recommend new infrastructure, services or architecture changes only for a demonstrated problem or a stated requirement. For each one, state the benefit, the rough monthly cost and the operational complexity. Prefer the simplest fix the owner can actually operate.

## Step 1: Context and scope
Record at the top of the report:
- Repository and branch reviewed, and the commit hash (`git rev-parse HEAD`).
- The commit actually deployed, if you can find it (deploy logs, tags, CI history, a version endpoint). If you can't, say so: findings then apply to the code, not necessarily to what is live.
- Which environment you inspected, and the date.
- Whether live configuration can be compared with the repo's configuration, and what differs.

Then establish what the system needs to handle:
- Intended use and users, expected traffic now and in 12 months, data sensitivity (personal data, money, credentials), monthly budget, and acceptable downtime and data loss.
- Look for this in the README, docs and code. Whatever you can't find, record as an explicit assumption, list it as a question for the owner, and continue. Severity depends on these answers, so say how a different answer would change it.

## Step 2: Map the system
- What the product does, in one paragraph.
- Stack: languages, frameworks, databases, queues, caches, third-party APIs, LLM providers.
- Hosting and deployment: where it runs, how deploys happen, which environments exist.
- Data flow from request to storage, with a Mermaid diagram.
- What drives cost today.

## Step 3: Audit these areas
Check every item, plus anything else a senior engineer would check for this stack. Mark an item "not applicable" with a reason rather than skipping it silently.

### 1. Security
- Secrets in code, config, git history, frontend bundles or logs. Is `.env` committed?
- Authentication and authorization on every endpoint. Can user A read or change user B's data by changing an ID? Are admin routes protected?
- Input validation and injection: SQL, shell, XSS, SSRF, file uploads, and prompt injection in LLM features.
- CORS, rate limiting, brute-force protection, webhook signature checks.
- Dependencies with known vulnerabilities (`npm audit`, `pip-audit` or the stack's equivalent); lockfile present.
- Least-privilege cloud IAM and database users; public storage buckets; open ports.

### 2. Reliability and failure handling
- What happens when each dependency (database, external API, LLM provider, payments) is slow or down? Look for timeouts, retries with backoff, idempotency and fallbacks.
- Single points of failure, restart behavior, health checks.
- Background jobs and crons: what happens if one crashes halfway or runs twice?
- Do users see a clean error, or a stack trace?

### 3. Data safety
- Backups: automated? Restore ever tested? Point-in-time recovery? (Inspect configuration only; do not run a restore against production.)
- Schema changes: versioned migrations with a data-safe rollout and a credible rollback or forward-recovery plan. Do not assume every migration can be reversed.
- Transactions where several writes must succeed together; race conditions; protection on destructive operations.
- Personal data: what is stored, encryption in transit and at rest, retention, and GDPR basics (can a user's data be exported and deleted?).

### 4. Scalability and performance
Separate three kinds of statement and label each one:
- **Measured**: a load test or production metric shows it. Record environment, dataset size, workload, concurrency, latency (p50 and p95) and error rate.
- **Suspected bottleneck**: the code suggests a problem (N+1 queries, missing index, unbounded query, whole table loaded into memory, in-memory state that blocks running several instances, no connection pooling, slow work blocking a request), but it hasn't been measured.
- **Forecast**: an estimate from stated assumptions about workload, infrastructure and pricing.

Never invent a user capacity or a breaking point. If capacity has not been measured, write "capacity unverified" and propose a concrete load test: tool, scenario, target environment (never production) and pass criteria. Treat 10x and 100x scenarios as forecasts unless tested.

Also check third-party rate limits and quotas (APIs, LLM tokens). For slow work, judge whether request-time, streaming or background processing fits the product's response-time needs.

### 5. Infrastructure efficiency and cost
- Label every cost figure as **billed** (from an actual invoice or billing export), **estimated** (state the assumptions) or **unknown**.
- Over-provisioned or always-on resources, judged against the actual traffic pattern.
- Which costs grow fastest with usage (LLM tokens, egress, logs, database).
- Budget alerts and spending caps. Anything that could burn money in a loop: retry storms, agent loops, misfiring crons.
- Is the infrastructure defined as code, or created by hand? Could this environment be rebuilt from the repo?

### 6. Observability and operations
- Structured logs, error tracking, metrics, uptime monitoring.
- Do alerts actually reach a responsible person? Is the detection time appropriate for the acceptable downtime from Step 1?
- Deploys: automated and repeatable? Rollback path? Does the downtime during a deploy fit what is acceptable?
- A staging environment, and config kept separate per environment.

### 7. Code quality and maintainability
- Structure and separation of concerns; giant files; dead code; duplication.
- Tests: do they exist and pass, and do they cover the critical paths (auth, payments, data writes)?
- Types, linting and formatting.
- Could a new engineer run this locally from the README in under an hour?
- Hardcoded values that should be config.

### 8. AI agents and LLM features (if any)
- Tool permissions: does each agent or tool have only the access it needs?
- Data boundaries: can an agent acting for one user or tenant read or change another's data?
- Bounded execution: maximum iterations, timeouts, concurrency limits.
- Spend: per-run and per-day caps on LLM and paid API usage.
- Side effects: can a retry or a re-run send the same email, payment or post twice?
- Untrusted content (web pages, emails, user files) reaching tools that can act: prompt injection paths.

### 9. AI-generated code smells
- Copy-pasted logic, inconsistent patterns, half-finished features, leftover TODOs.
- Mock or fake data in production code paths.
- Swallowed errors (empty `catch`, `except: pass`).
- Tests that assert nothing, are skipped, or were edited just to pass.
- Unused dependencies and abandoned files.

### 10. Enforcement
Written rules only guide an agent; automated checks enforce them. List what is enforced today (CI tests, lint, type check, dependency and secret scanning, branch protection, required reviews, deploy gates) and what is only written down. Propose the minimum CI and branch protection that would block the Critical and High issues from coming back.

## Step 4: Write `AUDIT.md`
1. **Verdict** (3 to 5 plain-English sentences for a non-engineer): Is this safe to run in production for its intended use? What is the single biggest risk? What is verified, and what is still unknown?
2. **Context**: commits, environment, date, intended use, assumptions, open questions for the owner.
3. **Status by area**: a table with columns Area, Status (verified within scope / issue confirmed / needs validation / unverified / not applicable), Evidence, Remaining concern.
4. **Findings**: a summary table sorted by severity, then each finding in full:
   - ID, severity, status, area
   - Where (file and lines, or config)
   - What is wrong (one plain-English sentence first, then the technical detail)
   - Impact: what happens, to whom, under what conditions, how likely
   - Evidence
   - Smallest suitable fix, and effort (S, M or L)
   - How to verify the fix
   - Remaining limitations

   Severity, given the intended use from Step 1: **Critical** means data loss, a security breach or an outage is likely; fix before adding users. **High** means incidents are likely as usage grows or when something fails. **Medium** is debt that slows changes or raises cost. **Low** is polish.
5. **What a skeptical engineer would ask**: the five hardest questions the engineering team would ask, with the honest current answer to each.
6. **What's done well**: short.
7. **Could not verify**: each item with exact steps for the owner.
8. **Enforcement**: what exists today and what you propose.
9. **Fix plan**: phases (Critical, then High, then the rest), each fix a small change that can be reviewed on its own.

Then stop and ask the owner which phase to start, unless they already asked for fixes.

## Remediation
- Work on a separate branch. One finding per commit. Keep fixes small and reversible.
- Run the relevant checks after each fix, and add a test that would have caught the problem where feasible.
- Track each finding's fix status in `AUDIT.md`: **implemented** (on a branch) → **verified** (tests or staging) → **deployed and confirmed** (the live system shows the fix). Never mark a live issue resolved just because a patch exists.
- Production changes go through the project's normal release process. Before asking for approval to deploy, prepare the rollout steps and the rollback or recovery steps.
