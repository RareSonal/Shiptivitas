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

resource "aws_instance" "shiptivitas_api" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t2.micro"
  key_name      = var.key_name
  user_data     = data.template_file.user_data.rendered

  tags = {
    Name = "Shiptivitas-API"
  }
}
