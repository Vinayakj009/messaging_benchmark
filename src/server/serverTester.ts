import { Printable, Publishable, webSocketClient, webSocketServer } from "./interfaces";
import { access, constants, writeFile } from 'fs';

import { Mutex } from 'async-mutex';
import { Printer } from "./printer";

const watcherFilePath = "/file.txt";

function createFile(filePath: string): void {
    writeFile(filePath, '', (err) => {
        if (err) {
            console.error('Error creating file:', err);
        } else {
            console.log('File created successfully!');
        }
    });
}

export function waitForServerStart(): Promise<void> {
    return new Promise((resolve, _reject) => {
        const interval = setInterval(() => {
            access(watcherFilePath, constants.F_OK, (err) => {
                if (!err) {
                    clearInterval(interval);
                    resolve();
                }
            });
        }, 1000);
    });
}



class Publisher {
    constructor(private client: Publishable, private topic: string) {
    }
    public async publish() {
        this.client.publish(this.topic, `${Date.now()}`);
    }
}

class exactInterval {
    private nextStartTime = Date.now();
    private timeout?: NodeJS.Timer;
    constructor(private callback: () => void, private interval: number) {
        this.start();
    };
    private start(): void {
        this.nextStartTime = Date.now() + this.interval;
        this.run();
    }
    private async run() {
        this.timeout = setTimeout(async () => {
            this.run();
        }, this.nextStartTime - Date.now());
        this.nextStartTime += this.interval;
        this.callback();
    }
    public stop(): void {
        clearTimeout(this.timeout);
    }
}

const headers: string[] = [
    "serverType",
    "runTime",
    "topicCount",
    "publishersPerTopic",
    "publishPerSecond",
    "subscribersPerTopic",
    "establishedConnectionsActual",
    "establishedConnectionsExpected",
    "transactionsActual",
    "transactionsExpected",
    "receivedMessagesActual",
    "receivedMessagesExpected",
    "averageLatency",
    "totalLatency",
    "maxLatency"
];

export class TestCase {
    public receivedMessagesExpected?: number;
    public establishedConnectionsExpected?: number;
    public transactionsExpected?: number;

    public transactionsActual: number;
    public establishedConnectionsActual: number;
    public receivedMessagesActual: number;
    public averageLatency: number = 0;
    public totalLatency: number = 0;
    public maxLatency: number = 0;
    [key: string]: any; // Add index signature to allow indexing with a string parameter

    constructor(public serverType: string,
        public topicCount: number,
        public publishersPerTopic: number,
        public subscribersPerTopic: number,
        public runTime: number,
        public publishPerSecond: number) {
        this.receivedMessagesActual = 0;
        this.establishedConnectionsActual = 0;
        this.transactionsActual = 0;
        this.transactionsExpected = this.runTime * this.publishPerSecond * this.publishersPerTopic * this.topicCount;
        this.establishedConnectionsExpected = this.topicCount * Math.max(this.subscribersPerTopic, this.publishersPerTopic);
    }

    public toString(): string {
        this.receivedMessagesExpected = this.transactionsActual * Math.max(this.subscribersPerTopic, this.publishersPerTopic);
        this.averageLatency = this.totalLatency / this.receivedMessagesActual;
        const properties = this.headers();
        const values = properties.map(property => this[property]);
        return values.join(",");
    }
    public headers(): string[]{
        return headers;
    }
}

export class ServerTester{
    private server?: webSocketServer;
    private transactions: number = 0;
    private establishedConnections: number = 0;
    private printInterval?: exactInterval;
    private publishInteval?: exactInterval;
    private publishers: Publisher[] = [];
    private clients: webSocketClient[] = [];
    private subscribersPerTopic: number = 0;
    private Printer: Printable = new Printer();
    private mutex = new Mutex();
    private receivedMessages: number = 0;
    private totalLatency: number = 0;
    private maxLatency: number = 0;
    private testCase: TestCase = new TestCase("", 0, 0, 0, 0, 0);
    private validTopic = "";

    constructor(private serverBuilder: (Printable: Printable) => webSocketServer,
        private clientBuilder: (Printable: Printable, shareOfInterest: string) => webSocketClient
    ) {
    }

