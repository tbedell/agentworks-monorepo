#!/bin/bash
set -e

# Configuration
PROJECT_ID="engagesuite-prod"
REGION="us-central1"
SERVICE_NAME="trident-marketing"
IMAGE_NAME="us-central1-docker.pkg.dev/${PROJECT_ID}/agentworks/${SERVICE_NAME}"
TAG=$(date +%Y%m%d%H%M%S)

echo "🔱 Deploying AgentWorks Trident Marketing Site"
echo "================================================"
echo "Project: ${PROJECT_ID}"
echo "Region: ${REGION}"
echo "Service: ${SERVICE_NAME}"
echo "Tag: ${TAG}"
echo ""

# Build Docker image
echo "📦 Building Docker image..."
docker build -t "${IMAGE_NAME}:${TAG}" -t "${IMAGE_NAME}:latest" .

# Push to Artifact Registry
echo "📤 Pushing to Artifact Registry..."
docker push "${IMAGE_NAME}:${TAG}"
docker push "${IMAGE_NAME}:latest"

# Deploy to Cloud Run
echo "🚀 Deploying to Cloud Run..."
gcloud run deploy ${SERVICE_NAME} \
  --image "${IMAGE_NAME}:${TAG}" \
  --region ${REGION} \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --min-instances 0 \
  --max-instances 3 \
  --memory 256Mi \
  --cpu 1 \
  --project ${PROJECT_ID}

# Get the service URL
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} --region ${REGION} --project ${PROJECT_ID} --format 'value(status.url)')

echo ""
echo "✅ Deployment complete!"
echo "🌐 Service URL: ${SERVICE_URL}"
echo ""
echo "📝 Next steps:"
echo "   1. Configure custom domain: trident.agentworksstudio.com"
echo "   2. Update DNS records to point to Cloud Run"
