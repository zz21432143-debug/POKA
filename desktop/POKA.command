#!/bin/bash
cd "$(dirname "$0")/.."
export POKA_URL="${POKA_URL:-http://127.0.0.1:43123}"
exec bash desktop/open-poka.sh
