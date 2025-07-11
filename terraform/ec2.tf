# Lookup for stable Amazon Linux 2 AMI (HVM, EBS-backed, x86_64)
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

# Generate EC2 user data with DB credentials injected
data "template_file" "user_data" {
  template = file("${path.module}/setup-ec2.sh")

  vars = {
    db_host     = data.aws_db_instance.existing_rds.address
    db_user     = data.aws_ssm_parameter.db_username.value
    db_password = data.aws_ssm_parameter.db_password.value
  }
}

# IAM role to allow EC2 to access SSM parameters
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

# Attach AmazonSSM policies
resource "aws_iam_role_policy_attachment" "ssm_policy" {
  count      = var.create_iam_role && var.create_ec2 ? 1 : 0
  role       = aws_iam_role.ec2_ssm_role[0].name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMReadOnlyAccess"
}

resource "aws_iam_role_policy_attachment" "ssm_core" {
  count      = var.create_iam_role && var.create_ec2 ? 1 : 0
  role       = aws_iam_role.ec2_ssm_role[0].name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

# Instance profile to bind role to EC2
resource "aws_iam_instance_profile" "ec2_ssm_profile" {
  count = var.create_iam_profile && var.create_ec2 ? 1 : 0
  name  = "shiptivitas-ec2-ssm-profile"
  role  = var.create_iam_role ? aws_iam_role.ec2_ssm_role[0].name : "shiptivitas-ec2-ssm-role"
}

# EC2 Instance to run backend API
resource "aws_instance" "shiptivitas_api" {
  count = var.create_ec2 ? 1 : 0

  ami                         = data.aws_ami.amazon_linux.id
  instance_type               = "t2.micro"
  key_name                    = var.key_name
  subnet_id                   = trimspace(var.public_subnet_id)
  vpc_security_group_ids      = [trimspace(var.security_group_id)]
  iam_instance_profile        = var.create_iam_profile ? aws_iam_instance_profile.ec2_ssm_profile[0].name : "shiptivitas-ec2-ssm-profile"
  associate_public_ip_address = true
  user_data                   = data.template_file.user_data.rendered

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
