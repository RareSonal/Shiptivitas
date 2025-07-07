data "aws_ami" "amazon_linux" {
  owners      = ["amazon"]
  most_recent = true

  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-*-x86_64-gp2"]
  }
}

data "template_file" "user_data" {
  template = file("${path.module}/setup-ec2.sh")

  vars = {
    db_host     = data.aws_db_instance.existing_rds.address
    db_user     = data.aws_ssm_parameter.db_username.value
    db_password = data.aws_ssm_parameter.db_password.value
  }
}

# --- IAM Role for EC2 to access SSM ---
resource "aws_iam_role" "ec2_ssm_role" {
  name = "shiptivitas-ec2-ssm-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Principal = {
          Service = "ec2.amazonaws.com"
        },
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ssm_policy" {
  role       = aws_iam_role.ec2_ssm_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMReadOnlyAccess"
}

resource "aws_iam_role_policy_attachment" "ssm_core" {
  role       = aws_iam_role.ec2_ssm_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "ec2_ssm_profile" {
  name = "shiptivitas-ec2-ssm-profile"
  role = aws_iam_role.ec2_ssm_role.name
}

# --- EC2 Instance ---
resource "aws_instance" "shiptivitas_api" {
  ami                         = data.aws_ami.amazon_linux.id
  instance_type               = "t2.micro"
  key_name                    = var.key_name
  subnet_id                   = var.public_subnet_id
  vpc_security_group_ids      = [var.security_group_id]
  iam_instance_profile        = aws_iam_instance_profile.ec2_ssm_profile.name
  associate_public_ip_address = true
  user_data                   = data.template_file.user_data.rendered

  tags = {
    Name = "Shiptivitas-API"
  }
}
