// Simple Web Application Architecture
layout direction=LR ranksep=80 nodesep=40

style user icon=👤 color=#4CAF50
style frontend icon=🌐 color=#2196F3
style backend icon=⚙️ color=#FF9800
style database icon=🗄️ color=#9C27B0

component user {
  label "User"
  type actor
}

component frontend {
  label "React Frontend"
  type web
}

component backend {
  label "Node.js API"
  type service
}

component database {
  label "PostgreSQL"
  type database
}

relation user -> frontend : "browses"
relation frontend -> backend : "API calls"
relation backend -> database : "queries"

annotation user {
  tooltip "End users of the web application"
}

annotation frontend {
  tooltip "Single Page Application built with React"
}

annotation backend {
  tooltip "RESTful API server handling business logic"
}

annotation database {
  tooltip "Primary data store for application data"
}
