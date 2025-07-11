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

variable "create_s3_bucket" {
  type    = bool
  default = true
}

variable "create_iam_role" {
  type    = bool
  default = true
}

variable "create_iam_profile" {
  type    = bool
  default = true
}

variable "create_oac" {
  type    = bool
  default = true
}

variable "existing_oac_id" {
  type    = string
  default = ""
}

variable "create_cdn" {
  type    = bool
  default = true
}

variable "use_existing_cdn" {
  description = "Whether to use an existing CloudFront distribution"
  type        = bool
  default     = false
}

variable "cloudfront_distribution_id" {
  description = "ID of the existing CloudFront distribution"
  type        = string
  default     = ""
}

variable "cloudfront_oac_id" {
  description = "ID of the existing CloudFront OAC"
  type        = string
  default     = ""
}

variable "create_ec2" {
  description = "Whether to create the EC2 instance"
  type        = bool
  default     = true
}

variable "create_github_actions_role" {
  type    = bool
  default = true
}

variable "create_cloudfront_tag_read_policy" {
  type    = bool
  default = false  # Set to false by default to avoid recreating existing policy
  description = "Whether to create the GitHubActions-CloudFrontTagRead IAM policy"
}
