FROM node:20-bullseye
ARG CLI_VERSION=latest
RUN npm i -g @hyperlane-xyz/cli@${CLI_VERSION} ethers yaml
WORKDIR /work
COPY deploy_core.sh /usr/local/bin/deploy_core.sh
COPY warp_routes.sh /usr/local/bin/warp_routes.sh
COPY send_warp.sh /usr/local/bin/send_warp.sh
COPY balances.js /usr/local/bin/balances.js
COPY parse_txhash.js /usr/local/bin/parse_txhash.js
RUN chmod +x /usr/local/bin/deploy_core.sh /usr/local/bin/warp_routes.sh /usr/local/bin/send_warp.sh
