FROM postgres@sha256:4327b9fd295502f326f44153a1045a7170ddbfffed1c3829798328556cfd09e2
USER root
RUN apk add --no-cache openssl
USER postgres
