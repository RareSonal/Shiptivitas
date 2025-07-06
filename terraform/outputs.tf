output "s3_bucket" {
  value = aws_s3_bucket.shiptivitas_frontend.bucket
}

output "cloudfront_url" {
  value = aws_cloudfront_distribution.cdn.domain_name
}

output "backend_ec2_public_ip" {
  value = aws_instance.shiptivitas_api.public_ip
}
