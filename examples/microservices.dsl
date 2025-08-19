// Microservices Architecture
layout direction=TB ranksep=100 nodesep=60

style user icon=👤 color=#4CAF50
style gateway icon=🚪 color=#2196F3
style service icon=⚙️ color=#FF9800
style database icon=🗄️ color=#9C27B0
style cache icon=⚡ color=#F44336
style queue icon=📨 color=#795548

component user {
  label "Mobile App"
  type client
}

component api_gateway {
  label "API Gateway"
  type gateway
}

container microservices {
  label "Microservices Cluster"
  
  container user_service {
    label "User Service"
    
    component user_api {
      label "User API"
      type service
    }
    
    component user_db {
      label "User DB"
      type database
    }
  }
  
  container order_service {
    label "Order Service"
    
    component order_api {
      label "Order API"
      type service
    }
    
    component order_db {
      label "Order DB"
      type database
    }
  }
  
  container notification_service {
    label "Notification Service"
    
    component notification_api {
      label "Notification API"
      type service
    }
    
    component message_queue {
      label "Message Queue"
      type queue
    }
  }
}

component redis_cache {
  label "Redis Cache"
  type cache
}

relation user -> api_gateway : "HTTP/HTTPS"
relation api_gateway -> user_api : "routes requests"
relation api_gateway -> order_api : "routes requests"
relation api_gateway -> notification_api : "routes requests"
relation user_api -> user_db : "queries"
relation order_api -> order_db : "queries"
relation notification_api -> message_queue : "publishes"
relation order_api -> redis_cache : "caches data"
relation user_api -> redis_cache : "caches sessions"

annotation microservices {
  tooltip "Containerized microservices running on Kubernetes"
}

annotation redis_cache {
  tooltip "Shared cache for session data and frequently accessed information"
}
