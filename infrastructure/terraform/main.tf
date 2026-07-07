# DocumentIulia.ro - Hetzner Cloud Infrastructure
# Terraform configuration for production deployment

terraform {
  required_version = ">= 1.0.0"

  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.45"
    }
  }

  # Store state remotely (recommended for team collaboration)
  # backend "s3" {
  #   bucket = "documentiulia-terraform-state"
  #   key    = "production/terraform.tfstate"
  #   region = "eu-central-1"
  # }
}

# =============================================================================
# VARIABLES
# =============================================================================

variable "hcloud_token" {
  description = "Hetzner Cloud API Token"
  type        = string
  sensitive   = true
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "location" {
  description = "Hetzner datacenter location"
  type        = string
  default     = "nbg1" # Nuremberg, Germany (closest to Romania)
}

variable "ssh_public_key" {
  description = "SSH public key for server access"
  type        = string
}

variable "domain" {
  description = "Primary domain name"
  type        = string
  default     = "documentiulia.ro"
}

# =============================================================================
# PROVIDER
# =============================================================================

provider "hcloud" {
  token = var.hcloud_token
}

# =============================================================================
# SSH KEY
# =============================================================================

resource "hcloud_ssh_key" "default" {
  name       = "documentiulia-${var.environment}"
  public_key = var.ssh_public_key
}

# =============================================================================
# NETWORK
# =============================================================================

resource "hcloud_network" "main" {
  name     = "documentiulia-${var.environment}"
  ip_range = "10.0.0.0/16"
}

resource "hcloud_network_subnet" "main" {
  network_id   = hcloud_network.main.id
  type         = "cloud"
  network_zone = "eu-central"
  ip_range     = "10.0.1.0/24"
}

# =============================================================================
# FIREWALL
# =============================================================================

resource "hcloud_firewall" "web" {
  name = "documentiulia-web-${var.environment}"

  # SSH
  rule {
    direction = "in"
    protocol  = "tcp"
    port      = "22"
    source_ips = [
      "0.0.0.0/0",
      "::/0"
    ]
  }

  # HTTP
  rule {
    direction = "in"
    protocol  = "tcp"
    port      = "80"
    source_ips = [
      "0.0.0.0/0",
      "::/0"
    ]
  }

  # HTTPS
  rule {
    direction = "in"
    protocol  = "tcp"
    port      = "443"
    source_ips = [
      "0.0.0.0/0",
      "::/0"
    ]
  }

  # ICMP (ping)
  rule {
    direction = "in"
    protocol  = "icmp"
    source_ips = [
      "0.0.0.0/0",
      "::/0"
    ]
  }
}

resource "hcloud_firewall" "internal" {
  name = "documentiulia-internal-${var.environment}"

  # PostgreSQL (internal only)
  rule {
    direction = "in"
    protocol  = "tcp"
    port      = "5432"
    source_ips = [
      "10.0.0.0/16"
    ]
  }

  # Redis (internal only)
  rule {
    direction = "in"
    protocol  = "tcp"
    port      = "6379"
    source_ips = [
      "10.0.0.0/16"
    ]
  }
}

# =============================================================================
# APPLICATION SERVER (CX31 - 4 vCPU, 8GB RAM)
# =============================================================================

resource "hcloud_server" "app" {
  name        = "documentiulia-app-${var.environment}"
  server_type = "cx31"
  image       = "ubuntu-22.04"
  location    = var.location
  ssh_keys    = [hcloud_ssh_key.default.id]

  firewall_ids = [
    hcloud_firewall.web.id,
    hcloud_firewall.internal.id
  ]

  network {
    network_id = hcloud_network.main.id
    ip         = "10.0.1.10"
  }

  user_data = <<-EOF
    #cloud-config
    package_update: true
    package_upgrade: true

    packages:
      - docker.io
      - docker-compose
      - nginx
      - certbot
      - python3-certbot-nginx
      - fail2ban
      - ufw

    runcmd:
      # Enable Docker
      - systemctl enable docker
      - systemctl start docker
      - usermod -aG docker root

      # Configure firewall
      - ufw default deny incoming
      - ufw default allow outgoing
      - ufw allow ssh
      - ufw allow http
      - ufw allow https
      - ufw --force enable

      # Enable fail2ban
      - systemctl enable fail2ban
      - systemctl start fail2ban

      # Create app directory
      - mkdir -p /opt/documentiulia
      - chown -R root:root /opt/documentiulia

      # Setup swap (for memory management)
      - fallocate -l 4G /swapfile
      - chmod 600 /swapfile
      - mkswap /swapfile
      - swapon /swapfile
      - echo '/swapfile none swap sw 0 0' >> /etc/fstab
  EOF

  labels = {
    environment = var.environment
    service     = "app"
    managed_by  = "terraform"
  }

  depends_on = [hcloud_network_subnet.main]
}

# =============================================================================
# DATABASE SERVER (CX21 - 2 vCPU, 4GB RAM)
# =============================================================================

resource "hcloud_server" "db" {
  name        = "documentiulia-db-${var.environment}"
  server_type = "cx21"
  image       = "ubuntu-22.04"
  location    = var.location
  ssh_keys    = [hcloud_ssh_key.default.id]

  firewall_ids = [
    hcloud_firewall.internal.id
  ]

  network {
    network_id = hcloud_network.main.id
    ip         = "10.0.1.20"
  }

  user_data = <<-EOF
    #cloud-config
    package_update: true
    package_upgrade: true

    packages:
      - postgresql-16
      - redis-server
      - fail2ban

    runcmd:
      # Configure PostgreSQL
      - systemctl enable postgresql
      - systemctl start postgresql

      # Configure Redis
      - systemctl enable redis-server
      - systemctl start redis-server

      # Enable fail2ban
      - systemctl enable fail2ban
      - systemctl start fail2ban

      # Setup swap
      - fallocate -l 2G /swapfile
      - chmod 600 /swapfile
      - mkswap /swapfile
      - swapon /swapfile
      - echo '/swapfile none swap sw 0 0' >> /etc/fstab
  EOF

  labels = {
    environment = var.environment
    service     = "database"
    managed_by  = "terraform"
  }

  depends_on = [hcloud_network_subnet.main]
}

# =============================================================================
# VOLUMES
# =============================================================================

resource "hcloud_volume" "db_data" {
  name      = "documentiulia-db-data-${var.environment}"
  size      = 50
  location  = var.location
  format    = "ext4"
  automount = true

  labels = {
    environment = var.environment
    service     = "database"
  }
}

resource "hcloud_volume_attachment" "db_data" {
  volume_id = hcloud_volume.db_data.id
  server_id = hcloud_server.db.id
  automount = true
}

# =============================================================================
# FLOATING IP (for high availability)
# =============================================================================

resource "hcloud_floating_ip" "main" {
  type          = "ipv4"
  home_location = var.location
  name          = "documentiulia-${var.environment}"

  labels = {
    environment = var.environment
    managed_by  = "terraform"
  }
}

resource "hcloud_floating_ip_assignment" "main" {
  floating_ip_id = hcloud_floating_ip.main.id
  server_id      = hcloud_server.app.id
}

# =============================================================================
# OUTPUTS
# =============================================================================

output "app_server_ip" {
  description = "Public IP of the application server"
  value       = hcloud_server.app.ipv4_address
}

output "app_server_private_ip" {
  description = "Private IP of the application server"
  value       = "10.0.1.10"
}

output "db_server_private_ip" {
  description = "Private IP of the database server"
  value       = "10.0.1.20"
}

output "floating_ip" {
  description = "Floating IP for DNS"
  value       = hcloud_floating_ip.main.ip_address
}

output "network_id" {
  description = "Network ID"
  value       = hcloud_network.main.id
}

output "ssh_command" {
  description = "SSH command to connect to app server"
  value       = "ssh root@${hcloud_server.app.ipv4_address}"
}

output "monthly_cost_estimate" {
  description = "Estimated monthly cost"
  value       = "CX31 (€11.90) + CX21 (€6.90) + Volume 50GB (€2.50) + Floating IP (€4.00) = ~€25.30/month"
}
