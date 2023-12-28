#!/bin/bash

tsc src/*.ts
script="$1"

if [[ "$script" != "mqtt" && "$script" != "socketio" && "$script" != "uwebsocket" ]]; then
    echo "Invalid script argument. Please provide 'mqtt', 'socketio', or 'uwebsocket'."
    exit 1
fi

docker network create serverTest
if [[ "$script" == "mqtt" ]]; then
    docker container run -d --rm --name mqtt-broker --network serverTest -v $(pwd)/mosquitto:/mosquitto eclipse-mosquitto
fi
docker container run -it --rm -v $(pwd):/project -w /project --network serverTest --name container node:16 npm install
docker container run -d --rm -v $(pwd):/project -w /project --network serverTest --name $script node:16 npm run $script
docker container logs -f $script

if [[ "$script" == "mqtt" ]]; then
    docker container stop mqtt-broker
fi
docker container stop $script
docker network rm serverTest
rm src/*.js src/server/*.js src/server/*/*.js