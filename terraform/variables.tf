variable "aws_region" {
  description = "The AWS region to deploy resources in (e.g., us-east-1)"
  type        = string
}

variable "key_name" {
  description = "Name of the AWS key pair used to access EC2 instances"
  type        = string
}

variable "db_instance_identifier" {
  description = "Identifier of the existing PostgreSQL RDS instance"
  type        = string
}

variable "db_username_ssm_path" {
  description = "SSM Parameter Store path for the DB username"
  type        = string
}

variable "db_password_ssm_path" {
  description = "SSM Parameter Store path for the DB password"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID to launch the EC2 instance in"
  type        = string
}

variable "public_subnet_id" {
  description = "Subnet ID to launch the EC2 instance in"
  type        = string
}

variable "security_group_id" {
  description = "Security Group ID to associate with the EC2 instance"
  type        = string
}
