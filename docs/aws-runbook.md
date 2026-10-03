# AWS Runbook

Terraform module: `infra/aws/`. State is local (`infra/aws/terraform.tfstate`, gitignored) — this is a single-operator setup.

## First-time apply

```bash
cd infra/aws
terraform init

export TF_VAR_auth_secret="$(openssl rand -base64 32)"
export TF_VAR_turso_database_url="libsql://<your-turso-db>.turso.io"
export TF_VAR_turso_auth_token="$(turso db tokens create <your-turso-db>)"

terraform plan -out=tfplan   # review the plan
terraform apply "tfplan"
rm -f tfplan                 # contains secrets in plaintext — never commit it, delete after apply
```

Outputs `app_url` (open it in a browser after ~2-3 minutes — the instance needs time to install Docker and build the image via `user_data`) and `ssh_command`.

The generated SSH private key lands at `infra/aws/roadmap-ai-key.pem` (gitignored, mode 0600).

## Redeploying after a code change

The instance built the image from a `git clone` of `main` at boot time — it does not auto-update. To pick up new commits:

```bash
ssh -i infra/aws/roadmap-ai-key.pem ubuntu@<instance_public_ip>
cd /opt/roadmap-ai
sudo git pull
sudo docker compose up -d --build
```

## Checking status

```bash
ssh -i infra/aws/roadmap-ai-key.pem ubuntu@<instance_public_ip>
sudo docker compose -f /opt/roadmap-ai/docker-compose.yml ps
sudo docker compose -f /opt/roadmap-ai/docker-compose.yml logs -f app
```

Boot-time setup logs (Docker install, git clone, first build) are in `/var/log/cloud-init-output.log` on the instance.

## Rotating secrets

Edit `/opt/roadmap-ai/.env.production` on the instance directly and `docker compose up -d` to pick up the change, or change the Terraform variables and `terraform apply` again (this replaces the instance's user_data but **will not rerun it on an existing instance** — for a secret rotation via Terraform, taint and recreate: `terraform apply -replace=aws_instance.app`).

## Tearing down

```bash
cd infra/aws
terraform destroy
```

This is a `t2.medium` (not free-tier) — destroy it when you're done experimenting to stop billing. There's no Elastic IP to separately release; the instance's public IP is deallocated automatically when the instance terminates, and it **will change** on the next `apply`.

## Known limitations (by design, for this phase)

- No domain, no Elastic IP, no TLS — access is over plain HTTP via the instance's public IP, which changes if the instance is replaced.
- No CI/CD wiring to this environment — deploys are manual (`git pull && docker compose up -d --build` over SSH).
- Image is built from source on the instance itself, not pulled from a registry. See **Phase 2.1** in `docs/AWS_DEPLOYMENT_PLAN.md` for pushing to Docker Hub and pulling a prebuilt image instead.
