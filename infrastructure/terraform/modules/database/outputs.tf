# Database Module Outputs

# Cloud SQL outputs
output "connection_name" {
  description = "Database connection name"
  value       = var.enable_alloy_db ? google_alloydb_cluster.primary[0].name : google_sql_database_instance.postgres[0].connection_name
}

output "database_name" {
  description = "Database name"
  value       = var.database_name
}

output "private_ip_address" {
  description = "Database private IP address"
  value       = var.enable_alloy_db ? google_alloydb_cluster.primary[0].network : google_sql_database_instance.postgres[0].private_ip_address
  sensitive   = true
}

output "port" {
  description = "Database port"
  value       = 5432
}

output "instance_name" {
  description = "Database instance name"
  value       = var.enable_alloy_db ? google_alloydb_instance.primary[0].name : google_sql_database_instance.postgres[0].name
}

# AlloyDB specific outputs
output "alloydb_cluster_id" {
  description = "AlloyDB cluster ID"
  value       = var.enable_alloy_db ? google_alloydb_cluster.primary[0].cluster_id : null
}

output "alloydb_cluster_name" {
  description = "AlloyDB cluster name"
  value       = var.enable_alloy_db ? google_alloydb_cluster.primary[0].name : null
}

output "alloydb_instance_id" {
  description = "AlloyDB primary instance ID"
  value       = var.enable_alloy_db ? google_alloydb_instance.primary[0].instance_id : null
}

output "alloydb_instance_name" {
  description = "AlloyDB primary instance name"
  value       = var.enable_alloy_db ? google_alloydb_instance.primary[0].name : null
}

output "alloydb_read_replica_name" {
  description = "AlloyDB read replica instance name"
  value       = var.enable_alloy_db && var.enable_read_replica ? google_alloydb_instance.read_replica[0].name : null
}

output "alloydb_connection_pool_name" {
  description = "AlloyDB connection pool instance name"
  value       = var.enable_alloy_db && var.enable_connection_pool ? google_alloydb_instance.pgbouncer[0].name : null
}

# Cloud SQL specific outputs
output "cloud_sql_instance_name" {
  description = "Cloud SQL instance name"
  value       = var.enable_alloy_db ? null : google_sql_database_instance.postgres[0].name
}

output "cloud_sql_connection_name" {
  description = "Cloud SQL connection name"
  value       = var.enable_alloy_db ? null : google_sql_database_instance.postgres[0].connection_name
}

output "cloud_sql_self_link" {
  description = "Cloud SQL instance self link"
  value       = var.enable_alloy_db ? null : google_sql_database_instance.postgres[0].self_link
}

# Firestore outputs
output "firestore_database_name" {
  description = "Firestore database name"
  value       = var.enable_firestore ? google_firestore_database.database[0].name : null
}

output "firestore_location" {
  description = "Firestore location"
  value       = var.enable_firestore ? google_firestore_database.database[0].location_id : null
}

# SQL Proxy outputs
output "sql_proxy_instance_name" {
  description = "SQL Proxy instance name"
  value       = var.enable_sql_proxy && !var.enable_alloy_db ? google_compute_instance.sql_proxy[0].name : null
}

output "sql_proxy_internal_ip" {
  description = "SQL Proxy internal IP address"
  value       = var.enable_sql_proxy && !var.enable_alloy_db ? google_compute_instance.sql_proxy[0].network_interface[0].network_ip : null
}

# Connection strings and URLs
output "database_url" {
  description = "Database connection URL for applications"
  value       = var.enable_alloy_db ? 
    "postgres://agentworks:${var.database_password}@${google_alloydb_cluster.primary[0].network}:5432/${var.database_name}" :
    "postgres://agentworks:${var.database_password}@${google_sql_database_instance.postgres[0].private_ip_address}:5432/${var.database_name}"
  sensitive   = true
}

output "database_url_with_ssl" {
  description = "Database connection URL with SSL parameters"
  value       = var.enable_alloy_db ? 
    "postgres://agentworks:${var.database_password}@${google_alloydb_cluster.primary[0].network}:5432/${var.database_name}?sslmode=require" :
    "postgres://agentworks:${var.database_password}@${google_sql_database_instance.postgres[0].private_ip_address}:5432/${var.database_name}?sslmode=require"
  sensitive   = true
}

# Monitoring outputs
output "monitoring_alert_policies" {
  description = "Database monitoring alert policy names"
  value = [
    google_monitoring_alert_policy.database_cpu.name,
    google_monitoring_alert_policy.database_memory.name,
    try(google_monitoring_alert_policy.database_connections[0].name, null)
  ]
}

# Configuration for applications
output "database_config" {
  description = "Database configuration for applications"
  value = {
    host                = var.enable_alloy_db ? google_alloydb_cluster.primary[0].network : google_sql_database_instance.postgres[0].private_ip_address
    port                = 5432
    database            = var.database_name
    username            = "agentworks"
    connection_name     = var.enable_alloy_db ? google_alloydb_cluster.primary[0].name : google_sql_database_instance.postgres[0].connection_name
    ssl_mode            = "require"
    max_connections     = 200
    pool_size           = 10
    pool_timeout        = 30
    statement_timeout   = 30000
    idle_timeout        = 600000
    is_alloydb         = var.enable_alloy_db
    has_read_replica   = var.enable_alloy_db && var.enable_read_replica
    read_replica_host  = var.enable_alloy_db && var.enable_read_replica ? google_alloydb_instance.read_replica[0].name : null
  }
  sensitive = true
}