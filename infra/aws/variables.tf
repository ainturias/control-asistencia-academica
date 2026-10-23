variable "aws_region" {
  description = "Región de AWS donde se desplegarán los recursos"
  type        = string
  default     = "us-east-2"
}

variable "instance_type" {
  description = "Tipo de instancia EC2 para los servidores"
  type        = string
  default     = "t3.micro"
}

variable "ssh_public_key_path" {
  description = "Ruta de la llave pública SSH para acceder a las instancias"
  type        = string
  default     = "~/.ssh/diplo_mod2_key.pub"
}

variable "repo_url" {
  description = "URL del repositorio GitHub a clonar en los servidores"
  type        = string
  default     = "https://github.com/ainturias/control-asistencia-academica.git"
}
