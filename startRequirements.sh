#!/bin/bash
script="$1"

if [[ "$script" == "mqtt" ]]; then
    docker container run -d --rm --name mqtt-broker --network serverTest -v $(pwd)/requirements/mqtt/mosquitto:/mosquitto eclipse-mosquitto
fi

if [[ "$script" == "stomp" ]]; then
    if [[ ! -f "$(pwd)/requirements/stomp/stomp.jar" ]]; then
        docker container run -it --rm -w /project -v $(pwd)/requirements/stomp/codebase:/project -v ~/.m2:/root/.m2 maven mvn clean install -DskipTests
        rm -rf $(pwd)/requirements/stomp/stomp.jar
        cp $(pwd)/requirements/stomp/codebase/target/stomp-1.jar $(pwd)/requirements/stomp/stomp.jar
    fi
    docker container run -d --rm --name stomp-broker --network serverTest -v $(pwd)/requirements/stomp/stomp.jar:/stomp.jar openjdk:17 java -jar /stomp.jar 
    sleep 2;
fi