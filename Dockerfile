# StoreOps API — multi-stage build
# Zero external runtime dependencies (see DESIGN_BRIEF.md Section D),
# so this image only needs Node itself plus the TypeScript compiler as
# a dev-time tool; nothing is installed from npm at image-build time.

FROM node:20-slim AS build
WORKDIR /app
COPY package.json tsconfig.json ./
COPY src ./src
COPY tests ./tests
COPY scripts ./scripts
# TypeScript itself is the only "dependency" this project has, and even
# that is only needed to compile — see package.json's devDependencies
# note. If a registry is reachable at build time, this restores it
# normally; this Dockerfile does not assume registry access is blocked
# the way this development sandbox's egress proxy is.
RUN npm install --no-save typescript@^5.4.0 || true
RUN npx tsc -p tsconfig.json

FROM node:20-slim AS runtime
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY package.json ./
ENV PORT=3000
EXPOSE 3000
CMD ["node", "dist/src/server.js"]
