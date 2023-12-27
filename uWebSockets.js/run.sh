#!/bin/bash

docker container run -it --rm -v $(pwd):/project -w /project --name uWebSocket node:16 npm run start