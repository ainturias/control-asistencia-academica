terraform {
  required_version = ">= 1.5.0"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

provider "azurerm" {
  features {}
  skip_provider_registration = true
}

# -----------------------------------------------------------------------------
# GRUPO DE RECURSOS Y RED VIRTUAL (VNET)
# -----------------------------------------------------------------------------

resource "azurerm_resource_group" "rg" {
  name     = "rg-asistencia-diplomado-m2"
  location = var.azure_region

  tags = {
    Project   = "control-asistencia-academica"
    Diplomado = "DevSecOps-Modulo2"
  }
}

resource "azurerm_virtual_network" "vnet" {
  name                = "vnet-asistencia"
  address_space       = ["10.0.0.0/16"]
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
}

resource "azurerm_subnet" "subnet" {
  name                 = "snet-asistencia"
  resource_group_name  = azurerm_resource_group.rg.name
  virtual_network_name = azurerm_virtual_network.vnet.name
  address_prefixes     = ["10.0.1.0/24"]
}

# -----------------------------------------------------------------------------
# IPs PÚBLICAS
# -----------------------------------------------------------------------------

resource "azurerm_public_ip" "backend_pip" {
  name                = "pip-asistencia-backend"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  allocation_method   = "Static"
  sku                 = "Standard"
}

resource "azurerm_public_ip" "frontend_pip" {
  name                = "pip-asistencia-frontend"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  allocation_method   = "Static"
  sku                 = "Standard"
}

# -----------------------------------------------------------------------------
# NETWORK SECURITY GROUPS (NSG)
# -----------------------------------------------------------------------------

# NSG Backend: SSH (22) y NestJS API (3000)
resource "azurerm_network_security_group" "backend_nsg" {
  name                = "nsg-asistencia-backend"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name

  security_rule {
    name                       = "Allow-SSH"
    priority                   = 1001
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "22"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "Allow-NestJS-3000"
    priority                   = 1002
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "3000"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }
}

# NSG Frontend: SSH (22) y HTTP (80)
resource "azurerm_network_security_group" "frontend_nsg" {
  name                = "nsg-asistencia-frontend"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name

  security_rule {
    name                       = "Allow-SSH"
    priority                   = 1001
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "22"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "Allow-HTTP-80"
    priority                   = 1002
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "80"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }
}

# -----------------------------------------------------------------------------
# INTERFACES DE RED (NIC) Y ASOCIACIONES NSG
# -----------------------------------------------------------------------------

resource "azurerm_network_interface" "backend_nic" {
  name                = "nic-asistencia-backend"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name

  ip_configuration {
    name                          = "ipconfig-backend"
    subnet_id                     = azurerm_subnet.subnet.id
    private_ip_address_allocation = "Dynamic"
    public_ip_address_id          = azurerm_public_ip.backend_pip.id
  }
}

resource "azurerm_network_interface_security_group_association" "backend_nic_assoc" {
  network_interface_id      = azurerm_network_interface.backend_nic.id
  network_security_group_id = azurerm_network_security_group.backend_nsg.id
}

resource "azurerm_network_interface" "frontend_nic" {
  name                = "nic-asistencia-frontend"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name

  ip_configuration {
    name                          = "ipconfig-frontend"
    subnet_id                     = azurerm_subnet.subnet.id
    private_ip_address_allocation = "Dynamic"
    public_ip_address_id          = azurerm_public_ip.frontend_pip.id
  }
}

resource "azurerm_network_interface_security_group_association" "frontend_nic_assoc" {
  network_interface_id      = azurerm_network_interface.frontend_nic.id
  network_security_group_id = azurerm_network_security_group.frontend_nsg.id
}

# -----------------------------------------------------------------------------
# MÁQUINA VIRTUAL 1: BACKEND (NestJS + PostgreSQL)
# -----------------------------------------------------------------------------

resource "azurerm_linux_virtual_machine" "backend_vm" {
  name                  = "vm-asistencia-backend"
  location              = azurerm_resource_group.rg.location
  resource_group_name   = azurerm_resource_group.rg.name
  size                  = var.vm_size
  admin_username        = var.admin_username
  network_interface_ids = [azurerm_network_interface.backend_nic.id]

  admin_ssh_key {
    username   = var.admin_username
    public_key = file(pathexpand(var.ssh_public_key_path))
  }

  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "Standard_LRS"
    disk_size_gb         = 30
  }

  source_image_reference {
    publisher = "Canonical"
    offer     = "0001-com-ubuntu-server-jammy"
    sku       = "22_04-lts-gen2"
    version   = "latest"
  }

  custom_data = base64encode(<<-EOF
    #!/bin/bash
    set -e
    exec > /var/log/user_data.log 2>&1

    echo "=== Iniciando aprovisionamiento del Backend en Azure ==="

    # 1. Configurar SWAP de 2GB (vital para builds estables en máquinas B1s)
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

    # 3. Configurar PostgreSQL
    systemctl start postgresql
    systemctl enable postgresql
    sudo -u postgres psql -c "CREATE USER nestuser WITH PASSWORD 'nestpass123';"
    sudo -u postgres psql -c "CREATE DATABASE modulo2 OWNER nestuser;"
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE modulo2 TO nestuser;"

    # 4. Clonar repositorio
    mkdir -p /home/${var.admin_username}/app
    git clone ${var.repo_url} /home/${var.admin_username}/app
    cd /home/${var.admin_username}/app/backend

    # 5. Configurar archivo .env
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

    # 6. Compilar y arrancar con PM2
    chown -R ${var.admin_username}:${var.admin_username} /home/${var.admin_username}/app
    sudo -u ${var.admin_username} npm install
    sudo -u ${var.admin_username} npm run build
    sudo -u ${var.admin_username} pm2 start dist/main.js --name backend
    sudo -u ${var.admin_username} pm2 save
    env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u ${var.admin_username} --hp /home/${var.admin_username}

    echo "=== Backend en Azure aprovisionado y ejecutándose exitosamente ==="
  EOF
  )

  tags = {
    Role    = "Backend-API-DB"
    Project = "control-asistencia-academica"
  }
}

