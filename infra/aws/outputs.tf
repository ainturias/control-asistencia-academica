output "backend_public_ip" {
  description = "Dirección IP pública del servidor Backend"
  value       = aws_instance.backend_server.public_ip
}

output "backend_ssh_command" {
  description = "Comando para conectarse por SSH al Backend"
  value       = "ssh -i ~/.ssh/diplo_mod2_key ubuntu@${aws_instance.backend_server.public_ip}"
}

output "backend_api_url" {
  description = "URL directa de la API NestJS"
  value       = "http://${aws_instance.backend_server.public_ip}:3000/api"
}

output "frontend_public_ip" {
  description = "Dirección IP pública del servidor Frontend"
  value       = aws_instance.frontend_server.public_ip
}

output "frontend_url" {
  description = "URL pública de la aplicación web (Frontend)"
  value       = "http://${aws_instance.frontend_server.public_ip}"
}

output "frontend_ssh_command" {
  description = "Comando para conectarse por SSH al Frontend"
  value       = "ssh -i ~/.ssh/diplo_mod2_key ubuntu@${aws_instance.frontend_server.public_ip}"
}
