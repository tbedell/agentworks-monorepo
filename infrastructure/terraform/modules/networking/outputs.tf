# Networking Module Outputs

output "vpc_network_id" {
  description = "VPC network ID"
  value       = google_compute_network.vpc_network.id
}

output "vpc_network_name" {
  description = "VPC network name"
  value       = google_compute_network.vpc_network.name
}

output "vpc_network_self_link" {
  description = "VPC network self link"
  value       = google_compute_network.vpc_network.self_link
}

output "public_subnet_id" {
  description = "Public subnet ID"
  value       = google_compute_subnetwork.public_subnet.id
}

output "public_subnet_name" {
  description = "Public subnet name"
  value       = google_compute_subnetwork.public_subnet.name
}

output "public_subnet_self_link" {
  description = "Public subnet self link"
  value       = google_compute_subnetwork.public_subnet.self_link
}

output "private_subnet_id" {
  description = "Private subnet ID"
  value       = google_compute_subnetwork.private_subnet.id
}

output "private_subnet_name" {
  description = "Private subnet name"
  value       = google_compute_subnetwork.private_subnet.name
}

output "private_subnet_self_link" {
  description = "Private subnet self link"
  value       = google_compute_subnetwork.private_subnet.self_link
}

output "vpc_connector_id" {
  description = "VPC connector ID"
  value       = google_vpc_access_connector.connector.id
}

output "vpc_connector_name" {
  description = "VPC connector name"
  value       = google_vpc_access_connector.connector.name
}

output "router_name" {
  description = "Cloud Router name"
  value       = google_compute_router.router.name
}

output "nat_gateway_name" {
  description = "NAT gateway name"
  value       = google_compute_router_nat.nat_gateway.name
}

output "private_vpc_connection" {
  description = "Private VPC connection for managed services"
  value       = google_service_networking_connection.private_vpc_connection.network
}

output "private_ip_allocation_name" {
  description = "Private IP allocation name for managed services"
  value       = google_compute_global_address.private_ip_alloc.name
}

output "dns_zone_name" {
  description = "Private DNS zone name"
  value       = var.enable_private_dns ? google_dns_managed_zone.private_zone[0].name : null
}

output "dns_zone_dns_name" {
  description = "Private DNS zone DNS name"
  value       = var.enable_private_dns ? google_dns_managed_zone.private_zone[0].dns_name : null
}