#!/bin/bash
script="$1"

if [[ "$script" == "mqtt" ]]; then
    docker container run -d --rm --name mqtt-broker --network serverTest -v $(pwd)/requirements/mqtt/mosquitto:/mosquitto eclipse-mosquitto
fi