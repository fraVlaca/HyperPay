#!/bin/sh
set -e
npx -y @hyperlane-xyz/cli hyperlane warp rebalancer "$@"
