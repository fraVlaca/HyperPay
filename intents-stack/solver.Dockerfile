FROM rust:1.79-bullseye as builder

# Install dependencies
RUN apt-get update && apt-get install -y \
    git \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy the cloned solver repo
COPY oif-solvers /src
WORKDIR /src

# Build the solver
RUN cargo build --release --bin solver

# Runtime stage
FROM debian:bullseye-slim
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl1.1 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /src/target/release/solver /usr/local/bin/

EXPOSE 3000

ENTRYPOINT ["/usr/local/bin/solver"]
