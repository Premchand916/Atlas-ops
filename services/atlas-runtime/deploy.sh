#!/bin/bash
# ATLAS Cloud Run Deploy — run from repo root: bash services/atlas-runtime/deploy.sh
# Prerequisites: gcloud CLI installed, secrets already created in Secret Manager.
#
# One-time secret setup (run once, then never again — values stay in Secret Manager):
#   printf '%s' "YOUR_GEMINI_KEY"  | gcloud secrets create gemini-api-key       --data-file=-
#   printf '%s' "YOUR_GITHUB_PAT"  | gcloud secrets create github-token         --data-file=-
#   printf '%s' "YOUR_STRIPE_KEY"  | gcloud secrets create stripe-secret-key    --data-file=-
# (Use `gcloud secrets versions add <name> --data-file=-` to rotate.)

set -e

PROJECT=atlas-b8cb1
REGION=us-central1
REPO=atlas
IMAGE=atlas-runtime
SERVICE=atlas-runtime
ALLOWED_ORIGINS=${ALLOWED_ORIGINS:-https://auxteam.in,https://www.auxteam.in}

# ── 1. Auth + project ────────────────────────────────────────────────────────
gcloud auth login
gcloud config set project $PROJECT

# ── 2. Enable required APIs ──────────────────────────────────────────────────
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com

# ── 3. Create Artifact Registry repo (skip if already exists) ────────────────
gcloud artifacts repositories create $REPO \
  --repository-format=docker \
  --location=$REGION \
  --description="ATLAS runtime images" 2>/dev/null || echo "Repo already exists — skipping"

# ── 4. Build + push image via Cloud Build ────────────────────────────────────
IMAGE_URI=$REGION-docker.pkg.dev/$PROJECT/$REPO/$IMAGE:latest

gcloud builds submit \
  --tag $IMAGE_URI \
  services/atlas-runtime/

# ── 5. Grant Cloud Run SA Firestore + Secret Manager + Firebase Auth access ──
PROJECT_NUMBER=$(gcloud projects describe $PROJECT --format="value(projectNumber)")
SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

gcloud projects add-iam-policy-binding $PROJECT \
  --member="serviceAccount:${SA}" \
  --role="roles/datastore.user"

gcloud projects add-iam-policy-binding $PROJECT \
  --member="serviceAccount:${SA}" \
  --role="roles/secretmanager.secretAccessor"

gcloud projects add-iam-policy-binding $PROJECT \
  --member="serviceAccount:${SA}" \
  --role="roles/firebaseauth.viewer"

# ── 6. Deploy to Cloud Run (secrets mounted from Secret Manager) ─────────────
# Note: still --allow-unauthenticated at the Cloud Run layer; the app enforces
# Firebase ID token verification on every /chat/* endpoint via app/auth.py.
gcloud run deploy $SERVICE \
  --image $IMAGE_URI \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --memory 1Gi \
  --timeout 300 \
  --service-account "${SA}" \
  --set-env-vars "GOOGLE_CLOUD_PROJECT=${PROJECT},ALLOWED_ORIGINS=${ALLOWED_ORIGINS}" \
  --set-secrets "GEMINI_API_KEY=gemini-api-key:latest,GITHUB_TOKEN=github-token:latest,STRIPE_SECRET_KEY=stripe-secret-key:latest"

# ── 7. Get service URL ────────────────────────────────────────────────────────
URL=$(gcloud run services describe $SERVICE --region=$REGION --format="value(status.url)")
echo ""
echo "✓ Deployed: $URL"
echo ""
echo "Next: update services/atlas-frontend/.env.local"
echo "  VITE_BACKEND_URL=$URL"
