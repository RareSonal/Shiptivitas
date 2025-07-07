variable "aws_region" {
  description = "The AWS region to deploy resources in"
  type        = string
  default     = "us-east-1"
}

variable "key_name" {
  description = "Name of the AWS key pair used to access EC2 instances"
  type        = string
}

variable "db_instance_identifier" {
  description = "Identifier of the existing PostgreSQL RDS instance"
  type        = string
  default     = "stockwishlist-postgres"
}

variable "db_username_ssm_path" {
  description = "SSM Parameter Store path for DB username"
  type        = string
  default     = "/stockwishlist/db_username"
}

variable "db_password_ssm_path" {
  description = "SSM Parameter Store path for DB password"
  type        = string
  default     = "/stockwishlist/db_password"
}

variable "vpc_id" {
  description = "VPC ID to launch the EC2 instance in"
  type        = string
  default     = "vpc-0b6987d09fe5c1577"
}

variable "public_subnet_id" {
  description = "Subnet ID to launch the EC2 instance in"
  type        = string
  default     = "subnet-0d851f3b40055b56d" 
}

variable "security_group_id" {
  description = "Security Group ID to associate with the EC2 instance"
  type        = string
  default     = "sg-0965338ad1360b60a" 
}
