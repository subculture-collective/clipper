#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

expected_version="1.26.9"
expected_image="golang:${expected_version}-alpine@sha256:3082400e369fa24d5fc60bca20edab3f6d604e0c5a690ec66b295eff4dd87ade"

fail() {
  echo "Go toolchain contract: $*" >&2
  exit 1
}

grep -Fxq "toolchain go${expected_version}" backend/go.mod \
  || fail "backend/go.mod must select Go ${expected_version}"

for dockerfile in backend/Dockerfile backend/Dockerfile.crawler; do
  grep -Fxq "FROM ${expected_image} AS builder" "$dockerfile" \
    || fail "$dockerfile must use the approved Go ${expected_version} builder digest"
done

if grep -Eq '^(toolchain go|FROM golang:)1\.26\.[0-8]([^0-9]|$)' backend/go.mod backend/Dockerfile backend/Dockerfile.crawler; then
  fail "vulnerable Go 1.26 patch release remains in an executable build input"
fi

echo "Go toolchain contract: verified ${expected_version}"
