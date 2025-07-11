data "aws_cloudfront_distribution" "existing" {
  count = var.use_existing_cdn ? 1 : 0
  id    = var.cloudfront_distribution_id
}

data "aws_cloudfront_origin_access_control" "existing_oac" {
  count = var.use_existing_cdn ? 1 : 0
  id    = var.cloudfront_oac_id
}

resource "aws_cloudfront_origin_access_control" "oac" {
  count                             = var.use_existing_cdn ? 0 : 1
  name                              = "shiptivitas-oac"
  description                       = "OAC for secure access to S3"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "cdn" {
  count               = var.use_existing_cdn ? 0 : 1
  enabled             = true
  default_root_object = "index.html"

  origin {
    domain_name = var.create_s3_bucket ? aws_s3_bucket.shiptivitas_frontend[0].bucket_regional_domain_name : "shiptivitas-frontend-bucket.s3.amazonaws.com"
    origin_id   = "S3Origin"

    origin_access_control_id = var.use_existing_cdn ? data.aws_cloudfront_origin_access_control.existing_oac[0].id : aws_cloudfront_origin_access_control.oac[0].id
  }

  default_cache_behavior {
    target_origin_id       = "S3Origin"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    cache_policy_id        = "658327ea-f89d-4fab-a63d-7e88639e58f6"
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
