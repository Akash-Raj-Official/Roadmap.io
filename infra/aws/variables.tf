variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "us-west-2"
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t2.medium"
}

variable "repo_url" {
  description = "Git URL of the app repo to clone onto the instance"
  type        = string
  default     = "https://github.com/Akash-Raj-Official/Roadmap.io.git"
}

variable "repo_branch" {
  description = "Branch to deploy"
  type        = string
  default     = "main"
}

variable "ssh_ingress_cidr" {
  description = "CIDR allowed to SSH into the instance. Restrict this to your own IP (e.g. \"203.0.113.4/32\") when you have it."
  type        = string
  default     = "0.0.0.0/0"
}

variable "auth_secret" {
  description = "Auth.js AUTH_SECRET for the running app"
  type        = string
  sensitive   = true
}

variable "turso_database_url" {
  description = "Turso libSQL database URL"
  type        = string
  sensitive   = true
}

variable "turso_auth_token" {
  description = "Turso database auth token"
  type        = string
  sensitive   = true
}
