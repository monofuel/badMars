FROM node:argon

RUN mkdir -p /badmars
WORKDIR /badmars
COPY . /badmars
RUN npm install -g gulp browserify
WORKDIR /badmars/server
#RUN npm install
WORKDIR /badmars/client
#RUN npm install
RUN make copy
RUN gulp transpile
WORKDIR /badmars/server
EXPOSE 3002


ENV BADMARS_DB rethinkdb-driver
ENV BADMARS_AUTH_SERVER mongo
ENV GOOGLE_OAUTH_ID 
ENV GOOGLE_OAUTH_CLIENT_SECRET
ENV GOOGLE_OAUTH_SECRET
ENV GOOGLE_OAUTH_CALLBACK
