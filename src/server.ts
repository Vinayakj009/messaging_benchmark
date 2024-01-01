import { Printable } from "./server/interfaces";
import { SocketIoClient, SocketIoServer } from "./server/implementations/socketIo";
import { ServerTester, TestCase } from "./server/serverTester";
import { MqttClient, MqttServer } from "./server/implementations/mqtt";
import { uWebSocketClient, uWebSocketServer } from "./server/implementations/uWebSocket";
import { stompClient, stompServer } from "./server/implementations/stomp";
import { writeFileSync } from 'fs';

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

function buildServerTester() {
    return new ServerTester((Printer: Printable) => {
        return new server.server(Printer, server.host, server.port, server.protocol);
    }, (Printer: Printable, shreOfInterest: string) => {
        return new server.client(Printer, shreOfInterest, server.host, server.port, server.protocol);
    }, 100);
}

async function RunTestCases(clientTestCases: TestCase[]) {
    for (let i = 0; i < clientTestCases.length; i++) {
        const testCase = clientTestCases[i];
        const serverTester = buildServerTester();
        console.log("Running test case 1");
        console.log("Topics " + testCase.topicCount);
        console.log("Publishers " + testCase.publishersPerTopic);
        console.log("Subscribers " + testCase.subscribersPerTopic);
        console.log("RunTime " + testCase.runTime + "s");
        await serverTester.startClients(testCase);
    }
    const outputs: string[] = [];
    outputs.push(clientTestCases[0].headers().join(","));
    for (let i = 0; i < clientTestCases.length; i++) {
        const testCase = clientTestCases[i];
        outputs.push(testCase.toString());
    }
    const output = outputs.join("\n");
    writeFileSync(`${serverType}.csv`, output);
}


async function runClients() {
    console.log("starting clients");
    var clientTestsCases: TestCase[] = [
        new TestCase(1, 1, 1, 10),
        new TestCase(1, 5, 20, 10),
        new TestCase(5, 5, 20, 10),
    ];
    await RunTestCases(clientTestsCases);
    console.log("tests complete");
    process.exit(0);
}

function runServer() {
    console.log("starting server");
    const serverTester = buildServerTester();
    serverTester.startServer();
    console.log("server ended");    
}

console.log("runType", runType); 

if (runType === "server") {
    runServer();
} else if (runType === "client") {
    runClients();
}