    private startServerPrints(): void {
        if (this.printInterval) {
            this.printInterval.stop();
        }
        this.printInterval = new exactInterval(async () => {
            this.mutex.runExclusive(async () => {
                this.transactions = 0;
            });
        }, 1000);
    }

    private startClientPrints(): void {
        if (this.printInterval) {
            this.printInterval.stop();
        }
        this.printInterval = new exactInterval(async () => {
            this.Printer.printClientData(
                this.transactions,
                this.publishers.length * this.testCase?.publishPerSecond,
                this.receivedMessages,
                this.transactions * this.subscribersPerTopic,
                this.clients.length);
            this.aggregateResults();
        }, 1000);
    }

    private aggregateResults(): void {
        this.mutex.runExclusive(async () => {
            this.testCase.transactionsActual += this.transactions;
            this.testCase.receivedMessagesActual += this.receivedMessages;
            this.testCase.establishedConnectionsActual = Math.max(this.testCase.establishedConnectionsActual, this.clients.length);
            this.testCase.totalLatency += this.totalLatency;
            this.testCase.maxLatency = Math.max(this.testCase.maxLatency, this.maxLatency);
            this.transactions = 0;
            this.receivedMessages = 0;
            this.totalLatency = 0;
        });
    }

    public startServer(): void {
        this.server = this.serverBuilder(this.Printer);
        this.server.onConnect(() => {
            createFile(watcherFilePath);
            this.startServerPrints();
        });
        this.server.onMessage((topic: string, message: string) => {
            if (topic.startsWith('disconnect/')) {
                this.establishedConnections--;
                return;
            }
            if (topic == 'sub') {
                this.establishedConnections++;
                return;
            }
            this.transactions++;
            this.server?.sendToTopic(topic, message);
        });
        this.server.startServer();
    }
    public buildClient(topic: string, isPublisher: boolean) {
        const client = this.clientBuilder(this.Printer, topic);
        client.onConnect(() => {
            this.establishedConnections++;
            if (isPublisher) {
                this.publishers.push(new Publisher(client, topic));
            }
        });
        client.onMessage((_topic: string, _message: string) => {
            let sentAt: any = _message;
            this.receivedMessages++;
            const latency = Date.now() - sentAt;
            this.totalLatency += latency;
            this.maxLatency = Math.max(this.maxLatency, latency);

        });
        client.connect();
        this.clients.push(client);
    }

    public startClientsForTopic(publishers: number, topic: string): void {
        const totalConnection = Math.max(publishers, this.subscribersPerTopic);
        for (let id = 0; id < totalConnection; id++) {
            this.buildClient(topic, id < publishers);
        }
    }

    public async startClients(testCase: TestCase) {
        this.validTopic = Math.random().toString(36).substring(2, 15);
        this.testCase = testCase;
        this.subscribersPerTopic = Math.max(testCase.publishersPerTopic, testCase.subscribersPerTopic);
        for (let topicId = 0; topicId < testCase.topicCount; topicId++) {
            this.startClientsForTopic(testCase.publishersPerTopic, `topic_${topicId}_${this.validTopic}`);
        }
        this.startClientPrints();
        this.startPublishing();
        return new Promise<void>((resolve, _reject) => {
            setTimeout(() => {
                this.stop();
                this.aggregateResults();
                resolve();
            }, testCase.runTime * 1000);
        });
    }
    public stop(): void {
        if (this.printInterval) {
            this.printInterval.stop();
        }
        if (this.publishInteval) {
            this.publishInteval.stop();
        }
        if (this.clients) {
            this.publishers = [];
            for (const connection of this.clients) {
                connection.disconnect();
            }
        }
        if (this.server) {
            this.server.stop();
        }
    }

    public startPublishing(): void {
        if (this.publishInteval) {
            this.publishInteval.stop();
        }
        this.publishInteval = new exactInterval(async () => {
            for (const trader of this.publishers) {
                this.mutex.runExclusive(async () => {
                    this.transactions++;
                });
                trader.publish();
            }
        }, 1000 / this.testCase.publishPerSecond);
    }
}