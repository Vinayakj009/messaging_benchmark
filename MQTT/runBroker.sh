#!/bin/bash

docker network create mqtt

docker container run -it --rm --name mqtt-broker --network mqtt -v $(pwd)/mosquitto:/mosquitto eclipse-mosquitto