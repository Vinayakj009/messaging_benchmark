import { Printable } from "./server/interfaces";
import { SocketIoClient, SocketIoServer } from "./server/implementations/socketIo";
import { ServerTester } from "./server/serverTester";
import { MqttClient, MqttServer } from "./server/implementations/mqtt";
import { uWebSocketClient, uWebSocketServer } from "./server/implementations/uWebSocket";
import { stompClient, stompServer } from "./server/implementations/stomp";

const serverTypes: {
    [key: string]: {
        client: any,
        server: any,
        protocol: string,
        host: string,
        port: number
    }
} = {
    socketio: {
        client: SocketIoClient,
        server: SocketIoServer,
        protocol: "http",
        host: "127.0.0.1",
        port: 1883
    },
    uwebsocket: {
        client: uWebSocketClient,
        server: uWebSocketServer,
        protocol: "http",
        host: "127.0.0.1",
        port: 1883
    },
    mqtt: {
        client: MqttClient,
        server: MqttServer,
        protocol: "mqtt",
        host: "mqtt-broker",
        port: 1883
    },
    stomp: {
        client: stompClient,
        server: stompServer,
        protocol: "ws",
        host: "stomp-broker",
        port: 8080
    }
}


const runType = process.argv[2];
const serverType = process.argv[3];

const server = serverTypes[serverType];

if (!server) {
    const allowedServerTypes: string[] = [];
    for (const key in serverTypes) {
        allowedServerTypes.push(key);
    }
    throw `Unknown server type: ${serverType}, expected on of ${allowedServerTypes.join(" , ")}`;
}

const serverTester = new ServerTester((Printer: Printable) => {
    return new server.server(Printer, server.host, server.port, server.protocol);
}, (Printer: Printable, shreOfInterest: string) => {
    return new server.client(Printer, shreOfInterest, server.host, server.port, server.protocol);
},100
    );

console.log("starting server");

if (runType === "server") {
    serverTester.startServer();
} else if (runType === "client") {
    serverTester.startClients(5, 5, 10);
}
console.log("server ended");