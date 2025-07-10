output "s3_bucket" {
  description = "Name of the S3 bucket (if created)"
  value       = try(aws_s3_bucket.shiptivitas_frontend[0].bucket, "")
}

output "cloudfront_url" {
  description = "Domain name of the CloudFront distribution"
  value       = try(aws_cloudfront_distribution.cdn.domain_name, "")
}

output "backend_ec2_public_ip" {
  description = "Public IP of the backend EC2 instance"
  value       = try(aws_instance.shiptivitas_api.public_ip, "")
}
