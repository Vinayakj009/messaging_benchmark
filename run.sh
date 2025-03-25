#!/bin/bash
scripts="$1"
if [ -z "$scripts" ]; then
    scripts="socketio expressWS stomp mqtt uwebsocket bun elysia"
fi
# scripts="uwebsocket"

print_with_border() {
    local input_string="$1"
    local terminal_width=$(tput cols)
    local border=$(printf '=%.0s' $(seq 1 $terminal_width))

    local padding_length=$(((terminal_width - ${#input_string}) / 2))
    local padding=$(printf ' %.0s' $(seq 1 $padding_length))

    echo ""
    echo "$border"
    echo "$padding$input_string$padding"
    echo "$border"
    echo ""
}

testScript() {
    print_with_border "Starting requirements for $script"
    bash startRequirements.sh $script

    print_with_border "Running server for $script"
    # We are running node 16 as uWebSocket does not work with latest node version
    # You can run `git apply latestNode.diff` and then run the test for other servers if you want to check them running on
    # latest version of node
    docker container run -d --rm -v $(pwd):/project -w /project --network serverTest --name $script oven/bun:1 bun src/server.ts server "$script"

    print_with_border "Storing server logs"
    mkdir -p logs
    docker container logs -f $script 2>&1 >logs/$script.log &

    print_with_border "Running client for $script"
    docker container run -it --rm --name test-$script -v $(pwd):/project -w /project --network serverTest oven/bun:1 bun src/server.ts client "$script"
    # docker container logs -f $script

    print_with_border "Stopping server for $script"
    docker container stop $script 2>&1 >/dev/null

    print_with_border "Stopping requirements for $script"
    bash stopRequirements.sh $script
}

testScriptuWs() {
    print_with_border "Starting requirements for $script"
    bash startRequirements.sh $script

    print_with_border "Running server for $script"
    # We are running node 16 as uWebSocket does not work with latest node version
    # You can run `git apply latestNode.diff` and then run the test for other servers if you want to check them running on
    # latest version of node
    docker container run -d --rm -v $(pwd):/project -w /project --network serverTest --name $script node:19 node src/uwebsocket.js server $script

    print_with_border "Storing server logs"
    mkdir -p logs
    docker container logs -f $script 2>&1 >logs/$script.log &

    print_with_border "Running client for $script"
    docker container run -it --rm --name test-$script -v $(pwd):/project -w /project --network serverTest node:19 node src/uwebsocket.js client $script
    # docker container logs -f $script

    print_with_border "Stopping server for $script"
    docker container stop $script 2>&1 >/dev/null

    print_with_border "Stopping requirements for $script"
    bash stopRequirements.sh $script
}

# if [ -z "$script" ]; then
#     terminal_width=$(tput cols)
#     print_with_border "Error: ServerType name is required. Example: bash run.sh mqtt"
#     exit 1
# fi

print_with_border "Creating local network serverTest"
docker network create serverTest 2>&1 >/dev/null

print_with_border "Installing Node modules"
docker container run -it --rm -v $(pwd):/project -w /project --network serverTest --name installer node:19 npm install

print_with_border "Compiling typescript to js"
docker container run -it --rm -v $(pwd):/project -w /project --network serverTest --name compiler node:19 npm run compile
# npm run compile

rm "output.csv"
for script in $scripts; do
    if [ "$script" == "uwebsocket" ]; then
        testScriptuWs $script
    elif [ "$script" == "stomp" ]; then
        echo "running stomp"
        testScriptuWs $script
    else
        testScript $script
    fi
    if [ ! -f "output.csv" ]; then
        head -n 1 "$script.csv" >output.csv
    fi
    tail -n +2 "$script.csv" >>output.csv
    echo "" >>output.csv
done

print_with_border "Removing compiled js code"
rm src/*.js src/server/*.js src/server/*/*.js

print_with_border "Removing local network serverTest"
docker network rm serverTest 2>&1 >/dev/null
cd analysis/
print_with_border "Checking for .env folder"
if [ ! -d ".env" ]; then
    print_with_border "Creating Python virtual environment"
    python3 -m venv .env
    print_with_border "Activating virtual environment and installing requirements"
    source .env/bin/activate
    pip install -r requirements.txt
    deactivate
else
    print_with_border ".env folder already exists"
fi

source .env/bin/activate
print_with_border "Results"
python analyze_data.py ../output.csv

print_with_border "Exiting"
