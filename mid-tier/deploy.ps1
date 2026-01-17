#!/bin/bash
# PowerShell equivalent: deploy.ps1

# Kalakala Corner - Lambda Deployment Script (PowerShell)

param(
    [string]$Environment = "dev",
    [string]$Region = "us-east-1"
)

$ErrorActionPreference = "Stop"

$STACK_NAME = "kalakala-api-$Environment"
$ACCOUNT_ID = (aws sts get-caller-identity --query Account --output text)
$S3_BUCKET = "kalakala-lambda-code-$ACCOUNT_ID"
$TIMESTAMP = Get-Date -Format "yyyyMMddHHmmss"

Write-Host "🚀 Deploying Kalakala Corner API to AWS Lambda" -ForegroundColor Green
Write-Host "Environment: $Environment"
Write-Host "Region: $Region"
Write-Host "Stack: $STACK_NAME"
Write-Host ""

# Step 1: Build the project
Write-Host "📦 Building project..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

# Step 2: Create S3 bucket if it doesn't exist
Write-Host "🪣 Preparing S3 bucket..." -ForegroundColor Cyan
try {
    aws s3 ls "s3://$S3_BUCKET" --region $Region 2>$null
} catch {
    Write-Host "Creating S3 bucket: $S3_BUCKET"
    aws s3 mb "s3://$S3_BUCKET" --region $Region
}

# Step 3: Package Lambda code
Write-Host "📝 Packaging Lambda functions..." -ForegroundColor Cyan
$zipFile = "lambda-code-$TIMESTAMP.zip"
$excludePatterns = @("dist/server.js", "dist/server.d.ts")

# Create zip file with PowerShell
Add-Type -AssemblyName "System.IO.Compression.FileSystem"
[System.IO.Compression.ZipFile]::CreateFromDirectory("$(Get-Location)\dist", $zipFile)

# Step 4: Upload to S3
Write-Host "☁️ Uploading to S3..." -ForegroundColor Cyan
aws s3 cp $zipFile "s3://$S3_BUCKET/$zipFile" --region $Region

# Step 5: Deploy CloudFormation stack
Write-Host "🔧 Deploying CloudFormation stack..." -ForegroundColor Cyan
$params = @(
    "ParameterKey=Environment,ParameterValue=$Environment",
    "ParameterKey=AdminTokenSecret,ParameterValue=$env:ADMIN_TOKEN_SECRET"
)

aws cloudformation deploy `
    --template-file template.yaml `
    --stack-name $STACK_NAME `
    --parameter-overrides $params `
    --capabilities CAPABILITY_IAM `
    --region $Region

if ($LASTEXITCODE -ne 0) {
    Write-Host "CloudFormation deployment failed!" -ForegroundColor Red
    exit 1
}

# Step 6: Get stack outputs
Write-Host "`n✅ Deployment complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Stack outputs:" -ForegroundColor Cyan

aws cloudformation describe-stacks `
    --stack-name $STACK_NAME `
    --region $Region `
    --query 'Stacks[0].Outputs[*].[OutputKey,OutputValue]' `
    --output table

# Cleanup
Write-Host ""
Write-Host "🧹 Cleaning up..." -ForegroundColor Cyan
Remove-Item -Force $zipFile

Write-Host "Done!" -ForegroundColor Green
