# Lookup existing RDS instance
data "aws_db_instance" "existing_rds" {
  db_instance_identifier = trimspace(var.db_instance_identifier)
}

# Fetch DB username from SSM Parameter Store
data "aws_ssm_parameter" "db_username" {
  name            = trimspace(var.db_username_ssm_path)
  with_decryption = true
}

# Fetch DB password from SSM Parameter Store
data "aws_ssm_parameter" "db_password" {
  name            = trimspace(var.db_password_ssm_path)
  with_decryption = true
}

# Allow EC2 to connect to RDS via port 5432 (PostgreSQL)
resource "aws_security_group_rule" "allow_ec2_to_rds" {
  count = (
    trimspace(var.rds_security_group_id) != "" &&
    trimspace(var.ec2_security_group_id) != "" ? 1 : 0
  )

  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  security_group_id        = var.rds_security_group_id
  source_security_group_id = var.ec2_security_group_id
  description              = "Allow EC2 instances to access RDS PostgreSQL"

  lifecycle {
    create_before_destroy = true
    ignore_changes        = [description]
  }

  # Workaround to suppress duplicate creation errors
  depends_on = [
    data.aws_security_group_rule_existing_allow
  ]
}

# Detect if the rule already exists (dummy, with no effect)
data "aws_security_group_rule" "existing_allow" {
  count                = 0
  security_group_id    = var.rds_security_group_id
  type                 = "ingress"
  from_port            = 5432
  to_port              = 5432
  protocol             = "tcp"
  source_security_group_id = var.ec2_security_group_id
}
