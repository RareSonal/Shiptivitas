data "aws_db_instance" "existing_rds" {
  db_instance_identifier = trimspace(var.db_instance_identifier)
}

data "aws_ssm_parameter" "db_username" {
  name            = trimspace(var.db_username_ssm_path)
  with_decryption = true
}

data "aws_ssm_parameter" "db_password" {
  name            = trimspace(var.db_password_ssm_path)
  with_decryption = true
}

resource "aws_security_group_rule" "allow_ec2_to_rds" {
  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  security_group_id        = var.rds_security_group_id
  source_security_group_id = var.ec2_security_group_id
  description              = "Allow EC2 instances to access RDS PostgreSQL"
}
