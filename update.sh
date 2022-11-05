#!/bin/sh

git fetch
git pull

echo "Updating container"

docker build -t panel:remodded .
cd /root/compose/panel || exit
docker-compose down
docker-compose up --detach
