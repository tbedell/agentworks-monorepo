# Database Module - PostgreSQL (Cloud SQL) and AlloyDB

# Enable required APIs
resource "google_project_service" "sql_admin_api" {
  service            = "sqladmin.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "alloydb_api" {
  count = var.enable_alloy_db ? 1 : 0
  
  service            = "alloydb.googleapis.com"
  disable_on_destroy = false
}

# Random instance suffix to avoid naming conflicts
resource "random_id" "db_name_suffix" {
  byte_length = 4
}

# Cloud SQL PostgreSQL Instance (for dev/staging)
resource "google_sql_database_instance" "postgres" {
  count = var.enable_alloy_db ? 0 : 1
  
  name             = "${var.name_prefix}-postgres-${random_id.db_name_suffix.hex}"
  database_version = "POSTGRES_15"
  region           = var.region
  
  deletion_protection = var.environment == "prod" ? true : false
  
  settings {
    tier              = var.database_tier
    availability_type = var.environment == "prod" ? "REGIONAL" : "ZONAL"
    disk_size         = var.database_disk_size
    disk_type         = "PD_SSD"
    disk_autoresize   = true
    
    # Backup configuration
    backup_configuration {
      enabled                        = true
      start_time                     = "03:00"  # 3 AM UTC
      location                       = var.region
      point_in_time_recovery_enabled = true
      backup_retention_settings {
        retained_backups = var.backup_retention_days
        retention_unit   = "COUNT"
      }
      transaction_log_retention_days = 7
    }
    
    # Maintenance window
    maintenance_window {
      day  = 7  # Sunday
      hour = 4  # 4 AM UTC
    }
    
    # IP configuration for private access
    ip_configuration {
      ipv4_enabled                                  = false
      private_network                              = var.vpc_network_id
      enable_private_path_for_google_cloud_services = true
      
      authorized_networks {
        name  = "internal-vpc"
        value = var.vpc_cidr
      }
    }
    
    # Database flags for optimization
    database_flags {
      name  = "shared_preload_libraries"
      value = "pg_stat_statements"
    }
    
    database_flags {
      name  = "log_statement"
      value = "all"
    }
    
    database_flags {
      name  = "log_min_duration_statement"
      value = "1000"  # Log queries taking more than 1 second
    }
    
    database_flags {
      name  = "max_connections"
      value = "200"
    }
    
    # Performance insights
    insights_config {
      enabled                = true
      query_insights_enabled = true
      query_string_length    = 1024
      record_application_tags = true
      record_client_address  = true
    }
  }
  
  depends_on = [
    google_project_service.sql_admin_api,
    var.private_vpc_connection
  ]
  
  # Prevent accidental deletion
  lifecycle {
    prevent_destroy = false  # Set to true in production
  }
}

# Database user
resource "google_sql_user" "database_user" {
  count = var.enable_alloy_db ? 0 : 1
  
  name     = "agentworks"
  instance = google_sql_database_instance.postgres[0].name
  password = var.database_password
  
  # For PostgreSQL, we need to specify the type
  type = "BUILT_IN"
}

# Primary application database
resource "google_sql_database" "agentworks_db" {
  count = var.enable_alloy_db ? 0 : 1
  
  name     = "agentworks"
  instance = google_sql_database_instance.postgres[0].name
  
  # Use UTF8 encoding
  charset   = "UTF8"
  collation = "en_US.UTF8"
}

# AlloyDB Cluster (for production)
resource "google_alloydb_cluster" "primary" {
  count = var.enable_alloy_db ? 1 : 0
  
  cluster_id   = "${var.name_prefix}-alloydb"
  location     = var.region
  network      = var.vpc_network_id
  
  # Initial user configuration
  initial_user {
    user     = "agentworks"
    password = var.database_password
  }
  
  # Backup configuration
  automated_backup_policy {
    location                = var.region
    backup_window           = "03:00-04:00"  # 1-hour window starting at 3 AM
    enabled                = true
    weekly_schedule         = "SUNDAY"
    
    # Retention policy
    quantity_based_retention {
      count = var.backup_retention_days
    }
    
    # Encryption
    encryption_config {
      kms_key_name = var.kms_key_name
    }
  }
  
  # Continuous backup
  continuous_backup_config {
    enabled = true
    recovery_window_days = 7
    
    # Encryption
    encryption_config {
      kms_key_name = var.kms_key_name
    }
  }
  
  # Labels
  labels = var.common_labels
  
  depends_on = [google_project_service.alloydb_api]
}

# AlloyDB Primary Instance
resource "google_alloydb_instance" "primary" {
  count = var.enable_alloy_db ? 1 : 0
  
  cluster       = google_alloydb_cluster.primary[0].name
  instance_id   = "primary"
  instance_type = "PRIMARY"
  
  machine_config {
    cpu_count = var.alloydb_cpu_count
  }
  
  # Database flags
  database_flags = {
    "shared_preload_libraries"        = "pg_stat_statements"
    "log_statement"                   = "all"
    "log_min_duration_statement"      = "1000"
    "max_connections"                 = "200"
    "effective_cache_size"            = "2GB"
    "maintenance_work_mem"            = "256MB"
  }
  
  # Labels
  labels = var.common_labels
}

