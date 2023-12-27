#!/bin/bash

#docker network create mqtt

# docker container run -d --rm --name mqtt-broker --network mqtt -v $(pwd)/mosquitto:/mosquitto eclipse-mosquitto
docker container run -it --rm -v $(pwd):/project -w /project --network mqtt --name mqtt node:16 npm run start