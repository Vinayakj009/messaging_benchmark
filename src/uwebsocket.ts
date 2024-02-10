import { Run, serverType } from "./runner";
import { stompClient, stompServer } from "./server/implementations/stomp";
import { uWebSocketClient, uWebSocketServer } from "./server/implementations/uwebsocket";

const serverTypes: {
    [key: string]: serverType
} = {
    stomp: {
        client: stompClient,
        server: stompServer,
        protocol: "ws",
        host: "stomp-broker",
        port: 8080
    },
    uwebsocket: {
        client: uWebSocketClient,
        server: uWebSocketServer,
        protocol: "http",
        host: "uwebsocket",
        port: 1883
    }
}

const runType = process.argv[2];
const selectedServer = process.argv[3];

if (!serverTypes[selectedServer]) {
    const allowedServerTypes: string[] = [];
    for (const key in serverTypes) {
        allowedServerTypes.push(key);
    }
    throw `Unknown server type: ${selectedServer}, expected on of ${allowedServerTypes.join(" , ")}`;
}

Run(runType, serverTypes[selectedServer], selectedServer);