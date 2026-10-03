output "instance_public_ip" {
  description = "Public IP of the EC2 instance running the Docker Compose stack"
  value       = aws_instance.app.public_ip
}

output "app_url" {
  description = "URL to reach the app"
  value       = "http://${aws_instance.app.public_ip}"
}

output "ssh_command" {
  description = "Command to SSH into the instance"
  value       = "ssh -i ${local_sensitive_file.private_key.filename} ubuntu@${aws_instance.app.public_ip}"
}
