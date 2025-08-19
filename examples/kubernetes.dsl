// Kubernetes deployment architecture
layout direction=LR ranksep=70 nodesep=45

style user icon=👤 color=#4CAF50 shape=rectangle
style lb icon=⚖️ color=#FF9800 shape=pyramid
style pod icon=📦 color=#2196F3 shape=rectangle
style service icon=🔗 color=#9C27B0 shape=pyramid
style pv icon=💾 color=#607D8B shape=cylinder
style config icon=⚙️ color=#795548 shape=rectangle

component external_users {
  label "External Users"
  type user
}

component ingress {
  label "Ingress Controller"
  type lb
}

container frontend_ns {
  label "Frontend Namespace"
  
  component frontend_service {
    label "Frontend Service"
    type service
  }
  
  component frontend_pod1 {
    label "Frontend Pod 1"
    type pod
  }
  
  component frontend_pod2 {
    label "Frontend Pod 2"
    type pod
  }
}

container backend_ns {
  label "Backend Namespace"
  
  component api_service {
    label "API Service"
    type service
  }
  
  component api_pod1 {
    label "API Pod 1"
    type pod
  }
  
  component api_pod2 {
    label "API Pod 2"
    type pod
  }
  
  component worker_pod {
    label "Worker Pod"
    type pod
  }
}

container data_ns {
  label "Data Namespace"
  
  component db_service {
    label "Database Service"
    type service
  }
  
  component db_pod {
    label "PostgreSQL Pod"
    type pod
  }
  
  component redis_service {
    label "Redis Service"
    type service
  }
  
  component redis_pod {
    label "Redis Pod"
    type pod
  }
}

container storage {
  label "Persistent Storage"
  
  component db_pv {
    label "Database PV"
    type pv
  }
  
  component redis_pv {
    label "Redis PV"
    type pv
  }
}

component config_map {
  label "ConfigMap"
  type config
}

component secrets {
  label "Secrets"
  type config
}

relation external_users -> ingress : "HTTPS"
relation ingress -> frontend_service : "Route"
relation frontend_service -> frontend_pod1 : "Load Balance"
relation frontend_service -> frontend_pod2 : "Load Balance"
relation frontend_pod1 -> api_service : "API Calls"
relation frontend_pod2 -> api_service : "API Calls"
relation api_service -> api_pod1 : "Load Balance"
relation api_service -> api_pod2 : "Load Balance"
relation api_pod1 -> db_service : "Database"
relation api_pod2 -> db_service : "Database"
relation api_pod1 -> redis_service : "Cache"
relation api_pod2 -> redis_service : "Cache"
relation worker_pod -> redis_service : "Queue"
relation db_service -> db_pod : "Route"
relation redis_service -> redis_pod : "Route"
relation db_pod -> db_pv : "Mount"
relation redis_pod -> redis_pv : "Mount"
relation api_pod1 -> config_map : "Config"
relation api_pod2 -> config_map : "Config"
relation api_pod1 -> secrets : "Credentials"
relation api_pod2 -> secrets : "Credentials"

annotation ingress {
  tooltip "Routes external traffic to services"
  link "https://kubernetes.io/docs/concepts/services-networking/ingress/"
}

annotation frontend_service {
  tooltip "ClusterIP service for frontend pods"
}

annotation api_service {
  tooltip "Internal API service with load balancing"
}

annotation db_pv {
  tooltip "Persistent volume for database storage"
}

annotation config_map {
  tooltip "Application configuration data"
  link "https://kubernetes.io/docs/concepts/configuration/configmap/"
}

annotation secrets {
  tooltip "Sensitive data like passwords and API keys"
  link "https://kubernetes.io/docs/concepts/configuration/secret/"
}
