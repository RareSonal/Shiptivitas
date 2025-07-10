

resource "aws_cloudfront_origin_access_control" "oac" {
  count                             = var.create_s3_bucket ? 1 : 0
  name                              = "shiptivitas-oac"
  description                       = "OAC for secure access to S3"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "cdn" {
  enabled             = true
  default_root_object = "index.html"

  origin {
    domain_name = var.create_s3_bucket ? aws_s3_bucket.shiptivitas_frontend[0].bucket_regional_domain_name : "shiptivitas-frontend-bucket.s3.amazonaws.com"
    origin_id   = "S3Origin"

    origin_access_control_id = var.create_s3_bucket ? aws_cloudfront_origin_access_control.oac[0].id : var.existing_oac_id
  }

  default_cache_behavior {
    target_origin_id       = "S3Origin"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]

    cache_policy_id = "658327ea-f89d-4fab-a63d-7e88639e58f6" # AWS Managed-CachingOptimized
  }

  price_class = "PriceClass_100"

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  tags = {
    Name = "shiptivitas-cdn"
  }
}
