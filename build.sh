#!/usr/bin/env bash
# Build and push tiskel/openstreetmap Docker image (multi-platform)
# Usage: ./build.sh [version] [--no-push] [--no-test] [--amd64-only] [--arm64-only]
# Example: ./build.sh v2.0.0
# Example: ./build.sh v2.0.0 --amd64-only

set -euo pipefail

IMAGE="tiskel/openstreetmap"
BUILDER="pelias-multiarch"

VERSION="latest"
NO_PUSH=false
NO_TEST=false
AMD64_ONLY=false
ARM64_ONLY=false

# Parse arguments
for arg in "$@"; do
    case "$arg" in
        --no-push)    NO_PUSH=true ;;
        --no-test)    NO_TEST=true ;;
        --amd64-only) AMD64_ONLY=true ;;
        --arm64-only) ARM64_ONLY=true ;;
        -*)
            echo "Unknown option: $arg"
            echo "Usage: ./build.sh [version] [--no-push] [--no-test] [--amd64-only] [--arm64-only]"
            exit 1
            ;;
        *)  VERSION="$arg" ;;
    esac
done

TAG="${IMAGE}:${VERSION}"

if [ "$AMD64_ONLY" = true ]; then
    PLATFORMS="linux/amd64"
elif [ "$ARM64_ONLY" = true ]; then
    PLATFORMS="linux/arm64"
else
    PLATFORMS="linux/amd64,linux/arm64"
fi

# Build context = directory containing this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "========================================"
echo " Building Custom Pelias OpenStreetMap"
echo "========================================"
echo ""
echo "  Image:     $TAG"
echo "  Platforms: $PLATFORMS"
echo "  Context:   $SCRIPT_DIR"
echo ""

# Check if Docker is running
if ! docker ps > /dev/null 2>&1; then
    echo "ERROR: Docker is not running!"
    exit 1
fi

MULTI_PLATFORM=true
if [ "$AMD64_ONLY" = true ] || [ "$ARM64_ONLY" = true ]; then
    MULTI_PLATFORM=false
fi

# ── Ensure multi-platform builder ─────────────────────────────────────────────
if [ "$MULTI_PLATFORM" = true ]; then
    if ! docker buildx inspect "$BUILDER" > /dev/null 2>&1; then
        echo "[buildx] Creating multi-platform builder: $BUILDER"
        docker buildx create --name "$BUILDER" --driver docker-container \
            --driver-opt image=moby/buildkit:latest --bootstrap
    else
        echo "[buildx] Using existing builder: $BUILDER"
    fi
    docker buildx use "$BUILDER"
fi

# ── Step 1: Build ─────────────────────────────────────────────────────────────
echo "Step 1: Building Docker image..."

BUILD_ARGS=(
    buildx build
    --platform "$PLATFORMS"
    -f "$SCRIPT_DIR/Dockerfile.custom"
    -t "$TAG"
)

if [ "$NO_PUSH" = false ]; then
    if [ "$MULTI_PLATFORM" = true ]; then
        BUILD_ARGS+=(--push)
        echo "        (pushing directly during build)"
    else
        BUILD_ARGS+=(--load)
    fi
else
    if [ "$MULTI_PLATFORM" = false ]; then
        BUILD_ARGS+=(--load)
    else
        BUILD_ARGS+=(--output type=image,push=false)
        echo "        WARNING: Multi-platform --no-push produces a cache-only build."
    fi
fi

BUILD_ARGS+=("$SCRIPT_DIR")
docker "${BUILD_ARGS[@]}"

echo "Build successful!"
echo ""

# ── Step 2: Tests ─────────────────────────────────────────────────────────────
if [ "$NO_TEST" = false ]; then
    if [ "$MULTI_PLATFORM" = false ]; then
        echo "Step 2: Running tests..."
        if [ "$ARM64_ONLY" = true ]; then
            TEST_PLATFORM="linux/arm64"
        else
            TEST_PLATFORM="linux/amd64"
        fi
        docker run --rm --platform "$TEST_PLATFORM" "$TAG" npm test || \
            echo "WARNING: Tests failed! Continuing anyway..."
        echo ""
    else
        echo "Step 2: Skipping tests (image not loaded locally in multi-platform mode)."
        echo ""
    fi
fi

# ── Step 3: Push (single-platform only) ───────────────────────────────────────
if [ "$NO_PUSH" = false ] && [ "$MULTI_PLATFORM" = false ]; then
    echo "Step 3: Pushing to Docker Hub..."
    docker push "$TAG"
    echo "Pushed successfully!"
    echo ""
fi

echo "========================================"
echo " SUCCESS!"
echo "========================================"
echo ""
echo "  Image:     $TAG"
echo "  Platforms: $PLATFORMS"
echo ""
echo "To use this image, update docker-compose.yml:"
echo "  openstreetmap:"
echo "    image: $TAG"
echo ""
echo "Then run:"
echo "  pelias compose pull openstreetmap"
echo "  pelias import osm"
echo ""
