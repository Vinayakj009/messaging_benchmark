import { SocketIoClient, SocketIoServer } from "./server/implementations/socketIo";
import { MqttClient, MqttServer } from "./server/implementations/mqtt";
import { ExpressWSClient, ExpressWSServer } from "./server/implementations/expressWs";
import { BunWSClient, BunWSServer } from "./server/implementations/bun";
import { Run, serverType } from "./runner";
import { ElysiaClient, ElysiaServer } from "./server/implementations/elysia";

const serverTypes: {
    [key: string]: serverType
} = {
    socketio: {
        client: SocketIoClient,
        server: SocketIoServer,
        protocol: "http",
        host: "socketio",
        port: 1883
    },
    mqtt: {
        client: MqttClient,
        server: MqttServer,
        protocol: "mqtt",
        host: "mqtt-broker",
        port: 1883
    },
    expressWS: {
        client: ExpressWSClient,
        server: ExpressWSServer,
        protocol: "ws",
        host: "expressWS",
        port: 8080
    },
    bun: {
        client: BunWSClient,
        server: BunWSServer,
        protocol: "ws",
        host: "bun",
        port: 8080
    },
    elysia: {
        client: ElysiaClient,
        server: ElysiaServer,
        protocol: "ws",
        host: "elysia",
        port: 8080
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

