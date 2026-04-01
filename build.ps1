# Build and push tiskel/openstreetmap Docker image (multi-platform)
# Usage: .\build.ps1 [version] [-NoPush] [-NoTest] [-Amd64Only] [-Arm64Only]
# Example: .\build.ps1 v2.0.0
# Example: .\build.ps1 v2.0.0 -Amd64Only

param(
    [string]$Version = "latest",
    [switch]$NoPush,
    [switch]$NoTest,
    [switch]$Amd64Only,
    [switch]$Arm64Only
)

$ErrorActionPreference = "Stop"

$IMAGE    = "tiskel/openstreetmap"
$TAG      = "${IMAGE}:${Version}"
$BUILDER  = "pelias-multiarch"

if ($Amd64Only) {
    $PLATFORMS = "linux/amd64"
} elseif ($Arm64Only) {
    $PLATFORMS = "linux/arm64"
} else {
    $PLATFORMS = "linux/amd64,linux/arm64"
}

# Build context = directory containing this script
$CONTEXT = $PSScriptRoot

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Building Custom Pelias OpenStreetMap" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Image:     $TAG" -ForegroundColor Yellow
Write-Host "  Platforms: $PLATFORMS" -ForegroundColor Yellow
Write-Host "  Context:   $CONTEXT" -ForegroundColor Gray
Write-Host ""

# Check if Docker is running
try {
    docker ps | Out-Null
} catch {
    Write-Host "ERROR: Docker is not running!" -ForegroundColor Red
    exit 1
}

# ── Ensure multi-platform builder ─────────────────────────────────────────────
$multiPlatform = -not $Amd64Only -and -not $Arm64Only
if ($multiPlatform) {
    $prevEAP = $ErrorActionPreference
    $ErrorActionPreference = "SilentlyContinue"
    docker buildx inspect $BUILDER 2>&1 | Out-Null
    $builderFound = ($LASTEXITCODE -eq 0)
    $ErrorActionPreference = $prevEAP

    if (-not $builderFound) {
        Write-Host "[buildx] Creating multi-platform builder: $BUILDER" -ForegroundColor Gray
        docker buildx create --name $BUILDER --driver docker-container `
            --driver-opt image=moby/buildkit:latest --bootstrap
    } else {
        Write-Host "[buildx] Using existing builder: $BUILDER" -ForegroundColor Gray
    }
    docker buildx use $BUILDER
}

# ── Step 1: Build ─────────────────────────────────────────────────────────────
Write-Host "Step 1: Building Docker image..." -ForegroundColor Green

$BuildArgs = @(
    "buildx", "build",
    "--platform", $PLATFORMS,
    "-f", "$CONTEXT\Dockerfile.custom",
    "-t", $TAG
)

if (-not $NoPush) {
    if ($multiPlatform) {
        # Multi-platform images must be pushed directly (cannot be loaded locally)
        $BuildArgs += "--push"
        Write-Host "        (pushing directly during build)" -ForegroundColor Gray
    } else {
        # Single platform: load locally first, push after tests
        $BuildArgs += "--load"
    }
} else {
    if (-not $multiPlatform) {
        $BuildArgs += "--load"
    } else {
        $BuildArgs += @("--output", "type=image,push=false")
        Write-Host "        WARNING: Multi-platform --NoPush produces a cache-only build." -ForegroundColor Yellow
    }
}

$BuildArgs += $CONTEXT
& docker @BuildArgs

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Docker build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "Build successful!" -ForegroundColor Green
Write-Host ""

# ── Step 2: Tests ─────────────────────────────────────────────────────────────
if (-not $NoTest) {
    $canTest = (-not $multiPlatform) -or $NoPush -eq $false -and $multiPlatform -eq $false
    # Tests only when image is available locally (single-platform builds)
    if (-not $multiPlatform) {
        Write-Host "Step 2: Running tests..." -ForegroundColor Green
        $testPlatform = if ($Arm64Only) { "linux/arm64" } else { "linux/amd64" }
        docker run --rm --platform $testPlatform $TAG npm test

        if ($LASTEXITCODE -ne 0) {
            Write-Host "WARNING: Tests failed! Continuing anyway..." -ForegroundColor Yellow
        } else {
            Write-Host "Tests passed!" -ForegroundColor Green
        }
        Write-Host ""
    } else {
        Write-Host "Step 2: Skipping tests (image not loaded locally in multi-platform mode)." -ForegroundColor Gray
        Write-Host ""
    }
}

# ── Step 3: Push (single-platform only, multi-platform already pushed) ────────
if (-not $NoPush -and -not $multiPlatform) {
    Write-Host "Step 3: Pushing to Docker Hub..." -ForegroundColor Green
    docker push $TAG

    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Docker push failed!" -ForegroundColor Red
        Write-Host "Make sure you are logged in: docker login" -ForegroundColor Yellow
        exit 1
    }

    Write-Host "Pushed successfully!" -ForegroundColor Green
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " SUCCESS!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Image:     $TAG" -ForegroundColor Yellow
Write-Host "  Platforms: $PLATFORMS" -ForegroundColor Yellow
Write-Host ""
Write-Host "To use this image, update docker-compose.yml:" -ForegroundColor Cyan
Write-Host "  openstreetmap:" -ForegroundColor White
Write-Host "    image: $TAG" -ForegroundColor Yellow
Write-Host ""
Write-Host "Then run:" -ForegroundColor Cyan
Write-Host "  pelias compose pull openstreetmap" -ForegroundColor White
Write-Host "  pelias import osm" -ForegroundColor White
Write-Host ""
