// Enterprise architecture example
layout direction=TB ranksep=80 nodesep=60

// Define visual styles for different component types
style user icon=👤 color=#4CAF50 shape=rectangle
style web icon=🌐 color=#2196F3 shape=rectangle
style api icon=⚙️ color=#FF9800 shape=pyramid
style db icon=🗄️ color=#9C27B0 shape=cylinder
style queue icon=📬 color=#F44336 shape=cylinder
style cache icon=⚡ color=#607D8B shape=rectangle
style ad icon=🏛️ color=#795548 shape=pyramid
style firewall icon=🛡️ color=#E91E63 shape=pyramid

// External users
component mobile_users {
  label "Mobile Users"
  type user
}

component web_users {
  label "Web Users"
  type user
}

// DMZ (Demilitarized Zone)
container dmz {
  label "DMZ Network"
  
  component external_firewall {
    label "External Firewall"
    type firewall
  }
  
  component load_balancer {
    label "Load Balancer"
    type api
  }
  
  component web_server1 {
    label "Web Server 1"
    type web
  }
  
  component web_server2 {
    label "Web Server 2"
    type web
  }
}

// Internal network
container internal_network {
  label "Internal Corporate Network"
  
  component internal_firewall {
    label "Internal Firewall"
    type firewall
  }
  
  container application_tier {
    label "Application Tier"
    
    component auth_service {
      label "Authentication Service"
      type api
    }
    
    component business_api {
      label "Business Logic API"
      type api
    }
    
    component reporting_api {
      label "Reporting API"
      type api
    }
  }
  
  container integration_tier {
    label "Integration Tier"
    
    component message_queue {
      label "Message Queue"
      type queue
    }
    
    component redis_cache {
      label "Redis Cache"
      type cache
    }
    
    component active_directory {
      label "Active Directory"
      type ad
    }
  }
}

// Data tier
container data_tier {
  label "Data Tier"
  
  component customer_db {
    label "Customer Database"
    type db
  }
  
  component transaction_db {
    label "Transaction Database"
    type db
  }
  
  component analytics_db {
    label "Analytics Database"
    type db
  }
  
  component backup_storage {
    label "Backup Storage"
    type db
  }
}

// Define relationships
relation mobile_users -> external_firewall : "HTTPS"
relation web_users -> external_firewall : "HTTPS"
relation external_firewall -> load_balancer : "Filtered Traffic"
relation load_balancer -> web_server1 : "Load Balanced"
relation load_balancer -> web_server2 : "Load Balanced"
relation web_server1 -> internal_firewall : "API Requests"
relation web_server2 -> internal_firewall : "API Requests"
relation internal_firewall -> auth_service : "Authentication"
relation internal_firewall -> business_api : "Business Logic"
relation internal_firewall -> reporting_api : "Reports"
relation auth_service -> active_directory : "LDAP"
relation auth_service -> redis_cache : "Session Cache"
relation business_api -> customer_db : "Customer Data"
relation business_api -> transaction_db : "Transactions"
relation business_api -> message_queue : "Async Processing"
relation reporting_api -> analytics_db : "Analytics Queries"
relation message_queue -> transaction_db : "Data Processing"
relation customer_db -> backup_storage : "Nightly Backup"
relation transaction_db -> backup_storage : "Nightly Backup"
relation analytics_db -> backup_storage : "Weekly Backup"

// Add annotations for documentation
annotation external_firewall {
  tooltip "Protects against external threats and DDoS attacks"
  link "https://docs.company.com/security/firewall"
}

annotation load_balancer {
  tooltip "Distributes incoming requests across web servers"
  link "https://docs.company.com/infrastructure/load-balancing"
}

annotation auth_service {
  tooltip "Handles user authentication and authorization using JWT tokens"
  link "https://docs.company.com/auth/service"
}

annotation active_directory {
  tooltip "Corporate identity and access management system"
  link "https://docs.company.com/identity/active-directory"
}

annotation redis_cache {
  tooltip "In-memory caching for session data and frequently accessed information"
  link "https://docs.company.com/caching/redis"
}

annotation message_queue {
  tooltip "Asynchronous message processing for decoupled services"
  link "https://docs.company.com/messaging/queue"
}

annotation customer_db {
  tooltip "Primary customer data storage with encryption at rest"
  link "https://docs.company.com/data/customer-database"
}

annotation backup_storage {
  tooltip "Automated backup system with 7-year retention policy"
  link "https://docs.company.com/data/backup-strategy"
}
