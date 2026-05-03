FROM criyle/go-judge:v1.12.0

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    default-jdk-headless \
    g++ \
    gcc \
    golang-go \
    kotlin \
    nodejs \
    php-cli \
    pypy3 \
    python3 \
    python3-pip \
    ruby \
    rustc \
  && rm -rf /var/lib/apt/lists/*
