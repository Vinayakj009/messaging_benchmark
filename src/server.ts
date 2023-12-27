import { Printable } from "./server/interfaces";
import { MqttClient, MqttServer } from "./server/implementations/mqtt";
import { ServerTester } from "./server/serverTester";

const protocol = 'mqtt'
const host = 'mqtt-broker'
const port = '1883'
const connectUrl = `${protocol}://${host}:${port}`
const serverTester = new ServerTester((Printer: Printable) => {
    return new MqttServer(Printer);
}, (Printer: Printable, shreOfInterest: string) => {
    return new MqttClient(Printer, shreOfInterest);
}
    , connectUrl);

console.log("starting server");
const arg = process.argv[2];

if (arg === "server") {
    serverTester.startServer();
} else if (arg === "client") {
    serverTester.startClients(10, 10);
}
console.log("server ended");