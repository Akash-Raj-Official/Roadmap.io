# Phase 2: AWS Deployment (Docker + Terraform + EC2)

Status: **implemented**. Written per the original brief in `PLAN.md` ("इसी project के Docker containers बनेंगे, और उसको Terraform के through AWS पे एक EC2 instance बना के Docker compose के through मैं deploy करने वाला हूँ").

See `docs/aws-runbook.md` for day-to-day operation (deploying, checking status, tearing down).

## Goal

Run roadmap.io as a self-hosted Docker Compose stack on an AWS EC2 instance, provisioned via Terraform, as a second deployment target alongside (not replacing) the existing Vercel + Turso setup. Vercel stays the primary/production deployment; AWS is the Phase 2 exercise/alternative.

## Architecture (as built)

```
Terraform (infra/aws/) — AWS account 626072240565, region us-west-2
  └─ EC2 instance (t2.medium, Ubuntu 22.04, default VPC, public IP — no Elastic IP)
       ├─ Security group: 22 (SSH, 0.0.0.0/0 for now), 80 (HTTP, 0.0.0.0/0)
       └─ user_data installs Docker + Compose, clones this repo, writes .env.production,
          and runs `docker compose up -d --build`
            └─ docker-compose.yml: a single `app` service (Next.js, built from the repo's
               Dockerfile) published on port 80 → container port 3000
```

Deliberately simpler than the original draft of this doc:
- **No Elastic IP, no domain, no TLS/reverse-proxy.** Access is plain HTTP via the instance's public IP. A caddy/nginx TLS-terminating service isn't useful without a domain, so it was dropped rather than built and left unused.
- **No image registry yet.** `docker-compose.yml` uses `build: .`, so Compose builds the image from source directly on the instance every time it's brought up. Pushing to Docker Hub and pulling a prebuilt image is **Phase 2.1** (below), not this phase.
- Turso stays the database (same as Vercel) — `lib/db/client.ts` already targets it via env vars, no migration needed, and it avoids reintroducing SQLite-on-EBS as a single point of failure.

## What's in the repo

- `Dockerfile` — multi-stage (`deps` → `builder` → `runner`), Debian-slim base (not Alpine — `better-sqlite3`'s native binding needs a compiler or a glibc-based prebuilt binary; Alpine's musl libc caused build/runtime issues, so `node:22-slim` is used instead throughout).
- `.dockerignore`
- `docker-compose.yml` — single `app` service, `env_file: .env.production` (not committed)
- `next.config.ts` — `output: "standalone"` so the runtime image only needs the standalone server bundle
- `infra/aws/` — the Terraform module (`main.tf`, `variables.tf`, `outputs.tf`, `versions.tf`, `user_data.sh.tftpl`, `terraform.tfvars.example`). State (`terraform.tfstate`) and the generated SSH key (`roadmap-ai-key.pem`) are gitignored — this is a single-operator setup, not a team-shared remote-state one.

## Explicitly out of scope for this phase

- No Kubernetes/EKS — plain Docker Compose on one instance matches the original brief.
- No multi-region/HA setup — one EC2 instance, matching "एक EC2 instance" in the brief.
- No automatic deploy-on-push to AWS — redeploying means SSHing in and running `git pull && docker compose up -d --build` (see runbook). This keeps Vercel as the always-current, auto-deploying production URL and avoids AWS drifting or double-deploying.
- SSH is open to `0.0.0.0/0` for now (`var.ssh_ingress_cidr`) — restrict this to a known IP once one is settled on; not a blocker for getting this running.

## Phase 2.1 (future, not started)

Push a prebuilt image to a registry instead of building on the instance:

1. A GitHub Actions workflow (manually triggered via `workflow_dispatch`, not on every push — this stays a secondary deployment target) builds the Docker image and pushes it to Docker Hub (or GHCR).
2. `docker-compose.yml` switches from `build: .` to `image: <registry>/<repo>:<tag>`.
3. Redeploying becomes `docker compose pull && docker compose up -d` over SSH (or via an SSM Session from the same Actions workflow) instead of a full `git pull` + rebuild-from-source.
4. Revisit whether an Elastic IP / domain / TLS is worth adding at that point, if this becomes more than an exercise.
