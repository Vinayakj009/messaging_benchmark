#!/bin/bash

script="$1"
if [[ "$script" != "mqtt" && "$script" != "socketio" && "$script" != "uwebsocket" ]]; then
    echo "Invalid script argument. Please provide 'mqtt', 'socketio', or 'uwebsocket'."
    exit 1
fi

docker container exec -it mqtt npm run "$script""_client"