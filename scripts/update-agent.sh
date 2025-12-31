#!/bin/bash
set -e

INTERVAL=${CHECK_INTERVAL:-300}
IMAGE_NAME=${IMAGE_NAME:-ghcr.io/pariyaproject/anime:latest}
COMPOSE_FILE=${COMPOSE_FILE:-docker-compose.yml}

echo "🔄 Update Agent Started"
echo "   Check Interval: ${INTERVAL}s"
echo "   Image: ${IMAGE_NAME}"
echo ""

while true; do
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Checking for updates..."

    # Get remote image digest
    REMOTE_DIGEST=$(docker manifest inspect ${IMAGE_NAME} 2>/dev/null | \
        jq -r '.manifests[0].digest // empty')

    if [ -z "$REMOTE_DIGEST" ]; then
        echo "   ⚠️  Unable to fetch remote manifest, forcing pull..."
        docker pull ${IMAGE_NAME} >/dev/null 2>&1 || {
            echo "   ❌ Failed to pull image. Retrying next cycle."
            sleep $INTERVAL
            continue
        }
    fi

    # Get local image digest
    LOCAL_DIGEST=$(docker image inspect ${IMAGE_NAME} 2>/dev/null | \
        jq -r '.[0].RepoDigests[0] // empty' | grep -o 'sha256:[a-f0-9]*' || echo "")

    if [ -z "$LOCAL_DIGEST" ]; then
        echo "   📦 No local image found, pulling..."
        docker pull ${IMAGE_NAME}
    fi

    # Get digests again after potential pull
    LOCAL_DIGEST=$(docker image inspect ${IMAGE_NAME} 2>/dev/null | \
        jq -r '.[0].RepoDigests[0] // empty' | grep -o 'sha256:[a-f0-9]*' || echo "")

    REMOTE_DIGEST=$(docker manifest inspect ${IMAGE_NAME} 2>/dev/null | \
        jq -r '.manifests[0].digest // empty')

    if [ "$REMOTE_DIGEST" != "$LOCAL_DIGEST" ]; then
        echo "   🆕 New version detected!"
        echo "      Remote: ${REMOTE_DIGEST}"
        echo "      Local:  ${LOCAL_DIGEST}"

        # Pull new image
        echo "   📥 Pulling new image..."
        docker pull ${IMAGE_NAME}

        # Restart services
        echo "   🔄 Restarting services..."
        docker-compose -f ${COMPOSE_FILE} up -d

        # Clean up old images
        echo "   🧹 Cleaning up old images..."
        docker image prune -f

        echo "   ✅ Update complete!"
    else
        echo "   ✅ Already up to date"
    fi

    echo ""
    sleep $INTERVAL
done
