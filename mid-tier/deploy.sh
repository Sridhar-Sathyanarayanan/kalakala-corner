#!/bin/bash

# Kalakala Corner - Lambda Deployment Script

set -e

# Configuration
ENVIRONMENT=${1:-dev}
REGION=${AWS_REGION:-us-east-1}
STACK_NAME="kalakala-api-${ENVIRONMENT}"
S3_BUCKET="kalakala-lambda-code-$(aws sts get-caller-identity --query Account --output text)"

echo "🚀 Deploying Kalakala Corner API to AWS Lambda"
echo "Environment: $ENVIRONMENT"
echo "Region: $REGION"
echo "Stack: $STACK_NAME"

# Step 1: Build the project
echo "📦 Building project..."
npm run build

# Step 2: Create S3 bucket if it doesn't exist
echo "🪣 Preparing S3 bucket..."
if ! aws s3 ls "s3://${S3_BUCKET}" 2>/dev/null; then
    echo "Creating S3 bucket: $S3_BUCKET"
    aws s3 mb "s3://${S3_BUCKET}" --region "$REGION"
fi

# Step 3: Package Lambda code
echo "📝 Packaging Lambda functions..."
zip -r lambda-code.zip dist/ node_modules/ -x "dist/server.*"

# Step 4: Upload to S3
echo "☁️ Uploading to S3..."
aws s3 cp lambda-code.zip "s3://${S3_BUCKET}/lambda-code-$(date +%s).zip"

# Step 5: Deploy CloudFormation stack
echo "🔧 Deploying CloudFormation stack..."
aws cloudformation deploy \
    --template-file cloudformation-template.json \
    --stack-name "$STACK_NAME" \
    --parameter-overrides \
        Environment="$ENVIRONMENT" \
        AdminTokenSecret="${ADMIN_TOKEN_SECRET}" \
    --capabilities CAPABILITY_IAM \
    --region "$REGION"

# Step 6: Get stack outputs
echo "✅ Deployment complete!"
echo ""
echo "Stack outputs:"
aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --query 'Stacks[0].Outputs[*].[OutputKey,OutputValue]' \
    --output table

# Cleanup
rm -f lambda-code.zip
