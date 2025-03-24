import { ServerTester, TestCase } from "./server/serverTester";

import { Printable } from "./server/interfaces";
import { writeFileSync } from 'fs';

export interface serverType {
    client: any;
    server: any;
    protocol: string;
    host: string;
    port: number;
};



function buildServerTester(server: serverType) {
    return new ServerTester((Printer: Printable) => {
        return new server.server(Printer, server.host, server.port, server.protocol);
    }, (Printer: Printable, shreOfInterest: string) => {
        return new server.client(Printer, shreOfInterest, server.host, server.port, server.protocol);
    });
}

async function RunTestCases(clientTestCases: TestCase[], server: serverType, selectedServer:string) {
    for (let i = 0; i < clientTestCases.length; i++) {
        const testCase = clientTestCases[i];
        const serverTester = buildServerTester(server);
        console.log(`Running test case ${i} for server type ${selectedServer}`);
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
    
    writeFileSync(`${selectedServer}.csv`, output);
}


async function runClients(server: serverType, selectedServer:string) {
    console.log("starting clients");
    var clientTestsCases: TestCase[] = [
        new TestCase(selectedServer, 1, 1, 1, 5, 100),
        new TestCase(selectedServer, 2, 5, 20, 5, 100),
        new TestCase(selectedServer, 5, 5, 20, 5, 100),
        new TestCase(selectedServer, 10, 10, 10, 5, 100),
        new TestCase(selectedServer, 20, 20, 5, 5, 100),
        new TestCase(selectedServer, 25, 25, 4, 5, 100),
        new TestCase(selectedServer, 50, 10, 2, 5, 100),
        new TestCase(selectedServer, 100, 5, 1, 5, 100),
        new TestCase(selectedServer, 10, 10, 10, 5, 150),
        new TestCase(selectedServer, 20, 20, 20, 5, 250),
        new TestCase(selectedServer, 30, 30, 30, 5, 300),
        new TestCase(selectedServer, 40, 20, 25, 5, 350),
        new TestCase(selectedServer, 50, 20, 10, 5, 400),
        new TestCase(selectedServer, 60, 15, 10, 5, 450),
        new TestCase(selectedServer, 70, 10, 10, 5, 500),
        new TestCase(selectedServer, 80, 10, 10, 5, 550),
        new TestCase(selectedServer, 90, 10, 10, 5, 600),
        new TestCase(selectedServer, 100, 10, 10, 5, 650),
    ];
    await RunTestCases(clientTestsCases, server, selectedServer);
    console.log("tests complete");
    process.exit(0);
}

function runServer(server: serverType) {
    console.log("starting server");
    const serverTester = buildServerTester(server);
    serverTester.startServer();
    console.log("server ended");
}

export function Run(runType: string, server: serverType, selectedServer: string) {
    if (runType === "server") {
        runServer(server);
    } else if (runType === "client") {
        runClients(server, selectedServer);
    }
}