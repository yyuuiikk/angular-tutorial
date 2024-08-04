FROM node:20
WORKDIR /projects

RUN apt update -y
# テスト用にchromeをインストール
RUN apt install -y --no-install-recommends chromium

RUN npm install -g @angular/cli
EXPOSE 4200

