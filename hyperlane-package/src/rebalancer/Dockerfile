FROM node:20-alpine
WORKDIR /app

# Copy only what we need
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Default command uses args passed at runtime, e.g.:
# docker run --rm -v $(pwd)/config:/config image --config /config/rebalancer.json --monitorOnly
ENTRYPOINT ["/app/entrypoint.sh"]
