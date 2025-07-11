resource "aws_s3_bucket" "shiptivitas_frontend" {
  count         = var.create_s3_bucket ? 1 : 0
  bucket        = "shiptivitas-frontend-bucket"
  force_destroy = true
}

resource "aws_s3_bucket_ownership_controls" "ownership" {
  count  = var.create_s3_bucket ? 1 : 0
  bucket = aws_s3_bucket.shiptivitas_frontend[0].id

  rule {
    object_ownership = "BucketOwnerPreferred"
  }
}

resource "aws_s3_bucket_public_access_block" "public_access_block" {
  count  = var.create_s3_bucket ? 1 : 0
  bucket = aws_s3_bucket.shiptivitas_frontend[0].id

  block_public_acls       = true
  ignore_public_acls      = true
  block_public_policy     = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_cors_configuration" "cors" {
  count  = var.create_s3_bucket ? 1 : 0
  bucket = aws_s3_bucket.shiptivitas_frontend[0].id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET"]
    allowed_origins = ["*"]
    max_age_seconds = 3000
  }
}

resource "aws_s3_bucket_policy" "frontend_policy" {
  count  = var.create_s3_bucket ? 1 : 0
  bucket = aws_s3_bucket.shiptivitas_frontend[0].id

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Sid       = "AllowCloudFrontServicePrincipalReadOnly",
        Effect    = "Allow",
        Principal = {
          Service = "cloudfront.amazonaws.com"
        },
        Action    = "s3:GetObject",
        Resource  = "${aws_s3_bucket.shiptivitas_frontend[0].arn}/*",
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = var.use_existing_cdn ? data.aws_cloudfront_distribution.existing[0].arn : aws_cloudfront_distribution.cdn[0].arn
          }
        }
      }
    ]
  })
}
