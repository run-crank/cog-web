FROM node:18
# Note: ^ uses node:10.20.1-slim

# Install latest chrome dev package and fonts to support major charsets (Chinese, Japanese, Arabic, Hebrew, Thai and a few others)
# Note: this installs the necessary libs to make the bundled version of Chromium that Puppeteer installs, work.
RUN apt-get update \
    && apt-get install -y wget gnupg \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
      --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Install dumb-init to reap zombie processes
ADD https://github.com/Yelp/dumb-init/releases/download/v1.2.2/dumb-init_1.2.2_x86_64 /usr/local/bin/dumb-init
RUN chmod +x /usr/local/bin/dumb-init

# Update repository config - Change deb.debian.org to archive.debian.org
# RUN echo "deb http://archive.debian.org/debian stretch main" > /etc/apt/sources.list

# Install xvfb for running in headful mode
RUN apt-key adv --keyserver keyserver.ubuntu.com --recv-keys 4EB27DB2A3B88B8B
RUN apt-get update && apt-get install -yq xvfb
RUN apt-get update && apt-get upgrade -y && apt-get autoremove -y

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
LABEL com.stackmoxie.cog-for="Web"

ENTRYPOINT ["/usr/local/bin/dumb-init", "--", "xvfb-run", "--server-num=99", "--server-args=-screen 0 1280x960x24"]
# CMD ["node", "build/core/grpc-server.js"]
CMD ["xvfb-run", "-a", "--server-num=99", "--server-args=-screen 0 1280x960x24", "node", "build/core/grpc-server.js"] > /var/log/xvfb.log 2>&1
