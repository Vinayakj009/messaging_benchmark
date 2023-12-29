#!/bin/bash
script="$1"

if [[ "$script" == "mqtt" ]]; then
    docker container stop mqtt-broker
fi
if [[ "$script" == "stomp" ]]; then
    docker container stop stomp-broker
fi