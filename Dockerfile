FROM buildkite/puppeteer:v1.15.0
# Note: ^ uses node:10.15.3-slim

# Update repository config - Change deb.debian.org to archive.debian.org
RUN echo "deb http://archive.debian.org/debian stretch main" > /etc/apt/sources.list

# Install dumb-init
RUN wget -O /usr/local/bin/dumb-init https://github.com/Yelp/dumb-init/releases/download/v1.2.2/dumb-init_1.2.2_amd64 && \
  echo "37f2c1f0372a45554f1b89924fbb134fc24c3756efaedf11e07f599494e0eff9  /usr/local/bin/dumb-init" | sha256sum -c - && \
  chmod 755 /usr/local/bin/dumb-init

# Install xvfb for running in headful mode
RUN apt-get update && apt-get install -yq xvfb

# Install the app
COPY . /app/
WORKDIR app
RUN npm install \
  && npm run build-ts \
  && npm prune --production

# Add nppptr (non-privileged puppeteer user) user.
RUN groupadd -r nppptr && useradd -r -g nppptr -G audio,video nppptr \
    && mkdir -p /home/nppptr/Downloads \
    && chown -R nppptr:nppptr /home/nppptr \
    && chown -R nppptr:nppptr /app

# Run user as non privileged.
USER nppptr

ENV IN_DOCKER=1
ENV DISPLAY :99

EXPOSE 28866
LABEL com.automatoninc.cog-for="Web"

ENTRYPOINT ["/usr/local/bin/dumb-init", "--", "xvfb-run", "--server-num=99", "--server-args=-screen 0 1280x960x24", "node", "build/core/grpc-server.js"]
