output "s3_bucket" {
  description = "Name of the S3 bucket (if created)"
  value       = var.create_s3_bucket && length(aws_s3_bucket.shiptivitas_frontend) > 0 ? aws_s3_bucket.shiptivitas_frontend[0].bucket : null
}

output "cloudfront_url" {
  description = "CloudFront distribution URL (existing or new)"
  value       = var.use_existing_cdn ? try(data.aws_cloudfront_distribution.existing[0].domain_name, null) : try(aws_cloudfront_distribution.cdn[0].domain_name, null)
}

output "backend_ec2_public_ip" {
  description = "Public IP of EC2 instance"
  value       = try(aws_instance.shiptivitas_api[0].public_ip, null)
}

output "rds_endpoint" {
  description = "RDS endpoint"
  value       = data.aws_db_instance.existing_rds.address
}
