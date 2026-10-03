# Roadmap Website — Build Plan

## Product goal

Build a website where visitors can browse structured learning roadmaps, while an authenticated administrator creates and maintains subjects and their topics.

Examples:

- **DevOps**: Python, Linux, Git, Docker, Jenkins, Kubernetes, Terraform
- **Cloud Engineering**: AWS, EC2, RDS, IAM, VPC, Lambda

Each roadmap should guide a learner through topics in a deliberate order and make their current learning progress easy to understand.

## Roles

| Role | Capabilities |
| --- | --- |
| Visitor | Browse published roadmaps and topic details. |
| Learner (optional for MVP) | Sign in, mark topics complete, and track progress. |
| Admin | Create, edit, reorder, publish, and archive roadmaps and topics. |

## MVP scope

### Public experience

- Home page listing published roadmaps.
- Roadmap detail page with a visual or ordered topic path.
- Topic page with description, learning objectives, resources, and prerequisites.
- Responsive, accessible interface and shareable URLs.

### Admin experience

- Secure admin sign-in.
- Create, edit, delete, draft, and publish roadmaps.
- Create, edit, delete, and reorder topics inside a roadmap.
- Set topic descriptions, external learning resources, difficulty, estimated duration, and prerequisite topics.

### Explicitly deferred

- Public roadmap authoring and collaboration.
- Comments, ratings, certificates, paid content, and recommendations.
- Multiple languages.
- Fine-grained permissions beyond admin and visitor.

## Recommended architecture

| Area | Choice | Notes |
| --- | --- | --- |
| Web app and API | Next.js with TypeScript | Use App Router, server components where useful, and route handlers/server actions for admin workflows. |
| UI | Tailwind CSS + a component library | Keeps the admin UI and public pages consistent. |
| Data access | Drizzle ORM | Type-safe migrations and smooth SQLite/Turso support. |
| Local database | SQLite | Fast local development. |
| Production database | Turso (libSQL) | Hosted SQLite-compatible database. |
| Authentication | Auth.js or Clerk | Restrict the admin console; select after answering the auth question below. |
| Hosting, phase 1 | Vercel | Preview deployments and production deployment. |
| CI | GitHub Actions | Lint, type-check, test, build, then deploy through Vercel integration or Vercel CLI. |
| Phase 2 hosting | Docker Compose on AWS EC2 | Provision the instance, networking, and security groups with Terraform. |

## Core data model

```text
User
  id, email, name, role (ADMIN | LEARNER), createdAt

Roadmap
  id, slug, title, description, status (DRAFT | PUBLISHED | ARCHIVED),
  coverImageUrl, createdById, createdAt, updatedAt

Topic
  id, roadmapId, slug, title, description, position, difficulty,
  estimatedHours, status, createdAt, updatedAt

TopicPrerequisite
  topicId, prerequisiteTopicId

Resource
  id, topicId, title, url, type (ARTICLE | VIDEO | COURSE | DOCUMENTATION), position

TopicProgress (phase after public browsing MVP)
  userId, topicId, completedAt
```

Keep `position` as a sortable numeric value. Prerequisites enable a roadmap to be displayed as a graph later, while the first version can show topics as an ordered path.

## Routes

```text
/                         Published roadmap catalog
/roadmaps/[slug]          Roadmap and ordered topic path
/roadmaps/[slug]/[topic]  Topic details and resources
/admin                    Admin dashboard
/admin/roadmaps           Roadmap management
/admin/roadmaps/[id]      Roadmap editor and topic reordering
```

## Delivery phases

### Phase 0 — Foundation

1. Create the Next.js TypeScript repository.
2. Configure formatting, ESLint, type checking, unit-test tooling, and environment validation.
3. Set up Drizzle, local SQLite, migrations, and seed data for DevOps and Cloud Engineering.
4. Add secure admin authentication and role checks.

### Phase 1 — Vercel product release

1. Build the public roadmap catalog, roadmap detail, and topic pages.
2. Build the admin CRUD workflow and topic ordering.
3. Add draft/publish controls and validate all admin input.
4. Write unit tests for validation, authorization, ordering, and data access; add end-to-end coverage for the admin create/publish flow.
5. Configure GitHub Actions to lint, type-check, test, and build on pull requests.
6. Deploy previews and production to Vercel; connect Turso production credentials through Vercel environment variables.

### Phase 2 — AWS container deployment

1. Add a production multi-stage Dockerfile and Docker Compose configuration.
2. Create Terraform for EC2, IAM, security group, persistent configuration, and DNS/TLS approach.
3. Set up a GitHub Actions deployment workflow that builds/publishes an image and safely updates the EC2 service.
4. Add backups, monitoring/log collection, health checks, rollback procedure, and secret management.

## Quality and security requirements

- Only admins may access `/admin` or mutate roadmap content.
- Validate URLs, slugs, required fields, and topic ordering on the server.
- Never commit credentials; use `.env.local` locally and managed environment variables in deployments.
- Require CI checks before merging to the default branch.
- Maintain database migrations and a repeatable seed process.
- Use an HTTPS-only production deployment and restrict EC2 inbound ports to SSH (ideally through SSM) and HTTP/HTTPS.

## Suggested first milestone

Deliver one polished, read-only DevOps roadmap with seeded data, then introduce the admin console to manage that same content. This establishes the core experience before building content-management complexity.

## Decisions needed

See [questions.md](questions.md) before implementation. The answers determine the exact schema, authentication design, UI, and deployment workflow.

## Parallel quality workflow

The app should be implemented in dependency order, while quality work runs concurrently for each finished, focused change. The versioned agent contracts live in [`claude/agents`](../claude/agents/README.md).

| Agent | Responsibility |
| --- | --- |
| Code reviewer | Correctness, security, authorization, data and accessibility review. |
| Lint and types | Formatter, ESLint, and TypeScript validation. |
| Unit-test engineer | Validation, data access, authorization, and server/API tests. |
| E2E-test engineer | The affected browser workflow. |
| Quality orchestrator | Starts applicable tasks in parallel and summarizes findings. |

GitHub Actions always runs the underlying formatting, lint, type, and test commands itself. Agent output guides development and pull-request review; deterministic CI remains the deployment gate.
