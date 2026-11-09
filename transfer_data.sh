#!/bin/bash
# ==============================================================================
# SLD SYSTEM - ADMIN DATA MANAGEMENT & TRANSFER TOOL (VPS Terminal / Linux)
# Usage:
#   bash transfer_data.sh clean-downloads
#   bash transfer_data.sh statutes 5870 9372 "mongodb+srv://..."
#   bash transfer_data.sh users "mongodb+srv://..."
#   bash transfer_data.sh all "mongodb+srv://..."
# ==============================================================================

set -e

ACTION=${1:-all}
MIN_SR=${2:-5870}
MAX_SR=${3:-9372}
SOURCE_URI=${4:-""}

echo ""
echo "=================================================================="
echo "   SLD SYSTEM - ADMIN DATA MANAGEMENT & TRANSFER TOOL (VPS)       "
echo "=================================================================="
echo ""

if [ -n "$SOURCE_URI" ]; then
  export SOURCE_MONGODB_URI="$SOURCE_URI"
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/backend"

node src/scripts/adminDataOperations.js "$ACTION" "$MIN_SR" "$MAX_SR"

echo ""
echo "=================================================================="
echo "   DATA OPERATION FINISHED SUCCESSFULLY!                          "
echo "=================================================================="

