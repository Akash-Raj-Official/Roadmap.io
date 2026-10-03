import "dotenv/config";
import { hash } from "bcryptjs";
import { db } from "./client";
import { users, subjects, topics, resources } from "./schema";

type CareerLevel = "fresher" | "intermediate" | "expert";

type ResourceType = "article" | "video" | "doc";
type ResourceSeed = { title: string; url: string; type: ResourceType };

// Real, first-party / reputable free learning resources per topic — official
// documentation and well-known free courses, so each link lands the learner on
// material they can actually study (no search/redirect placeholders).
const resourcesByTopic: Record<string, ResourceSeed[]> = {
  // DevOps
  "Python for DevOps": [
    { title: "The Python Tutorial (official docs)", url: "https://docs.python.org/3/tutorial/", type: "doc" },
    { title: "Automate the Boring Stuff with Python (free book)", url: "https://automatetheboringstuff.com/", type: "article" },
  ],
  "Introduction to DevOps & Cloud": [
    { title: "What is DevOps? (AWS)", url: "https://aws.amazon.com/devops/what-is-devops/", type: "article" },
    { title: "DevOps — the guide (Atlassian)", url: "https://www.atlassian.com/devops", type: "article" },
  ],
  Linux: [
    { title: "Linux Journey (free interactive course)", url: "https://linuxjourney.com/", type: "article" },
    { title: "The Linux Command Line (free book)", url: "https://linuxcommand.org/tlcl.php", type: "doc" },
  ],
  Networking: [
    { title: "How does the Internet work? (Cloudflare)", url: "https://www.cloudflare.com/learning/network-layer/how-does-the-internet-work/", type: "article" },
    { title: "Cloudflare Learning Center", url: "https://www.cloudflare.com/learning/", type: "article" },
  ],
  "Shell Scripting": [
    { title: "Bash Guide for Beginners (TLDP)", url: "https://tldp.org/LDP/Bash-Beginners-Guide/html/", type: "doc" },
    { title: "GNU Bash Reference Manual", url: "https://www.gnu.org/software/bash/manual/bash.html", type: "doc" },
  ],
  Git: [
    { title: "Pro Git (free official book)", url: "https://git-scm.com/book/en/v2", type: "doc" },
    { title: "Git reference & documentation", url: "https://git-scm.com/doc", type: "doc" },
  ],
  Docker: [
    { title: "Docker: Get started (official)", url: "https://docs.docker.com/get-started/", type: "doc" },
    { title: "Docker documentation", url: "https://docs.docker.com/", type: "doc" },
  ],
  Jenkins: [
    { title: "Jenkins User Handbook", url: "https://www.jenkins.io/doc/book/", type: "doc" },
    { title: "Jenkins guided tutorials", url: "https://www.jenkins.io/doc/tutorials/", type: "article" },
  ],
  "GitHub Actions": [
    { title: "GitHub Actions documentation", url: "https://docs.github.com/en/actions", type: "doc" },
    { title: "GitHub Skills (hands-on)", url: "https://skills.github.com/", type: "article" },
  ],
  DevSecOps: [
    { title: "OWASP Top Ten", url: "https://owasp.org/www-project-top-ten/", type: "article" },
    { title: "Trivy — vulnerability scanner docs", url: "https://trivy.dev/", type: "doc" },
  ],
  Kubernetes: [
    { title: "Kubernetes Basics (official tutorial)", url: "https://kubernetes.io/docs/tutorials/kubernetes-basics/", type: "doc" },
    { title: "Kubernetes documentation", url: "https://kubernetes.io/docs/home/", type: "doc" },
  ],
  Terraform: [
    { title: "Terraform tutorials (HashiCorp)", url: "https://developer.hashicorp.com/terraform/tutorials", type: "doc" },
    { title: "Terraform documentation", url: "https://developer.hashicorp.com/terraform/docs", type: "doc" },
  ],
  Ansible: [
    { title: "Ansible: getting started (official)", url: "https://docs.ansible.com/ansible/latest/getting_started/index.html", type: "doc" },
    { title: "Ansible documentation", url: "https://docs.ansible.com/ansible/latest/", type: "doc" },
  ],
  "Monitoring (Grafana & Prometheus)": [
    { title: "Prometheus: getting started", url: "https://prometheus.io/docs/prometheus/latest/getting_started/", type: "doc" },
    { title: "Grafana documentation", url: "https://grafana.com/docs/grafana/latest/", type: "doc" },
  ],
  "Agentic AI for DevOps": [
    { title: "Building Effective Agents (Anthropic)", url: "https://www.anthropic.com/engineering/building-effective-agents", type: "article" },
    { title: "Model Context Protocol (MCP)", url: "https://modelcontextprotocol.io/", type: "doc" },
  ],
  "Job Assistance": [
    { title: "Tech Interview Handbook (free)", url: "https://www.techinterviewhandbook.org/", type: "article" },
    { title: "Resume guide (Tech Interview Handbook)", url: "https://www.techinterviewhandbook.org/resume/", type: "article" },
  ],
  // Cloud Engineering
  "AWS Fundamentals": [
    { title: "AWS IAM User Guide", url: "https://docs.aws.amazon.com/IAM/latest/UserGuide/introduction.html", type: "doc" },
    { title: "AWS Shared Responsibility Model", url: "https://aws.amazon.com/compliance/shared-responsibility-model/", type: "article" },
  ],
  EC2: [
    { title: "Amazon EC2 User Guide", url: "https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/concepts.html", type: "doc" },
    { title: "Get started with Amazon EC2", url: "https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/EC2_GetStarted.html", type: "doc" },
  ],
  RDS: [
    { title: "Amazon RDS User Guide", url: "https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Welcome.html", type: "doc" },
  ],
  S3: [
    { title: "Amazon S3 User Guide", url: "https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html", type: "doc" },
  ],
  VPC: [
    { title: "Amazon VPC User Guide", url: "https://docs.aws.amazon.com/vpc/latest/userguide/what-is-amazon-vpc.html", type: "doc" },
  ],
};

