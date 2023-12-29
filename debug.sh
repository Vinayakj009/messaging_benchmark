#!/bin/bash

script="$1"

print_with_border() {
    local input_string="$1"
    local terminal_width=$(tput cols)
    local border=$(printf '=%.0s' $(seq 1 $terminal_width))
    
    local padding_length=$(( (terminal_width - ${#input_string}) / 2 ))
    local padding=$(printf ' %.0s' $(seq 1 $padding_length))

    echo ""   
    echo "$border"
    echo "$padding$input_string$padding"
    echo "$border"
    echo ""
}

if [ -z "$script" ]; then
    print_with_border "Error: ServerType name is required. Example: bash debug.sh mqtt"
    exit 1
fi

print_with_border "Running client for $script"
docker container exec -it $script npm run test "$script"