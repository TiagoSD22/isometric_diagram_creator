// Cloud Infrastructure Architecture
layout direction=LR ranksep=120 nodesep=80

style user icon=👥 color=#4CAF50
style cdn icon=🌐 color=#2196F3
style lb icon=⚖️ color=#FF9800
style server icon=🖥️ color=#9C27B0
style database icon=🗄️ color=#607D8B
style storage icon=💾 color=#795548

component users {
  label "Users"
  type actor
}

component cdn {
  label "CloudFront CDN"
  type cdn
}

container aws_cloud {
  label "AWS Cloud Infrastructure"
  
  component load_balancer {
    label "Application Load Balancer"
    type lb
  }
  
  container web_tier {
    label "Web Tier (Public Subnet)"
    
    component web_server_1 {
      label "Web Server 1"
      type server
    }
    
    component web_server_2 {
      label "Web Server 2"
      type server
    }
  }
  
  container app_tier {
    label "Application Tier (Private Subnet)"
    
    component app_server_1 {
      label "App Server 1"
      type server
    }
    
    component app_server_2 {
      label "App Server 2"
      type server
    }
  }
  
  container data_tier {
    label "Data Tier (Private Subnet)"
    
    component rds_primary {
      label "RDS Primary"
      type database
    }
    
    component rds_standby {
      label "RDS Standby"
      type database
    }
  }
  
  component s3_storage {
    label "S3 Storage"
    type storage
  }
}

relation users -> cdn : "requests"
relation cdn -> load_balancer : "cache miss"
relation load_balancer -> web_server_1 : "distributes"
relation load_balancer -> web_server_2 : "distributes"
relation web_server_1 -> app_server_1 : "forwards"
relation web_server_2 -> app_server_2 : "forwards"
relation app_server_1 -> rds_primary : "queries"
relation app_server_2 -> rds_primary : "queries"
relation rds_primary -> rds_standby : "replication"
relation app_server_1 -> s3_storage : "stores files"
relation app_server_2 -> s3_storage : "stores files"

annotation aws_cloud {
  tooltip "Multi-tier architecture deployed on AWS with high availability"
}

annotation web_tier {
  tooltip "Auto-scaling group with public internet access"
}

annotation app_tier {
  tooltip "Auto-scaling group with no direct internet access"
}

annotation data_tier {
  tooltip "RDS Multi-AZ deployment for high availability"
}