# AlloyDB Read Replica (for production)
resource "google_alloydb_instance" "read_replica" {
  count = var.enable_alloy_db && var.enable_read_replica ? 1 : 0
  
  cluster       = google_alloydb_cluster.primary[0].name
  instance_id   = "read-replica"
  instance_type = "READ_POOL"
  
  machine_config {
    cpu_count = max(2, var.alloydb_cpu_count / 2)  # Half the CPU of primary
  }
  
  read_pool_config {
    node_count = 1
  }
  
  # Labels
  labels = var.common_labels
}

# Connection pool for AlloyDB (using PgBouncer)
resource "google_alloydb_instance" "pgbouncer" {
  count = var.enable_alloy_db && var.enable_connection_pool ? 1 : 0
  
  cluster       = google_alloydb_cluster.primary[0].name
  instance_id   = "pgbouncer"
  instance_type = "READ_POOL"
  
  machine_config {
    cpu_count = 1
  }
  
  read_pool_config {
    node_count = 1
  }
  
  # PgBouncer specific configuration
  database_flags = {
    "pgbouncer.pool_mode"        = "transaction"
    "pgbouncer.max_client_conn"  = "1000"
    "pgbouncer.default_pool_size" = "25"
  }
  
  # Labels
  labels = merge(var.common_labels, {
    type = "connection_pool"
  })
}

# Enable Firestore for document storage
resource "google_project_service" "firestore_api" {
  count = var.enable_firestore ? 1 : 0
  
  service            = "firestore.googleapis.com"
  disable_on_destroy = false
}

resource "google_firestore_database" "database" {
  count = var.enable_firestore ? 1 : 0
  
  project     = var.project_id
  name        = "(default)"
  location_id = var.firestore_location
  type        = "FIRESTORE_NATIVE"
  
  # Concurrency control
  concurrency_mode = "OPTIMISTIC"
  
  # Point-in-time recovery
  point_in_time_recovery_enablement = var.environment == "prod" ? "POINT_IN_TIME_RECOVERY_ENABLED" : "POINT_IN_TIME_RECOVERY_DISABLED"
  
  depends_on = [google_project_service.firestore_api]
}

# Cloud SQL Proxy configuration for local development
resource "google_compute_instance" "sql_proxy" {
  count = var.enable_sql_proxy && !var.enable_alloy_db ? 1 : 0
  
  name         = "${var.name_prefix}-sql-proxy"
  machine_type = "e2-micro"
  zone         = var.zone
  
  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-11"
      size  = 10
    }
  }
  
  network_interface {
    subnetwork = var.private_subnet_id
  }
  
  metadata_startup_script = templatefile("${path.module}/scripts/sql-proxy-startup.sh", {
    connection_name = var.enable_alloy_db ? "" : google_sql_database_instance.postgres[0].connection_name
    database_name   = var.database_name
  })
  
  service_account {
    email  = var.cloud_run_service_account_email
    scopes = ["cloud-platform"]
  }
  
  tags = ["sql-proxy", "internal"]
  
  labels = merge(var.common_labels, {
    type = "database_proxy"
  })
}

# Database monitoring and alerting
resource "google_monitoring_alert_policy" "database_cpu" {
  display_name = "${var.name_prefix} Database CPU Usage"
  combiner     = "OR"
  
  conditions {
    display_name = "Database CPU above 80%"
    
    condition_threshold {
      filter          = var.enable_alloy_db ? 
        "resource.type=\"alloydb_database\"" : 
        "resource.type=\"cloudsql_database\""
      duration        = "300s"
      comparison      = "GREATER_THAN"
      threshold_value = 0.8
      
      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_MEAN"
      }
    }
  }
  
  notification_channels = var.notification_channels
  
  alert_strategy {
    auto_close = "1800s"  # 30 minutes
  }
}

resource "google_monitoring_alert_policy" "database_memory" {
  display_name = "${var.name_prefix} Database Memory Usage"
  combiner     = "OR"
  
  conditions {
    display_name = "Database Memory above 85%"
    
    condition_threshold {
      filter          = var.enable_alloy_db ? 
        "resource.type=\"alloydb_database\"" : 
        "resource.type=\"cloudsql_database\""
      duration        = "300s"
      comparison      = "GREATER_THAN"
      threshold_value = 0.85
      
      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_MEAN"
      }
    }
  }
  
  notification_channels = var.notification_channels
  
  alert_strategy {
    auto_close = "1800s"
  }
}

resource "google_monitoring_alert_policy" "database_connections" {
  count = var.enable_alloy_db ? 0 : 1
  
  display_name = "${var.name_prefix} Database Connection Usage"
  combiner     = "OR"
  
  conditions {
    display_name = "Database connections above 80% of limit"
    
    condition_threshold {
      filter          = "resource.type=\"cloudsql_database\""
      duration        = "300s"
      comparison      = "GREATER_THAN"
      threshold_value = 160  # 80% of 200 max connections
      
      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_MEAN"
      }
    }
  }
  
  notification_channels = var.notification_channels
  
  alert_strategy {
    auto_close = "1800s"
  }
}