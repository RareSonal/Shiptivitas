# Lookup for stable Amazon Linux 2 AMI
data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-2.0.*-x86_64-gp2"]
  }

  filter {
    name   = "architecture"
    values = ["x86_64"]
  }

  filter {
    name   = "root-device-type"
    values = ["ebs"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# AWS account identity (used for ARN interpolation)
data "aws_caller_identity" "for_ec2" {}

# IAM Role for EC2 to access SSM
resource "aws_iam_role" "ec2_ssm_role" {
  count = var.create_iam_role && var.create_ec2 ? 1 : 0

  name = "shiptivitas-ec2-ssm-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Effect = "Allow",
      Principal = {
        Service = "ec2.amazonaws.com"
      },
      Action = "sts:AssumeRole"
    }]
  })
}

# IAM Policy to allow reading SSM parameters
resource "aws_iam_policy" "ssm_read_policy" {
  count = var.create_iam_role && var.create_ec2 ? 1 : 0

  name        = "shiptivitas-ssm-parameter-read-policy"
  description = "Allows EC2 to read SSM parameters for DB credentials"

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Action = [
          "ssm:GetParameter",
          "ssm:GetParameters"
        ],
        Resource = [
          "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.for_ec2.account_id}:parameter${var.db_username_ssm_path}",
          "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.for_ec2.account_id}:parameter${var.db_password_ssm_path}"
        ]
      }
    ]
  })
}

# Attach custom policy to the role
resource "aws_iam_role_policy_attachment" "ssm_read_policy_attach" {
  count      = var.create_iam_role && var.create_ec2 ? 1 : 0
  role       = aws_iam_role.ec2_ssm_role[0].name
  policy_arn = aws_iam_policy.ssm_read_policy[0].arn
}

# Attach AmazonSSMManagedInstanceCore for session manager access
resource "aws_iam_role_policy_attachment" "ssm_managed_core" {
  count      = var.create_iam_role && var.create_ec2 ? 1 : 0
  role       = aws_iam_role.ec2_ssm_role[0].name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

# EC2 Instance Profile
resource "aws_iam_instance_profile" "ec2_ssm_profile" {
  count = var.create_iam_profile && var.create_ec2 ? 1 : 0
  name  = "shiptivitas-ec2-ssm-profile"
  role  = aws_iam_role.ec2_ssm_role[0].name
}

# Replace template_file data source with templatefile() function
locals {
  ec2_user_data = templatefile("${path.module}/setup-ec2.sh", {
    db_host               = data.aws_db_instance.existing_rds.address
    db_username_ssm_path  = var.db_username_ssm_path
    db_password_ssm_path  = var.db_password_ssm_path
  })
}

# EC2 Instance
resource "aws_instance" "shiptivitas_api" {
  count = var.create_ec2 ? 1 : 0

  ami                         = data.aws_ami.amazon_linux.id
  instance_type               = "t2.micro"
  key_name                    = var.key_name
  subnet_id                   = trimspace(var.public_subnet_id)
  vpc_security_group_ids      = [trimspace(var.security_group_id)]
  iam_instance_profile        = aws_iam_instance_profile.ec2_ssm_profile[0].name
  associate_public_ip_address = true
  user_data                   = local.ec2_user_data

  lifecycle {
    create_before_destroy = true
    ignore_changes = [
      ami,
      user_data
    ]
  }

  tags = {
    Name = "Shiptivitas-API"
  }
}
