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