# -----------------------------------------------------------------------------
# MÁQUINA VIRTUAL 2: FRONTEND (React + Nginx Proxy Inverso)
# -----------------------------------------------------------------------------

resource "azurerm_linux_virtual_machine" "frontend_vm" {
  name                  = "vm-asistencia-frontend"
  location              = azurerm_resource_group.rg.location
  resource_group_name   = azurerm_resource_group.rg.name
  size                  = var.vm_size
  admin_username        = var.admin_username
  network_interface_ids = [azurerm_network_interface.frontend_nic.id]
  depends_on            = [azurerm_linux_virtual_machine.backend_vm]

  admin_ssh_key {
    username   = var.admin_username
    public_key = file(pathexpand(var.ssh_public_key_path))
  }

  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "Standard_LRS"
    disk_size_gb         = 30
  }

  source_image_reference {
    publisher = "Canonical"
    offer     = "0001-com-ubuntu-server-jammy"
    sku       = "22_04-lts-gen2"
    version   = "latest"
  }

  custom_data = base64encode(<<-EOF
    #!/bin/bash
    set -e
    exec > /var/log/user_data.log 2>&1

    echo "=== Iniciando aprovisionamiento del Frontend en Azure ==="

    # 1. Configurar SWAP de 2GB
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab

    # 2. Instalar Node.js 22, Git y Nginx
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt-get update -y
    apt-get install -y nodejs git nginx

    # 3. Clonar repositorio y compilar React
    mkdir -p /home/${var.admin_username}/app
    git clone ${var.repo_url} /home/${var.admin_username}/app
    cd /home/${var.admin_username}/app/frontend

    cat <<EOT > .env
    VITE_API_URL=/api
    EOT

    chown -R ${var.admin_username}:${var.admin_username} /home/${var.admin_username}/app
    sudo -u ${var.admin_username} npm install
    sudo -u ${var.admin_username} npm run build

    # 4. Copiar archivos construidos a Nginx
    rm -rf /var/www/html/*
    cp -r dist/* /var/www/html/

    # 5. Configurar Nginx con Proxy Inverso hacia el Backend de Azure
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
            proxy_pass http://${azurerm_public_ip.backend_pip.ip_address}:3000/api/;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
        }

        location /socket.io/ {
            proxy_pass http://${azurerm_public_ip.backend_pip.ip_address}:3000/socket.io/;
            proxy_http_version 1.1;
            proxy_set_header Upgrade \$http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host \$host;
        }
    }
    EOT

    systemctl restart nginx
    echo "=== Frontend en Azure aprovisionado y Nginx activo exitosamente ==="
  EOF
  )

  tags = {
    Role    = "Frontend-UI-Nginx"
    Project = "control-asistencia-academica"
  }
}
