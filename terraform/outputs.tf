output "s3_bucket" {
  description = "Name of the S3 bucket (if created)"
  value       = var.create_s3_bucket ? aws_s3_bucket.shiptivitas_frontend[0].bucket : null
}

output "cloudfront_url" {
  description = "Domain name of the CloudFront distribution"
  value       = try(
    var.use_existing_cdn
      ? data.aws_cloudfront_distribution.existing[0].domain_name
      : aws_cloudfront_distribution.cdn[0].domain_name,
    null
  )
}

output "backend_ec2_public_ip" {
  description = "Public IP of the backend EC2 instance"
  value       = var.create_ec2 ? aws_instance.shiptivitas_api[0].public_ip : null
}

