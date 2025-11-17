#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${BSC_FIREBASE_PROJECT:-bsc-lab}"
CREDS_PATH="${GOOGLE_APPLICATION_CREDENTIALS:-}"

if [[ -z "$CREDS_PATH" ]]; then
  if ! gcloud auth application-default print-access-token >/dev/null 2>&1; then
    echo "Set GOOGLE_APPLICATION_CREDENTIALS or run 'gcloud auth application-default login'."
    exit 1
  fi
fi

echo "Seeding production Firestore project: $PROJECT_ID"

BSC_ALLOW_PROD_SEED=1 \
  BSC_FIREBASE_PROJECT="$PROJECT_ID" \
  GOOGLE_APPLICATION_CREDENTIALS="$CREDS_PATH" \
  npm run seed:firestore:prod
