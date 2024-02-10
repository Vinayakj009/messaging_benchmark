import { Printable } from "./server/interfaces";
import { ServerTester, TestCase } from "./server/serverTester";
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
    
    writeFileSync(`${selectedServer}.csv`, output);
}


async function runClients(server: serverType, selectedServer:string) {
    console.log("starting clients");
    var clientTestsCases: TestCase[] = [
        new TestCase(selectedServer, 1, 1, 1, 10, 100),
        new TestCase(selectedServer, 1, 5, 20, 10, 100),
        new TestCase(selectedServer, 5, 5, 20, 10, 100),
        new TestCase(selectedServer, 5, 25, 100, 10, 100),
        new TestCase(selectedServer, 100, 1, 5, 10, 100),
        new TestCase(selectedServer, 200, 5, 5, 10, 100),
        new TestCase(selectedServer, 1, 1, 1, 10, 10),
        new TestCase(selectedServer, 1, 5, 20, 10, 10),
        new TestCase(selectedServer, 5, 5, 20, 10, 10),
        new TestCase(selectedServer, 5, 25, 100, 10, 10),
        new TestCase(selectedServer, 100, 1, 5, 10, 10),
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