function resourcesFor(topicTitle: string): ResourceSeed[] {
  return resourcesByTopic[topicTitle] ?? [];
}

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@roadmap.io";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";

  const [admin] = await db
    .insert(users)
    .values({
      name: "Admin",
      email: adminEmail,
      passwordHash: await hash(adminPassword, 10),
      role: "admin",
    })
    .returning();

  const [devops] = await db
    .insert(subjects)
    .values({
      slug: "devops",
      title: "DevOps",
      description: "From Linux fundamentals to Kubernetes and infrastructure automation.",
      color: "#f97316",
      order: 0,
      createdBy: admin.id,
    })
    .returning();

  const [cloud] = await db
    .insert(subjects)
    .values({
      slug: "cloud-engineering",
      title: "Cloud Engineering",
      description: "Core AWS services and cloud architecture patterns.",
      color: "#0ea5e9",
      order: 1,
      createdBy: admin.id,
    })
    .returning();

  // DevOps track milestones, ordered fresher → intermediate → expert by typical
  // job relevance. Each topic links to official docs / free courses (see above).
  const devopsMilestones: { title: string; description: string; careerLevel: CareerLevel }[] = [
    { title: "Python for DevOps", description: "Python fundamentals, APIs, file handling, and scripting for automation.", careerLevel: "fresher" },
    { title: "Introduction to DevOps & Cloud", description: "DevOps culture, career paths (DevOps/Cloud/SRE), and what to expect.", careerLevel: "fresher" },
    { title: "Linux", description: "Shell, filesystem, permissions, processes.", careerLevel: "fresher" },
    { title: "Networking", description: "TCP/IP, DNS, HTTP, load balancing basics.", careerLevel: "fresher" },
    { title: "Shell Scripting", description: "Bash fundamentals and automation scripts for cleanup, log rotation, and alerts.", careerLevel: "fresher" },
    { title: "Git", description: "Version control workflows and collaboration.", careerLevel: "fresher" },
    { title: "Docker", description: "Containers, images, Dockerfiles, Compose.", careerLevel: "intermediate" },
    { title: "Jenkins", description: "CI/CD pipelines and automation.", careerLevel: "intermediate" },
    { title: "GitHub Actions", description: "CI pipelines with SAST, OIDC to AWS, matrix builds, and self-hosted runners.", careerLevel: "intermediate" },
    { title: "DevSecOps", description: "SonarQube, Trivy, OWASP, and Docker Scout for secure CI/CD.", careerLevel: "intermediate" },
    { title: "Kubernetes", description: "Container orchestration at scale.", careerLevel: "expert" },
    { title: "Terraform", description: "Infrastructure as code.", careerLevel: "expert" },
    { title: "Ansible", description: "Architecture, inventories, ad-hoc commands, playbooks, and roles.", careerLevel: "expert" },
    { title: "Monitoring (Grafana & Prometheus)", description: "Observability, alerting, and visualization.", careerLevel: "expert" },
    { title: "Agentic AI for DevOps", description: "Gen AI, agentic frameworks, MCP integration, and a DevOps Copilot agent that reads logs and suggests fixes.", careerLevel: "expert" },
    { title: "Job Assistance", description: "LinkedIn and resume optimization, plus mock interview practice.", careerLevel: "fresher" },
  ];

  for (const [i, m] of devopsMilestones.entries()) {
    const [topic] = await db
      .insert(topics)
      .values({
        subjectId: devops.id,
        title: m.title,
        description: m.description,
        level: "milestone",
        careerLevel: m.careerLevel,
        order: i,
      })
      .returning();

    for (const [j, r] of resourcesFor(m.title).entries()) {
      await db.insert(resources).values({ topicId: topic.id, order: j, ...r });
    }
  }

  const cloudMilestones: { title: string; description: string; careerLevel: CareerLevel }[] = [
    { title: "AWS Fundamentals", description: "IAM, regions, and the shared responsibility model.", careerLevel: "fresher" },
    { title: "EC2", description: "Virtual machines, AMIs, auto scaling.", careerLevel: "fresher" },
    { title: "RDS", description: "Managed relational databases.", careerLevel: "intermediate" },
    { title: "S3", description: "Object storage and static hosting.", careerLevel: "intermediate" },
    { title: "VPC", description: "Networking, subnets, security groups.", careerLevel: "expert" },
  ];

  for (const [i, m] of cloudMilestones.entries()) {
    const [topic] = await db
      .insert(topics)
      .values({
        subjectId: cloud.id,
        title: m.title,
        description: m.description,
        level: "milestone",
        careerLevel: m.careerLevel,
        order: i,
      })
      .returning();

    for (const [j, r] of resourcesFor(m.title).entries()) {
      await db.insert(resources).values({ topicId: topic.id, order: j, ...r });
    }
  }

  console.log("Seeded database. Admin login:", adminEmail, "/", adminPassword);
}

main().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
