# --- SSH key pair (generated fresh for this project, not reused from other keys in the account) ---

resource "tls_private_key" "this" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "aws_key_pair" "this" {
  key_name   = "roadmap-ai-key"
  public_key = tls_private_key.this.public_key_openssh
}

resource "local_sensitive_file" "private_key" {
  content         = tls_private_key.this.private_key_pem
  filename        = "${path.module}/roadmap-ai-key.pem"
  file_permission = "0600"
}

# --- Networking: default VPC/subnet, no Elastic IP ---

data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

resource "aws_security_group" "app" {
  name        = "roadmap-ai-sg"
  description = "roadmap.io EC2 host: SSH + HTTP"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.ssh_ingress_cidr]
  }

  ingress {
    description = "HTTP (app)"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name    = "roadmap-ai-sg"
    Project = "roadmap-io"
  }
}

# --- AMI: latest Ubuntu 22.04 LTS ---

data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# --- EC2 instance ---

resource "aws_instance" "app" {
  ami                         = data.aws_ami.ubuntu.id
  instance_type               = var.instance_type
  subnet_id                   = data.aws_subnets.default.ids[0]
  vpc_security_group_ids      = [aws_security_group.app.id]
  key_name                    = aws_key_pair.this.key_name
  associate_public_ip_address = true
  user_data_replace_on_change = true

  root_block_device {
    volume_size = 20
    volume_type = "gp3"
  }

  user_data = templatefile("${path.module}/user_data.sh.tftpl", {
    repo_url           = var.repo_url
    repo_branch        = var.repo_branch
    auth_secret        = var.auth_secret
    turso_database_url = var.turso_database_url
    turso_auth_token   = var.turso_auth_token
  })

  tags = {
    Name    = "roadmap-io"
    Project = "roadmap-io"
  }
}
