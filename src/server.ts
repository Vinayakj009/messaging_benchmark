import { Printable } from "./server/interfaces";
import { SocketIoClient, SocketIoServer } from "./server/implementations/socketIo";
import { ServerTester } from "./server/serverTester";
import { MqttClient, MqttServer } from "./server/implementations/mqtt";
import { uWebSocketClient, uWebSocketServer } from "./server/implementations/uWebSocket";

let protocol = 'http'
let host = '127.0.0.1'
const port = 1883


const runType = process.argv[2];
const serverType = process.argv[3];

const serverTester = new ServerTester((Printer: Printable) => {
    switch (serverType) {
        case "socketio":
            return new SocketIoServer(Printer, host, port, protocol);
        case "uwebsocket":
            return new uWebSocketServer(Printer, host, port, protocol);
        case "mqtt":
            protocol = "mqtt";
            host = "mqtt-broker";
            return new MqttServer(Printer, host, port, protocol);
        default:
            throw new Error("no server type specified");
    }
}, (Printer: Printable, shreOfInterest: string) => {
    switch (serverType) {
        case "socketio":
            return new SocketIoClient(Printer, shreOfInterest, host, port, protocol);
        case "uwebsocket":
            return new uWebSocketClient(Printer, shreOfInterest, host, port, protocol);
        case "mqtt":
            protocol = "mqtt";
            host = "mqtt-broker";
            return new MqttClient(Printer, shreOfInterest, host, port, protocol);;
        default:
            throw new Error("no server type specified");
    }
    
}
    );

console.log("starting server");

if (runType === "server") {
    serverTester.startServer();
} else if (runType === "client") {
    serverTester.startClients(10, 10);
}
console.log("server ended");