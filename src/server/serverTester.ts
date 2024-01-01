import { Printable, Publishable, webSocketClient, webSocketServer } from "./interfaces";
import { Printer } from "./printer";
import { Mutex } from 'async-mutex';
import { access, writeFile, constants }  from 'fs';

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
    return new Promise((resolve, reject) => {
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



class Trader {
    constructor(private client: Publishable, private shareOfInterest: string) {
    }
    public async publish() {
        const topic = Math.random() > 0.5 ? 'buy' : 'sell';
        this.client.publish(topic, this.shareOfInterest);
    }
}

class exactInterval {
    private nextStartTime = Date.now();
    private timeout: NodeJS.Timeout;
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

export class TestCase {
    private receivedMessagesExpected: number;
    private establishedConnectionsExpected: number;
    private transactionsExpected: number;

    public transactionsActual: number;
    public establishedConnectionsActual: number;
    public receivedMessagesActual: number;

    constructor(public topicCount: number,
    public publishersPerTopic: number,
    public subscribersPerTopic: number,
    public runTime: number){
        this.receivedMessagesActual = 0;
        this.establishedConnectionsActual = 0;
        this.transactionsActual = 0;
        this.receivedMessagesExpected = this.runTime * 10 * this.topicCount * this.subscribersPerTopic;
        this.transactionsExpected = this.runTime * 10 * this.publishersPerTopic;
        this.establishedConnectionsExpected = this.topicCount * Math.max(this.subscribersPerTopic, this.publishersPerTopic);
    }
    public toString(): string {
        const properties = Object.keys(this);
        const values = properties.map(property => this[property]);
        return values.join(",");
    }
    public headers(): string[]{
        return Object.keys(this);
    }
    
    public printTestCase(): void {

    }
}

export class ServerTester{
    private server: webSocketServer;
    private transactions: number = 0;
    private establishedConnections: number = 0;
    private topics: { [key: string]: number } = {
    };
    private printInterval: exactInterval;
    private publishInteval: exactInterval;
    private traders: Trader[] = [];
    private clients: webSocketClient[] = [];
    private subscribersPerTopic: number = 0;
    private Printer: Printable = new Printer();
    private mutex = new Mutex();
    private receivedMessages:number = 0;
    private testCase: TestCase;

    constructor(private serverBuilder: (Printable: Printable) => webSocketServer,
        private clientBuilder: (Printable: Printable, shareOfInterest: string) => webSocketClient,
        private publishPerSecond: number = 1000
    ) {
    }

    private startServerPrints(): void {
        if (this.printInterval) {
            this.printInterval.stop();
        }
        this.printInterval = new exactInterval(async () => {
            this.Printer.printServerData(this.transactions, this.establishedConnections, this.topics);
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
            let last = Date.now();
            this.Printer.printClientData(
                this.transactions,
                this.traders.length * this.publishPerSecond,
                this.receivedMessages,
                this.transactions * this.subscribersPerTopic,
                this.clients.length);
            this.aggregateResults();
            last = Date.now();
        }, 1000);
    }

    private aggregateResults(): void {
        this.mutex.runExclusive(async () => {
            this.testCase.transactionsActual += this.transactions;
            this.testCase.establishedConnectionsActual += this.clients.length;
            this.testCase.receivedMessagesActual += this.receivedMessages;
            this.testCase.establishedConnectionsActual = Math.max(this.testCase.establishedConnectionsActual, this.clients.length);
            this.transactions = 0;
            this.receivedMessages = 0;
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
            switch (topic) {
                case 'sub': {
                    this.establishedConnections++;
                    break;
                }
                case 'buy': {
                    this.transactions++;
                    this.topics[message] = this.topics[message] || 1;

                    /* For simplicity, shares increase 0.1% with every buy */
                    this.topics[message] *= 1.001;

                    /* Value of share has changed, update subscribers */
                    this.server.sendToTopic(message, JSON.stringify({ [message]: this.topics[message] }));
                    break;
                }
                case 'sell': {
                    this.transactions++;
                    this.topics[message] = this.topics[message] || 1;

                    /* For simplicity, shares decrease 0.1% with every sale */
                    this.topics[message] *= 0.999

                    this.server.sendToTopic(message, JSON.stringify({ [message]: this.topics[message] }));
                    break;
                }
            }
        });
        this.server.startServer();
    }
    public buildClient(topic: string, isTrader: boolean) {
        const client = this.clientBuilder(this.Printer, topic);
        client.onConnect(() => {
            this.establishedConnections++;
            if (isTrader) {
                this.traders.push(new Trader(client, topic));
            }
        });
        client.onMessage((topic: string, message: string) => {
            this.mutex.runExclusive(async () => {
                this.receivedMessages++;
            });
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
        this.testCase = testCase;
        this.subscribersPerTopic = Math.max(testCase.publishersPerTopic, testCase.subscribersPerTopic);
        for (let topicId = 0; topicId < testCase.topicCount; topicId++) {
            this.startClientsForTopic(testCase.publishersPerTopic, `topic_${topicId}`);
        }
        this.startClientPrints();
        this.startPublishing();
        return new Promise<void>((resolve, reject) => {
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
            this.traders = [];
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
            for (const trader of this.traders) {
                this.mutex.runExclusive(async () => {
                    this.transactions++;
                });
                trader.publish();
            }
        }, 1000 / this.publishPerSecond);
    }
}