terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# Obtener la AMI más reciente de Ubuntu 22.04 LTS
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

# Par de llaves SSH para las instancias EC2
resource "aws_key_pair" "diplo_key" {
  key_name   = "diplo-mod2-key"
  public_key = file(pathexpand(var.ssh_public_key_path))
}

# -----------------------------------------------------------------------------
# GRUPOS DE SEGURIDAD (SECURITY GROUPS)
# -----------------------------------------------------------------------------

# Grupo de seguridad para el servidor Backend (SSH + API NestJS en puerto 3000)
resource "aws_security_group" "backend_sg" {
  name        = "asistencia-backend-sg"
  description = "Permitir SSH (22) y NestJS (3000)"

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "API NestJS"
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "Acceso total a internet de salida"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name    = "asistencia-backend-sg"
    Project = "control-asistencia-academica"
  }
}

# Grupo de seguridad para el servidor Frontend (SSH + HTTP puerto 80)
resource "aws_security_group" "frontend_sg" {
  name        = "asistencia-frontend-sg"
  description = "Permitir SSH (22) y HTTP (80)"

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTP Nginx"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "Acceso total a internet de salida"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name    = "asistencia-frontend-sg"
    Project = "control-asistencia-academica"
  }
}

# -----------------------------------------------------------------------------
# SERVIDOR 1: BACKEND (NestJS + PostgreSQL)
# -----------------------------------------------------------------------------
resource "aws_instance" "backend_server" {
  ami                         = data.aws_ami.ubuntu.id
  instance_type               = var.instance_type
  key_name                    = aws_key_pair.diplo_key.key_name
  vpc_security_group_ids      = [aws_security_group.backend_sg.id]
  associate_public_ip_address = true

  root_block_device {
    volume_size = 20
    volume_type = "gp3"
  }

  user_data = <<-EOF
    #!/bin/bash
    set -e
    exec > /var/log/user_data.log 2>&1

    echo "=== Iniciando aprovisionamiento del Backend ==="

    # 1. Crear memoria Swap de 2GB (vital para builds en instancias de 1GB RAM)
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab

    # 2. Instalar Node.js 22, Git y PostgreSQL
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt-get update -y
    apt-get install -y nodejs git postgresql postgresql-contrib
    npm install -g pm2

    # 3. Iniciar y configurar PostgreSQL
    systemctl start postgresql
    systemctl enable postgresql
    sudo -u postgres psql -c "CREATE USER nestuser WITH PASSWORD 'nestpass123';"
    sudo -u postgres psql -c "CREATE DATABASE modulo2 OWNER nestuser;"
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE modulo2 TO nestuser;"

    # 4. Clonar repositorio
    mkdir -p /home/ubuntu/app
    git clone ${var.repo_url} /home/ubuntu/app
    cd /home/ubuntu/app/backend

    # 5. Configurar variables de entorno
    cat <<EOT > .env
    PORT=3000
    CORS_ORIGIN=*
    DB_HOST=localhost
    DB_PORT=5432
    DB_USER=nestuser
    DB_PASSWORD=nestpass123
    DB_NAME=modulo2
    JWT_SECRET=diplomado-devsecops-secreto-2026
    JWT_EXPIRES_IN=8h
    APP_TZ=America/La_Paz
    ADMIN_EMAIL=admin@gmail.com
    ADMIN_PASSWORD=123456789
    ADMIN_NAME=Administrador
    EOT

    # 6. Permisos, instalación y compilación
    chown -R ubuntu:ubuntu /home/ubuntu/app
    sudo -u ubuntu npm install
    sudo -u ubuntu npm run build

    # 7. Ejecutar aplicación con PM2
    sudo -u ubuntu pm2 start dist/main.js --name backend
    sudo -u ubuntu pm2 save
    env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u ubuntu --hp /home/ubuntu

    echo "=== Backend aprovisionado y ejecutándose exitosamente ==="
  EOF

  tags = {
    Name    = "asistencia-backend-server"
    Role    = "Backend-API-DB"
    Project = "control-asistencia-academica"
  }
}

# -----------------------------------------------------------------------------
# SERVIDOR 2: FRONTEND (React + Nginx Proxy Inverso)
# -----------------------------------------------------------------------------
resource "aws_instance" "frontend_server" {
  ami                         = data.aws_ami.ubuntu.id
  instance_type               = var.instance_type
  key_name                    = aws_key_pair.diplo_key.key_name
  vpc_security_group_ids      = [aws_security_group.frontend_sg.id]
  associate_public_ip_address = true
  depends_on                  = [aws_instance.backend_server]

  root_block_device {
    volume_size = 20
    volume_type = "gp3"
  }

  user_data = <<-EOF
    #!/bin/bash
    set -e
    exec > /var/log/user_data.log 2>&1

    echo "=== Iniciando aprovisionamiento del Frontend ==="

    # 1. Crear memoria Swap de 2GB
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab

    # 2. Instalar Node.js 22, Git y Nginx
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt-get update -y
    apt-get install -y nodejs git nginx

    # 3. Clonar repositorio y compilar aplicación React
    mkdir -p /home/ubuntu/app
    git clone ${var.repo_url} /home/ubuntu/app
    cd /home/ubuntu/app/frontend

    cat <<EOT > .env
    VITE_API_URL=/api
    EOT

    chown -R ubuntu:ubuntu /home/ubuntu/app
    sudo -u ubuntu npm install
    sudo -u ubuntu npm run build

    # 4. Copiar archivos construidos a la raíz de Nginx
    rm -rf /var/www/html/*
    cp -r dist/* /var/www/html/

    # 5. Configurar Nginx con Proxy Inverso hacia la IP del Backend
    cat <<EOT > /etc/nginx/sites-available/default
    server {
        listen 80 default_server;
        listen [::]:80 default_server;
        server_name _;
        root /var/www/html;
        index index.html;

        location / {
            try_files \$uri \$uri/ /index.html;
        }

        location /api/ {
            proxy_pass http://${aws_instance.backend_server.public_ip}:3000/api/;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
        }

        location /socket.io/ {
            proxy_pass http://${aws_instance.backend_server.public_ip}:3000/socket.io/;
            proxy_http_version 1.1;
            proxy_set_header Upgrade \$http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host \$host;
        }
    }
    EOT

    systemctl restart nginx
    echo "=== Frontend aprovisionado y Nginx activo exitosamente ==="
  EOF

  tags = {
    Name    = "asistencia-frontend-server"
    Role    = "Frontend-UI-Nginx"
    Project = "control-asistencia-academica"
  }
}
