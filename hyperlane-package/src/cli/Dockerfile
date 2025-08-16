FROM node:20-bullseye
ARG CLI_VERSION=latest
RUN npm i -g @hyperlane-xyz/cli@${CLI_VERSION}
WORKDIR /work
COPY deploy_core.sh /usr/local/bin/deploy_core.sh
COPY warp_routes.sh /usr/local/bin/warp_routes.sh
COPY send_warp.sh /usr/local/bin/send_warp.sh
RUN chmod +x /usr/local/bin/deploy_core.sh /usr/local/bin/warp_routes.sh /usr/local/bin/send_warp.sh
