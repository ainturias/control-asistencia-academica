output "resource_group_name" {
  description = "Nombre del grupo de recursos de Azure"
  value       = azurerm_resource_group.rg.name
}

output "backend_public_ip" {
  description = "Dirección IP pública del servidor Backend en Azure"
  value       = azurerm_public_ip.backend_pip.ip_address
}

output "backend_ssh_command" {
  description = "Comando para conectarse por SSH al Backend"
  value       = "ssh -i ~/.ssh/diplo_mod2_key ${var.admin_username}@${azurerm_public_ip.backend_pip.ip_address}"
}

output "backend_api_url" {
  description = "URL directa de la API NestJS"
  value       = "http://${azurerm_public_ip.backend_pip.ip_address}:3000/api"
}

output "frontend_public_ip" {
  description = "Dirección IP pública del servidor Frontend en Azure"
  value       = azurerm_public_ip.frontend_pip.ip_address
}

output "frontend_url" {
  description = "URL pública de la aplicación web (Frontend)"
  value       = "http://${azurerm_public_ip.frontend_pip.ip_address}"
}

output "frontend_ssh_command" {
  description = "Comando para conectarse por SSH al Frontend"
  value       = "ssh -i ~/.ssh/diplo_mod2_key ${var.admin_username}@${azurerm_public_ip.frontend_pip.ip_address}"
}
