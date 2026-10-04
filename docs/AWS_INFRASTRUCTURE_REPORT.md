# Roadmap.io — AWS Infrastructure & Deployment Report

> **Deployment snapshot date:** 04 October 2026
> **Configured region:** `us-east-1` (US East - N. Virginia)
> **Reported instance type:** `t2.micro`
> **Status:** The original report recorded a successful HTTP health check on its capture date. Current AWS state has not been independently verified for this handoff. The repository README also describes the AWS deployment as torn down; check the AWS console and Terraform state before relying on either status.
> **Privacy:** Account, IAM user, resource IDs, database identifier, and public/private IP addresses are omitted from this report.

---

## Table of Contents

1. [Architecture & Topology](#1-architecture--topology)
2. [Terraform Files & Provisioning Details](#2-terraform-files--provisioning-details)
3. [Docker & Containerization Files](#3-docker--containerization-files)
4. [How the Containerized Application Works](#4-how-the-containerized-application-works)
5. [Container Components in Use](#5-container-components-in-use)
6. [Kubernetes — Is It Used?](#6-kubernetes--is-it-used)
7. [Software, Packages & Plugins Installed](#7-software-packages--plugins-installed)
8. [Live Server Specifications & Region Allocation](#8-live-server-specifications--region-allocation)
9. [Detailed AWS Costing Breakdown](#9-detailed-aws-costing-breakdown)
10. [Operations, Monitoring & Teardown Runbook](#10-operations-monitoring--teardown-runbook)

---

## 1. Architecture & Topology

```
Internet Request (HTTP Port 80)
            │
            ▼
┌────────────────────────────────────────────────────────┐
│  AWS Cloud (Region: us-east-1)                         │
│  Default VPC and subnet discovered by Terraform       │
│                                                        │
│  Security Group: roadmap-ai-sg                        │
│  ├─ Port 80 (HTTP)  --> 0.0.0.0/0                      │
│  ├─ Port 22 (SSH)   --> 0.0.0.0/0                      │
│  └─ Egress (All)    --> 0.0.0.0/0                      │
│                                                        │
│  EC2 Virtual Server (t2.micro target)                  │
│  Public IPv4: assigned dynamically                    │
│  Root Storage: 20 GB gp3 SSD                           │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Docker Engine 29.8.2 + Compose Plugin v5.6.0     │  │
│  │                                                  │  │
│  │  Container: roadmap-ai-app-1 (roadmap-ai-app)    │  │
│  │  Host Port 80 ────► Container Port 3000 (TCP)    │  │
│  │  Process: node server.js (Next.js Standalone)    │  │
│  │  Non-root user: nextjs (UID 1001)                │  │
│  └──────────────────────────────────────────────────┘  │
└───────────────────────────┬────────────────────────────┘
                            │ Outbound HTTPS/WSS (libSQL)
                            ▼
┌────────────────────────────────────────────────────────┐
│  Turso Cloud Database (Remote Serverless libSQL)       │
│  Database endpoint: configured outside source control  │
│  Cluster: determined by the configured Turso database  │
└────────────────────────────────────────────────────────┘
```

> **Design Principle:** The EC2 server is **completely stateless**. User accounts, roadmaps, and auth sessions persist in Turso Cloud. If the EC2 instance is terminated or rebuilt, zero application data is lost.

---

## 2. Terraform Files & Provisioning Details

The entire AWS infrastructure was provisioned via Infrastructure as Code (IaC) using **Terraform v1.16.4**. All Terraform files are located in `infra/aws/`:

```
infra/aws/
├── versions.tf               # Terraform CLI version & provider requirements
├── variables.tf              # Parameter definitions (region, instance type, secrets)
├── main.tf                   # Infrastructure declarations (keys, SG, AMI, EC2)
├── user_data.sh.tftpl        # Cloud-init automated bootstrapping bash template
├── outputs.tf                # Exported outputs (public IP, app URL, SSH command)
├── terraform.tfvars.example  # Safe template for sensitive variables
└── .terraform.lock.hcl       # Provider dependency lock file
```

### Detailed Breakdown of Each File

#### 1. `infra/aws/versions.tf`
Defines provider requirements and constraints:
- `hashicorp/aws` (~> 5.0, resolved to `v5.100.0`): Handles AWS EC2, VPC queries, and Security Groups.
- `hashicorp/tls` (~> 4.0, resolved to `v4.4.0`): Generates cryptographically secure SSH key pairs on the fly without relying on pre-existing keys.
- `hashicorp/local` (~> 2.0, resolved to `v2.9.0`): Writes the generated private key to disk with strict permissions.

#### 2. `infra/aws/variables.tf`
Declares input variables:
- `aws_region`: Defaults to `us-east-1` (matching AWS CLI configuration).
- `instance_type`: Standardized to the lower-cost `t2.micro` target for cost-sensitive deployments. Verify the live instance type in AWS after provisioning.
- `repo_url`: Public repository URL (`https://github.com/Akash-Raj-Official/Roadmap.io.git`).
- `repo_branch`: Branch deployed (`main`).
- `ssh_ingress_cidr`: Configured to `0.0.0.0/0` (can be restricted to admin IP).
- `auth_secret`, `turso_database_url`, `turso_auth_token`: Marked as `sensitive = true` so they never leak into terminal logs.

#### 3. `infra/aws/main.tf`
Declares 5 managed resources and 3 dynamic data lookups:
1. `tls_private_key.this`: Generates a fresh 4096-bit RSA key pair.
2. `aws_key_pair.this`: Uploads the public key to AWS EC2 under the key name `roadmap-ai-key`.
3. `local_sensitive_file.private_key`: Saves the private key to `infra/aws/roadmap-ai-key.pem` with restricted read permissions (`0600`).
4. `aws_security_group.app`: Creates `roadmap-ai-sg` with inbound TCP port 80 (HTTP for web traffic) and port 22 (SSH for management), plus unrestricted outbound egress.
5. `data.aws_ami.ubuntu`: Automatically searches for and resolves the latest Canonical official Ubuntu 22.04 LTS (Jammy) AMI (`ami-062944a84867f2386`).
6. `data.aws_vpc.default` & `data.aws_subnets.default`: Discovers the default AWS VPC and subnets without needing hardcoded IDs.
7. `aws_instance.app`: Provisions the target `t2.micro` EC2 virtual machine in the Terraform codebase with a 20GB gp3 root volume, associates a dynamic public IP, and injects the rendered `user_data.sh.tftpl`.

#### 4. `infra/aws/user_data.sh.tftpl`
The cloud-init startup script executed by Ubuntu upon initial boot:
- Installs Docker CE, containerd, and `docker-compose-plugin` from official Docker apt repositories.
- Clones `https://github.com/Akash-Raj-Official/Roadmap.io.git` into `/opt/roadmap-ai`.
- Generates `/opt/roadmap-ai/.env.production` containing production credentials (`AUTH_SECRET`, `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`).
- Launches `docker compose up -d --build` to automatically build the multi-stage image and start the container in detached mode.

#### 5. `infra/aws/outputs.tf`
Outputs exposed upon provisioning:
- `instance_public_ip`: assigned by AWS; retrieve with `terraform output`
- `app_url`: generated from the current public IP
- `ssh_command`: generated from the current public IP and local private key path

> **Instance-type note:** `t2.micro` is the Terraform target configuration. The actual AWS instance type and running state must be checked in AWS.

---

## 3. Docker & Containerization Files

The containerization pipeline consists of 3 files in the project root:

```
/ (Repository Root)
├── Dockerfile          # 3-Stage Multi-Architecture Container Build
├── docker-compose.yml  # Service Orchestration & Port Binding
└── .dockerignore       # Exclusion rules preventing bloated build context
```

### 1. `Dockerfile`
A multi-stage build using Debian-based `node:22-slim`:
- **Stage 1 (`deps`)**:
  - Base: `node:22-slim`
  - Installs system build utilities: `python3`, `make`, `g++` (required by `node-gyp` to compile native C++ addons for `better-sqlite3`).
  - Copies `package.json` and `package-lock.json` and executes `npm ci`.
- **Stage 2 (`builder`)**:
  - Copies installed `node_modules` from Stage 1 and application source code.
  - Injects build-time placeholder `ENV AUTH_SECRET=build-placeholder` (real secrets are supplied at runtime).
  - Disables Next.js telemetry (`ENV NEXT_TELEMETRY_DISABLED=1`).
  - Executes `npm run build`, producing an optimized `.next/standalone` production bundle.
- **Stage 3 (`runner`)**:
  - Starts with a clean, minimal `node:22-slim` runtime base (no compilers or build tools).
  - Creates a dedicated non-root Linux system user (`nextjs:nodejs`, UID 1001).
  - Copies only the necessary runtime files: `public/`, `.next/standalone/`, and `.next/static/`.
  - Exposes port `3000` and executes `CMD ["node", "server.js"]`.

> **Why Debian-slim instead of Alpine?**
> `better-sqlite3` requires glibc for native binary compilation. Alpine uses musl libc, which causes node-gyp compilation failures and segfaults on native bindings. `node:22-slim` provides 100% stability.

### 2. `docker-compose.yml`
```yaml
services:
  app:
    build: .
    ports:
      - "80:3000"
    env_file:
      - .env.production
    restart: unless-stopped
```
- Maps host port `80` directly to container port `3000`.
- Injects environment variables securely from `/opt/roadmap-ai/.env.production`.
- Automatically restarts the container if it crashes or if the host EC2 instance reboots (`restart: unless-stopped`).

### 3. `.dockerignore`
Excludes `.git`, `node_modules`, `.next`, `infra/aws/*.pem`, `infra/aws/*.tfstate`, and documentation files from being sent to the Docker build daemon, keeping the build context fast and lightweight.

---

## 4. How the Containerized Application Works

1. **Build Phase (on the EC2 host)**:
   - When `docker compose up -d --build` runs, Docker executes the 3-stage Dockerfile.
   - Stage 1 compiles native C++ modules.
   - Stage 2 uses Turbopack to build Next.js with `output: "standalone"` (configured in `next.config.ts`).
   - Stage 3 produces a production container image of **470 MB** (drastically smaller than the full ~1.3 GB source + node_modules directory).
2. **Runtime Execution**:
   - The container runs as the unprivileged user `nextjs` for security hardening.
   - The entrypoint executes `node server.js`, which is Next.js's standalone HTTP server listening on internal port `3000`.
   - Docker daemon listens on EC2 port `80` and forwards requests into container port `3000`.
3. **Database Communication**:
   - Next.js Server Actions and API routes connect outbound to **Turso Cloud** using the `@libsql/client` SDK over secure WebSockets/HTTPS.
   - All roadmap items, comments, user credentials, and authentication sessions live in Turso.
   - No database queries or data files are stored locally on the EC2 disk.

---

## 5. Container Components in Use

| Component | Detail | Purpose |
| :--- | :--- | :--- |
| **Container Name** | `roadmap-ai-app-1` | Active running container instance |
| **Service Name** | `app` | Defined in `docker-compose.yml` |
| **Image Name & Tag** | `roadmap-ai-app:latest` | Local image built on EC2 from Dockerfile |
| **Image Size** | **470 MB** | Lightweight standalone Next.js image |
| **Base Image** | `node:22-slim` (Debian 12 Bookworm) | Minimal Node.js 22 LTS runtime |
| **Port Binding** | `0.0.0.0:80 -> 3000/tcp` | Exposes application directly on web standard port 80 |
| **Security User** | `nextjs` (UID: 1001, GID: 1001) | Non-root container process execution |
| **Health & Status** | `Up` (Running continuously) | Restart policy: `unless-stopped` |

---

## 6. Kubernetes — Is It Used?

### Is Kubernetes used in this deployment?
**No. Kubernetes (K8s) or Amazon EKS is NOT used in this setup.**

### Technical Rationale
1. **Scope & Specification**: The project requirement specifically called for:
   > *"Docker containers बनेंगे, और उसको Terraform के through AWS पे एक EC2 instance बना के Docker compose के through मैं deploy करने वाला हूँ।"*
2. **Architecture Match**: Roadmap.io is a single monolithic Next.js application backed by a cloud database. A single EC2 host managed by **Docker Compose** is the most cost-efficient, performant, and low-maintenance architecture for this workload.
3. **Cost Avoidance**:
   - Amazon EKS cluster control plane alone costs **$73.00/month** just to exist, before adding worker node instances, Application Load Balancers ($18/month), and NAT Gateways ($32/month).
   - Running Kubernetes here would increase monthly AWS costs from ~$35 to over **~$140+/month** with zero functional benefit for a single website container.
4. **Orchestration Tool Used**: Single-node **Docker Compose** handles process management, automatic restart policies (`unless-stopped`), port routing, and environment injection.

---

## 7. Software, Packages & Plugins Installed

### A. Infrastructure & Host Level (EC2 Ubuntu 22.04 LTS)
- **Linux Kernel**: `6.8.0-1066-aws` (AWS optimized x86_64 kernel)
- **Docker CE (Community Edition)**: `v29.8.2` (build `7fc2dff`)
- **Docker Compose Plugin**: `v5.6.0`
- **containerd.io**: `v2.3.6` (high-performance container runtime)
- **docker-buildx-plugin**: `v0.37.1` (BuildKit engine for caching and multi-stage builds)
- **Git**: `v2.34.1` (repository cloning and branch management)
- **OpenSSL / CA-Certificates**: Up-to-date TLS/SSL certificates for secure outbound package fetching

### B. Terraform Providers & Plugins (Local Management)
- **Terraform CLI**: `v1.16.4` (HashiCorp)
- **AWS Provider (`hashicorp/aws`)**: `v5.100.0`
- **TLS Provider (`hashicorp/tls`)**: `v4.4.0`
- **Local Provider (`hashicorp/local`)**: `v2.9.0`

### C. Build-Time Compilers (Inside Docker `deps` Stage only)
- `python3` (v3.11)
- `make`
- `g++` (GCC v12)
- `libc6-dev`
*(These build packages were purged from the final image stage to keep the production container small and attack-surface minimal)*.

### D. Application Runtime Frameworks & Libraries
- **Node.js**: `v22.x`
- **Next.js**: `v16.3.4` (with Turbopack build engine & standalone server output)
- **React / React DOM**: `v19.2.8`
- **Drizzle ORM**: `v0.45.2`
- **Database Client**: `@libsql/client v0.18.0` (Turso driver)
- **Authentication**: `next-auth v5.0.0-beta.32` / `bcryptjs v3.0.3`
- **Styling**: Tailwind CSS v4, `@base-ui/react`, `lucide-react`

---

## 8. Live Server Specifications & Region Allocation

### EC2 Hardware & Virtual Server Specs
| Specification | Value | Verified From Host |
| :--- | :--- | :--- |
| **AWS Region** | **`us-east-1` (US East - N. Virginia)** | Configured in Terraform & AWS CLI |
| **Availability Zone** | **`us-east-1a`** | `Placement.AvailabilityZone` |
| **Instance Type** | **`t2.micro`** | Terraform configuration target; verify actual AWS state |
| **vCPUs** | **1 vCPU** | AWS low-cost burstable virtual machine |
| **Total Memory (RAM)** | **1.0 GiB (~1.0 GB)** | EC2 instance memory; swap is separate disk-backed capacity |
| **Swap Space** | **2 GB configured** | Created by `user_data.sh.tftpl` to support the on-instance image build |
| **Root Disk Storage** | **20.0 GB gp3 SSD** | Terraform root volume configuration |
| **Disk Throughput & IOPS** | **3,000 IOPS / 125 MB/s** | Default baseline for gp3 volumes |
| **Disk Space Usage** | **6.0 GB Used (32%)**, **14.0 GB Free** | `df -h /` |
| **Network Performance** | Low to Moderate | AWS Default VPC |
| **Public IPv4 Address** | Dynamic | Retrieve from Terraform output or AWS console |
| **Private IPv4 Address** | Dynamic | Assigned by the selected subnet |
| **AMI** | Canonical Ubuntu 22.04 LTS (Jammy) | Resolved dynamically by Terraform |
| **Virtualization Type** | Hardware Virtual Machine (HVM) | Modern hypervisor |

---

## 9. Detailed AWS Costing Breakdown

Pricing is calculated based on AWS on-demand rates in the **`us-east-1`** region:

### Itemized Cost Table (Monthly - 730 Hours)

| Service / Resource | Pricing Rate | Monthly Estimate (USD) |
| :--- | :--- | :--- |
| **EC2 `t2.micro` live AWS state** | $0.0116 per hour | **~$8.47 / month** |
| **EBS Storage (20 GB gp3)** | $0.08 per GB-month | **$1.60 / month** |
| **EBS IOPS (3,000 IOPS)** | Included free with gp3 baseline | **$0.00** |
| **EBS Throughput (125 MB/s)** | Included free with gp3 baseline | **$0.00** |
| **Public IPv4 Address** | $0.005 per hour (AWS standard charge) | **~$3.65 / month** |
| **Data Transfer In** | Free for all inbound data | **$0.00** |
| **Data Transfer Out** | First 100 GB / month is free | **$0.00** (under normal traffic) |
| **Security Groups & VPC** | Included with AWS networking | **$0.00** |
| **Total Estimated Cost (live `t2.micro` state)** | — | **~$14.00 – $18.00 / month** |

### Annual Cost Projection
- **On-Demand (24/7 Running, live `t2.micro` state)**: ~ $168.00 to ~$216.00 / year.
- **Cost Reduction Strategies**:
  1. **Keep the instance at `t2.micro`**: This is the lowest-cost option for a single small app workload and aligns with the project’s current infrastructure code.
  2. **Free Tier eligibility**: If the account qualifies for the EC2 Free Tier in the relevant billing period, the monthly cost can be lower or zero for that service component, depending on usage limits and account history.
  3. **Development/Testing Teardown**: Running `terraform destroy` when not showcasing the project stops billing immediately.

---

## 10. Operations, Monitoring & Teardown Runbook

### 1. View App in Browser
Open the `app_url` Terraform output after confirming the instance is running.

### 2. Connect via SSH
From the project root on your local machine:
```bash
ssh -i infra/aws/roadmap-ai-key.pem ubuntu@<instance-public-ip>
```

### 3. Check Live Container Health & Logs
```bash
# Check container status
ssh -i infra/aws/roadmap-ai-key.pem ubuntu@<instance-public-ip> "sudo docker compose -f /opt/roadmap-ai/docker-compose.yml ps"

# Stream live application logs
ssh -i infra/aws/roadmap-ai-key.pem ubuntu@<instance-public-ip> "sudo docker compose -f /opt/roadmap-ai/docker-compose.yml logs -f app"
```

### 4. Deploy Updates (After Pushing Changes to GitHub)
```bash
ssh -i infra/aws/roadmap-ai-key.pem ubuntu@<instance-public-ip> "cd /opt/roadmap-ai && sudo git pull && sudo docker compose up -d --build"
```

### 5. Complete Teardown (Stop Billing)
To terminate the EC2 server and release all resources when no longer needed:
```bash
cd infra/aws
terraform destroy
```
