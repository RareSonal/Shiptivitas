# 🚀 Shiptivitas

A modern cloud-native project that bootstraps, deploys, and manages infrastructure and applications across Azure and AWS using Terraform and GitHub Actions CI/CD. 
Shiptivitas features a full-stack web app with a PostgreSQL database, Dockerized backend, S3-hosted frontend, and automated infrastructure provisioning.

# 📌 Project Overview

Shiptivitas automates everything from infrastructure provisioning to application deployment using infrastructure-as-code principles. It leverages:

- **Terraform** to provision and manage cloud resources
- **GitHub Actions** to drive CI/CD pipelines
- **Docker** for containerized backend services
- **AWS** for infrastructure deployment
- **Azure** for remote Terraform state storage

# 🏗️ Architecture Diagram

                                                                ┌─────────────────────┐
                                                                │   GitHub Actions    │
                                                                └────────┬────────────┘
                                                                         │
                                                  ┌──────────────────────┼────────────────────────┐
                                                  │                      │                        │
                                                  ▼                      ▼                        ▼
                                          ┌─────────────────┐   ┌─────────────────────┐  ┌────────────────────┐
                                          │ Azure Backend   │   │  AWS Infrastructure │  │  GitHub Container  │
                                          │(Terraform state)│   │ (Terraform-managed) │  │ Registry (GHCR)    │
                                          └─────────────────┘   └────────┬────────────┘  └────────────────────┘
                                                                         │
                                                                         ▼
                                                                ┌─────────────────────┐    ┌─────────────────┐
                                                                │  EC2 + Docker Host  │───→│  Postgres RDS   │
                                                                │   Backend (NodeJS)  │←───│ Database (SQL)  │
                                                                └────────┬────────────┘    └─────────────────┘
                                                                         │
                                                                         ▼
                                                                 ┌───────────────────┐
                                                                 │  S3 + CloudFront  │
                                                                 │  Frontend (React) │
                                                                 └───────────────────┘



# 🛠️ Setup Instructions

⚙️ Local Development

1. Clone the repo
   bash
   git clone https://github.com/RareSonal/Shiptivitas.git
   cd Shiptivitas

2. Start Backend Locally (Optional)
   cd backend
   docker build -t shiptivitas-backend .
   docker run -p 3001:3001 shiptivitas-backend

3. Run Frontend
   cd frontend
   npm install
   REACT_APP_API_BASE_URL=http://localhost:3001 npm start

# ☁️ Cloud Bootstrap (Azure)
Bootstrap the Terraform backend using Azure

   - Trigger the Bootstrap Terraform Backend (Azure) GitHub Action manually.
     
   - This sets up remote backend storage for state management.

# ☁️ Cloud Deployment (AWS)
Deploy everything by triggering the Deploy Shiptivitas Infrastructure workflow:

   - Terraform provisions:
     S3 bucket for frontend
     EC2 instance for backend + PostgreSQL
     IAM roles, security groups, CloudFront

   - Frontend is built and synced to S3

   - Backend Docker image is pushed to GHCR

   - EC2 launches containers via SSH

   - PostgreSQL is initialized, seeded, and verified

# 🧱 Terraform Usage
The project uses modular Terraform split into:

  - bootstrap/: Bootstraps Azure Storage Account for Terraform state

  - terraform/: Provisions full AWS infrastructure

# Commands:

- Bootstrap (in ./bootstrap)

  1. terraform init
  2. terraform apply

- Deployment (in ./terraform)

  1. terraform init
  2. terraform plan
  3. terraform apply

NOTE: Terraform state is stored remotely in Azure, configured in backend.tf.

# 🤖 GitHub Actions CI/CD
1. Bootstrap Backend
  - Workflow: .github/workflows/bootstrap-backend.yml
  - Purpose: Sets up Azure backend for Terraform state
  - Trigger: Manual (workflow_dispatch)

2. Deploy Infrastructure & App
  - Workflow: .github/workflows/deploy.yml
  - Purpose: Full infra + app provisioning and deployment
  - Trigger: Manual (workflow_dispatch)

Features:

- Conditional creation of AWS resources

- Frontend React build & S3 upload

- Backend Docker image build & push to GHCR

- EC2 SSH setup for DB and backend

- PostgreSQL seeding + verification

# 🧰 Tech Stack
| Layer             | Technology                                                                     |
|-------------------|--------------------------------------------------------------------------------|
| IaC               | Terraform                                                                      |
| CI/CD             | GitHub Actions                                                                 |
| Frontend          | React (Vite), hosted on AWS S3 + served via CloudFront                         |
| Backend           | Node.js (Express), Dockerized and deployed on EC2                              |
| Database          | PostgreSQL (via Docker container on EC2)                                       |
| Container Registry| GitHub Container Registry (GHCR)                                               |
| Secrets           | GitHub Secrets, AWS SSM Parameter Store                                        |
| Authentication    | OIDC (Azure & AWS GitHub Actions federated identity)                           |
| Cloud Providers   | AWS (EC2, S3, CloudFront, IAM, VPC), Azure (Terraform state backend via Blob)  |

# 📬 Contributions
Pull requests and suggestions are welcome! If you'd like to add support for automatic PR-based deploy previews, CI testing, or multi-region deployment — open an issue or PR.





