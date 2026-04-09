#!/usr/bin/env bash
#
# Build a signed ZXP package for distribution.
#
# Prerequisites:
#   npm install -g zxp-sign-cmd
#
# Usage:
#   ./scripts/build-zxp.sh              # uses existing cert or creates one
#   ./scripts/build-zxp.sh --new-cert   # force create a new certificate
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BUILD_DIR="$PROJECT_DIR/build"
CERT_DIR="$PROJECT_DIR/.certs"
CERT_FILE="$CERT_DIR/cert.p12"
OUTPUT="$BUILD_DIR/afx-slop.zxp"
TIMESTAMP_URL="http://timestamp.digicert.com"

# Read version from manifest
VERSION=$(grep 'ExtensionBundleVersion=' "$PROJECT_DIR/CSXS/manifest.xml" | head -1 | sed 's/.*ExtensionBundleVersion="\([^"]*\)".*/\1/')
echo "Building afx-slop v${VERSION}"

# Check for zxp-sign-cmd
if ! command -v zxp-sign-cmd &>/dev/null; then
    echo "Error: zxp-sign-cmd not found. Install with:"
    echo "  npm install -g zxp-sign-cmd"
    exit 1
fi

# Create directories
mkdir -p "$BUILD_DIR" "$CERT_DIR"

# Certificate setup
if [[ "${1:-}" == "--new-cert" ]] || [[ ! -f "$CERT_FILE" ]]; then
    echo ""
    read -rp "Country code (e.g. US): " COUNTRY
    read -rp "State/Province: " STATE
    read -rp "City: " CITY
    read -rp "Publisher name: " PUBLISHER
    read -rsp "Certificate password: " CERT_PASS
    echo ""

    zxp-sign-cmd -selfSignedCert \
        "$COUNTRY" "$STATE" "$CITY" "$PUBLISHER" \
        "$CERT_PASS" "$CERT_FILE"

    echo "Certificate created: $CERT_FILE"
    echo ""
    echo "IMPORTANT: Save your password. You'll need it for future builds."
    echo ""
else
    echo "Using existing certificate: $CERT_FILE"
    read -rsp "Certificate password: " CERT_PASS
    echo ""
fi

# Create a staging directory with only the files we want in the ZXP
STAGING="$BUILD_DIR/staging"
rm -rf "$STAGING"
mkdir -p "$STAGING"

# Copy extension files (exclude dev/build artifacts)
rsync -a --exclude-from=- "$PROJECT_DIR/" "$STAGING/" <<'EXCLUDE'
.git
.gitignore
.certs
.debug
build
scripts
node_modules
*.md
.DS_Store
Thumbs.db
EXCLUDE

# Build the ZXP
rm -f "$OUTPUT"
zxp-sign-cmd -sign "$STAGING" "$OUTPUT" "$CERT_FILE" "$CERT_PASS" -tsa "$TIMESTAMP_URL"

# Clean up staging
rm -rf "$STAGING"

# Show result
SIZE=$(du -h "$OUTPUT" | cut -f1)
echo ""
echo "Built: $OUTPUT ($SIZE)"
echo ""
echo "Install with ZXPInstaller or Anastasiy's Extension Manager."
