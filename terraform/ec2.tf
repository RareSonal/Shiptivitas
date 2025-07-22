# Get the latest Amazon Linux 2 AMI
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

# Optional: AWS account info
data "aws_caller_identity" "ec2_identity" {}

# IAM role to allow EC2 to use SSM and optionally access secrets
resource "aws_iam_role" "ec2_ssm_role" {
  count = var.create_ec2 && var.create_iam_role ? 1 : 0

  name = "shiptivitas-ec2-ssm-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = { Service = "ec2.amazonaws.com" }
        Action    = "sts:AssumeRole"
      }
    ]
  })
}

# Policy to read SSM parameters (optional, still included for flexibility)
resource "aws_iam_policy" "ssm_read" {
  count = var.create_ec2 && var.create_iam_role ? 1 : 0

  name        = "shiptivitas-ssm-read-policy"
  description = "Allows EC2 to read DB credentials from SSM"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = ["ssm:GetParameter", "ssm:GetParameters"]
        Resource = [
          "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter${var.db_username_ssm_path}",
          "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter${var.db_password_ssm_path}"
        ]
      }
    ]
  })
}

# Attach the policies
resource "aws_iam_role_policy_attachment" "attach_ssm_read" {
  count      = var.create_ec2 && var.create_iam_role ? 1 : 0
  role       = aws_iam_role.ec2_ssm_role[0].name
  policy_arn = aws_iam_policy.ssm_read[0].arn
}

resource "aws_iam_role_policy_attachment" "attach_ssm_core" {
  count      = var.create_ec2 && var.create_iam_role ? 1 : 0
  role       = aws_iam_role.ec2_ssm_role[0].name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

# EC2 instance profile
resource "aws_iam_instance_profile" "ec2_profile" {
  count = var.create_ec2 && var.create_iam_profile ? 1 : 0
  name  = "shiptivitas-ec2-ssm-profile"
  role  = aws_iam_role.ec2_ssm_role[0].name
}

# Read and encode static user_data script
data "template_file" "ec2_user_data" {
  count    = var.create_ec2 ? 1 : 0
  template = file("${path.module}/setup-ec2.sh")
}

# Launch EC2 instance
resource "aws_instance" "shiptivitas_api" {
  count                           = var.create_ec2 ? 1 : 0
  ami                             = data.aws_ami.amazon_linux.id
  instance_type                   = "t2.micro"
  key_name                        = var.key_name
  subnet_id                       = trimspace(var.public_subnet_id)
  vpc_security_group_ids          = [trimspace(var.security_group_id)]
  associate_public_ip_address     = true
  user_data                       = base64encode(data.template_file.ec2_user_data[0].rendered)

  iam_instance_profile = var.create_iam_profile ? aws_iam_instance_profile.ec2_profile[0].name : null

  lifecycle {
    create_before_destroy = true
    ignore_changes        = [ami, user_data]
  }

  tags = {
    Name = "Shiptivitas-API"
  }

  depends_on = [
    aws_iam_instance_profile.ec2_profile
  ]
}
