#!/bin/bash

docker network create mqtt

docker container run -d --rm --name mqtt-broker --network mqtt -v $(pwd)/mosquitto:/mosquitto eclipse-mosquitto
tsc *.ts
docker container run -d --rm -v $(pwd):/project -w /project --network mqtt --name mqtt node:16 npm run start
docker container logs -f mqtt
docker container stop mqtt mqtt-broker
docker network rm mqtt
rm *.js