data "aws_db_instance" "existing_rds" {
  db_instance_identifier = var.db_instance_identifier
}

data "aws_ssm_parameter" "db_username" {
  name            = var.db_username_ssm_path
  with_decryption = true
}

data "aws_ssm_parameter" "db_password" {
  name            = var.db_password_ssm_path
  with_decryption = true
}
