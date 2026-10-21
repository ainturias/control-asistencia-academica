variable "azure_region" {
  description = "Región de Azure donde se desplegarán los recursos"
  type        = string
  default     = "eastus"
}

variable "vm_size" {
  description = "Tamaño de las máquinas virtuales en Azure"
  type        = string
  default     = "Standard_D2as_v4"
}

variable "admin_username" {
  description = "Usuario administrador del sistema operativo Linux"
  type        = string
  default     = "ubuntu"
}

variable "ssh_public_key_path" {
  description = "Ruta de la llave pública SSH para acceder a las máquinas virtuales"
  type        = string
  default     = "~/.ssh/diplo_mod2_key.pub"
}

variable "repo_url" {
  description = "URL del repositorio GitHub a clonar en los servidores"
  type        = string
  default     = "https://github.com/ainturias/control-asistencia-academica.git"
}
