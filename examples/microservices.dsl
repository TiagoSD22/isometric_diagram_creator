// Simple microservices architecture example
layout direction=LR ranksep=80 nodesep=50

style user icon=👤 color=#4CAF50 shape=rectangle
style api icon=⚙️ color=#2196F3 shape=pyramid
style db icon=🗄️ color=#9C27B0 shape=cylinder
style queue icon=📬 color=#FF9800 shape=cylinder
style cache icon=⚡ color=#F44336 shape=rectangle

component frontend {
  label "React Frontend"
  type user
}

container backend {
  label "Microservices"
  
  component auth_api {
    label "Auth Service"
    type api
  }
  
  component user_api {
    label "User Service"
    type api
  }
  
  component order_api {
    label "Order Service"
    type api
  }
}

container data {
  label "Data Layer"
  
  component user_db {
    label "User DB"
    type db
  }
  
  component order_db {
    label "Order DB"
    type db
  }
  
  component redis {
    label "Redis Cache"
    type cache
  }
  
  component queue {
    label "Message Queue"
    type queue
  }
}

relation frontend -> auth_api : "Login"
relation frontend -> user_api : "Profile"
relation frontend -> order_api : "Orders"
relation auth_api -> user_db : "Validate"
relation user_api -> user_db : "CRUD"
relation user_api -> redis : "Cache"
relation order_api -> order_db : "Store"
relation order_api -> queue : "Events"

annotation auth_api {
  tooltip "JWT-based authentication service"
  link "https://auth.example.com/docs"
}

annotation redis {
  tooltip "Session and data caching layer"
}

annotation queue {
  tooltip "Asynchronous event processing"
}
