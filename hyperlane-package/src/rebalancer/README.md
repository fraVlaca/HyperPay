OFT usage

- Build image: docker build -t hyperlane-rebalancer:oft ./hyperlane-package/src/rebalancer
- Prepare a rebalancer config selecting TokenBridgeOft addresses:
  - See hyperlane-monorepo/typescript/cli/examples/rebalancer.oft.example.json
- Run via Kurtosis:
  kurtosis run --enclave <enclave> . --args-file hyperlane-package/src/rebalancer/oft.args.example.yaml
- Or run Docker directly:
  docker run --rm -v $(pwd)/config:/config hyperlane-rebalancer:oft --config /config/rebalancer.oft.json

# Rebalancer (Docker)

This image runs the Hyperlane rebalancer with support for OFT (LayerZero) and CCTP. Configure via Kurtosis args-file and environment variables. Follow the existing CLI and route creation flows; bridge type is selected via config.
