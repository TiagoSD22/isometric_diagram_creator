// AWS cloud architecture example
layout direction=TB ranksep=60 nodesep=40

style user icon=👤 color=#4CAF50 shape=rectangle
style lb icon=⚖️ color=#FF9800 shape=pyramid
style server icon=🖥️ color=#2196F3 shape=rectangle
style db icon=🗄️ color=#9C27B0 shape=cylinder
style storage icon=💾 color=#607D8B shape=cylinder
style lambda icon=λ color=#FFD700 shape=pyramid

component users {
  label "End Users"
  type user
}

component cloudfront {
  label "CloudFront CDN"
  type lb
}

component alb {
  label "Application Load Balancer"
  type lb
}

container vpc {
  label "VPC - Production Environment"
  
  container public_subnet {
    label "Public Subnet"
    
    component nat {
      label "NAT Gateway"
      type server
    }
  }
  
  container private_subnet {
    label "Private Subnet"
    
    component web1 {
      label "Web Server 1"
      type server
    }
    
    component web2 {
      label "Web Server 2"
      type server
    }
    
    component api_lambda {
      label "API Lambda"
      type lambda
    }
  }
}

container rds {
  label "RDS Database Cluster"
  
  component primary_db {
    label "Primary Database"
    type db
  }
  
  component replica_db {
    label "Read Replica"
    type db
  }
}

component s3 {
  label "S3 Bucket"
  type storage
}

component dynamodb {
  label "DynamoDB"
  type db
}

relation users -> cloudfront : "HTTPS"
relation cloudfront -> alb : "Cache Miss"
relation alb -> web1 : "Load Balance"
relation alb -> web2 : "Load Balance"
relation web1 -> api_lambda : "API Calls"
relation web2 -> api_lambda : "API Calls"
relation api_lambda -> primary_db : "Write"
relation api_lambda -> replica_db : "Read"
relation api_lambda -> dynamodb : "Session Data"
relation web1 -> s3 : "Static Assets"
relation web2 -> s3 : "Static Assets"
relation cloudfront -> s3 : "Static Content"

annotation cloudfront {
  tooltip "Global content delivery network"
  link "https://aws.amazon.com/cloudfront/"
}

annotation alb {
  tooltip "Distributes incoming traffic across multiple targets"
  link "https://aws.amazon.com/elasticloadbalancing/"
}

annotation api_lambda {
  tooltip "Serverless compute for API endpoints"
  link "https://aws.amazon.com/lambda/"
}

annotation s3 {
  tooltip "Object storage for static assets"
  link "https://aws.amazon.com/s3/"
}

annotation dynamodb {
  tooltip "NoSQL database for session management"
  link "https://aws.amazon.com/dynamodb/"
}
