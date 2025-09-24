FROM node:18-slim

RUN apt-get update \
    && apt-get install -y python3 build-essential \
    && ln -sf python3 /usr/bin/python \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# copy just package files so we can cache deps
COPY package.json yarn.lock ./

# COPY your source too, since yarn install will see it
COPY . .

# no more VOLUME, so we don't clobber node_modules

# at container start: (re)install deps & build
CMD ["bash","-lc","yarn install && yarn build"]