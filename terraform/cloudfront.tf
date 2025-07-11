# ----------------------------------------------------------
# CloudFront + GitHub Actions IAM Configuration for Terraform
# ----------------------------------------------------------

data "aws_caller_identity" "current" {}

data "aws_iam_openid_connect_provider" "github" {
  arn = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:oidc-provider/token.actions.githubusercontent.com"
}

resource "aws_iam_role" "github_actions_role" {
  count = var.create_github_actions_role ? 1 : 0

  name = "github-actions-shiptivitas-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Effect = "Allow",
      Principal = {
        Federated = data.aws_iam_openid_connect_provider.github.arn
      },
      Action = "sts:AssumeRoleWithWebIdentity",
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
        },
        StringLike = {
          "token.actions.githubusercontent.com:sub" = "repo:RareSonal/Shiptivitas:ref:refs/heads/main"
        }
      }
    }]
  })

  lifecycle {
    prevent_destroy = true
  }
}

# ---------------------------
# IAM Policy for GitHub Actions (conditionally created)
# ---------------------------
resource "aws_iam_policy" "cloudfront_tag_read_policy" {
  count = var.create_cloudfront_tag_read_policy ? 1 : 0

  name        = "GitHubActions-CloudFrontTagRead"
  description = "Allow GitHub Actions to list CloudFront distributions and tags"

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Effect = "Allow",
      Action = [
        "cloudfront:ListDistributions",
        "cloudfront:ListTagsForResource"
      ],
      Resource = "*"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "attach_cloudfront_tag_read" {
  count      = var.create_cloudfront_tag_read_policy && var.create_github_actions_role ? 1 : 0
  role       = aws_iam_role.github_actions_role[0].name
  policy_arn = aws_iam_policy.cloudfront_tag_read_policy[0].arn
}

# ----------------------------------------------------------
# CloudFront Distribution Resources
# ----------------------------------------------------------

data "aws_cloudfront_distribution" "existing" {
  count = var.use_existing_cdn ? 1 : 0
  id    = var.cloudfront_distribution_id
}

resource "aws_cloudfront_origin_access_control" "oac" {
  count = var.create_oac ? 1 : 0

  name                               = "shiptivitas-oac"
  description                        = "OAC for secure access to S3"
  origin_access_control_origin_type  = "s3"
  signing_behavior                   = "always"
  signing_protocol                   = "sigv4"
}

locals {
  origin_access_control_id = var.create_oac ? aws_cloudfront_origin_access_control.oac[0].id : var.existing_oac_id
  s3_domain_name           = var.create_s3_bucket ? aws_s3_bucket.shiptivitas_frontend[0].bucket_regional_domain_name : "shiptivitas-frontend-bucket.s3.amazonaws.com"
}

resource "aws_cloudfront_distribution" "cdn" {
  count               = var.use_existing_cdn ? 0 : 1
  enabled             = true
  default_root_object = "index.html"
  comment             = "shiptivitas-cdn"

  origin {
    domain_name              = local.s3_domain_name
    origin_id                = "S3Origin"
    origin_access_control_id = local.origin_access_control_id
  }

  default_cache_behavior {
    target_origin_id       = "S3Origin"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    cache_policy_id        = "658327ea-f89d-4fab-a63d-7e88639e58f6" # AWS managed cache policy: CachingOptimized
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
