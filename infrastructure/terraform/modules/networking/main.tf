# Networking Module - VPC, Subnets, and VPC Connector

# VPC Network
resource "google_compute_network" "vpc_network" {
  name                    = "${var.name_prefix}-vpc"
  auto_create_subnetworks = false
  routing_mode           = "REGIONAL"
  
  description = "VPC network for ${var.environment} environment"
  
  # Enable flow logs for security monitoring
  delete_default_routes_on_create = false
  
  labels = var.common_labels
}

# Public subnet for external resources (NAT gateway, load balancer)
resource "google_compute_subnetwork" "public_subnet" {
  name          = "${var.name_prefix}-public-subnet"
  ip_cidr_range = var.public_subnet_cidr
  region        = var.region
  network       = google_compute_network.vpc_network.id
  
  description = "Public subnet for external resources"
  
  # Enable flow logs
  log_config {
    aggregation_interval = "INTERVAL_10_MIN"
    flow_sampling        = 0.5
    metadata             = "INCLUDE_ALL_METADATA"
  }
}

# Private subnet for Cloud Run services and database
resource "google_compute_subnetwork" "private_subnet" {
  name          = "${var.name_prefix}-private-subnet"
  ip_cidr_range = var.private_subnet_cidr
  region        = var.region
  network       = google_compute_network.vpc_network.id
  
  description = "Private subnet for Cloud Run and database"
  
  # Enable private Google access for Cloud Run
  private_ip_google_access = true
  
  # Enable flow logs
  log_config {
    aggregation_interval = "INTERVAL_10_MIN"
    flow_sampling        = 0.5
    metadata             = "INCLUDE_ALL_METADATA"
  }
  
  # Secondary IP ranges for services if needed
  secondary_ip_range {
    range_name    = "services-range"
    ip_cidr_range = "10.0.10.0/24"
  }
  
  secondary_ip_range {
    range_name    = "pods-range"
    ip_cidr_range = "10.0.20.0/24"
  }
}

# Cloud Router for NAT Gateway
resource "google_compute_router" "router" {
  name    = "${var.name_prefix}-router"
  region  = var.region
  network = google_compute_network.vpc_network.id
  
  description = "Router for NAT gateway"
  
  bgp {
    asn = 64514
  }
}

# NAT Gateway for outbound internet access from private subnet
resource "google_compute_router_nat" "nat_gateway" {
  name   = "${var.name_prefix}-nat-gateway"
  router = google_compute_router.router.name
  region = var.region
  
  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"
  
  log_config {
    enable = true
    filter = "ERRORS_ONLY"
  }
  
  # Configure minimum ports per VM instance
  min_ports_per_vm = 64
}

# VPC Connector for Cloud Run to VPC connectivity
resource "google_vpc_access_connector" "connector" {
  name          = "${var.name_prefix}-vpc-connector"
  ip_cidr_range = "10.0.3.0/28"  # Small range for connector
  network       = google_compute_network.vpc_network.name
  region        = var.region
  
  min_throughput = 200
  max_throughput = 1000
  
  # Machine type for connector instances
  machine_type = var.environment == "prod" ? "e2-standard-4" : "e2-micro"
}

# Firewall rule to allow health checks
resource "google_compute_firewall" "allow_health_checks" {
  name    = "${var.name_prefix}-allow-health-checks"
  network = google_compute_network.vpc_network.name
  
  description = "Allow health checks from Google Cloud Load Balancers"
  
  allow {
    protocol = "tcp"
    ports    = ["8080", "8000", "3000"]
  }
  
  source_ranges = [
    "130.211.0.0/22",  # Google health check ranges
    "35.191.0.0/16",
  ]
  
  target_tags = ["cloud-run", "health-check"]
}

# Firewall rule to allow internal communication
resource "google_compute_firewall" "allow_internal" {
  name    = "${var.name_prefix}-allow-internal"
  network = google_compute_network.vpc_network.name
  
  description = "Allow internal communication within VPC"
  
  allow {
    protocol = "tcp"
    ports    = ["0-65535"]
  }
  
  allow {
    protocol = "udp"
    ports    = ["0-65535"]
  }
  
  allow {
    protocol = "icmp"
  }
  
  source_ranges = [
    var.public_subnet_cidr,
    var.private_subnet_cidr,
    "10.0.3.0/28",  # VPC connector range
  ]
}

# Firewall rule for SSH access (if needed for debugging)
resource "google_compute_firewall" "allow_ssh" {
  count = var.environment == "dev" ? 1 : 0
  
  name    = "${var.name_prefix}-allow-ssh"
  network = google_compute_network.vpc_network.name
  
  description = "Allow SSH access for debugging (dev only)"
  
  allow {
    protocol = "tcp"
    ports    = ["22"]
  }
  
  source_ranges = var.allowed_ip_ranges
  target_tags   = ["ssh-access"]
}

# Firewall rule to allow HTTPS traffic from the internet
resource "google_compute_firewall" "allow_https" {
  name    = "${var.name_prefix}-allow-https"
  network = google_compute_network.vpc_network.name
  
  description = "Allow HTTPS traffic from the internet"
  
  allow {
    protocol = "tcp"
    ports    = ["443", "80"]
  }
  
  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["https-server"]
}

# Private Service Connection for managed services (AlloyDB, etc.)
resource "google_compute_global_address" "private_ip_alloc" {
  name          = "${var.name_prefix}-private-ip-alloc"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.vpc_network.id
  
  description = "Private IP allocation for managed services"
}

resource "google_service_networking_connection" "private_vpc_connection" {
  network                 = google_compute_network.vpc_network.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip_alloc.name]
  
  deletion_policy = "ABANDON"
}

# DNS zone for internal service discovery (optional)
resource "google_dns_managed_zone" "private_zone" {
  count = var.enable_private_dns ? 1 : 0
  
  name        = "${var.name_prefix}-private-zone"
  dns_name    = "${var.environment}.agentworks.internal."
  description = "Private DNS zone for internal services"
  
  visibility = "private"
  
  private_visibility_config {
    networks {
      network_url = google_compute_network.vpc_network.id
    }
  }
  
  labels = var.common_labels
}