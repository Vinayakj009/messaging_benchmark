import { Printable, Publishable, Server, webSocketClient, webSocketServer } from "./interfaces";
import { Printer } from "./printer";
import { Mutex } from 'async-mutex';

class Trader {
    constructor(private client: Publishable, private shareOfInterest: string) {
    }
    public publish(): void {
        const topic = Math.random() > 0.5 ? 'buy' : 'sell';
        this.client.publish(topic, this.shareOfInterest);
    }
}



export class ServerTester implements Server {
    private server: webSocketServer;
    private transactions: number = 0;
    private establishedConnections: number = 0;
    private receivedMessages = 0;
    private topics: { [key: string]: number } = {
    };
    private printInterval: NodeJS.Timeout;
    private publishInteval: NodeJS.Timeout;
    private traders: Trader[] = [];
    private clients: webSocketClient[] = [];
    private subscribersPerTopic: number = 0;
    private Printer: Printable = new Printer();
    private mutex = new Mutex();


    constructor(private serverBuilder: (Printable: Printable) => webSocketServer,
        private clientBuilder: (Printable: Printable, shareOfInterest: string) => webSocketClient,
        private publishPerSecond: number = 1000
    ) {
    }

    private startServerPrints(): void {
        if (this.printInterval) {
            clearInterval(this.printInterval);
        }
        this.printInterval = setInterval(() => {
            this.Printer.printServerData(this.transactions, this.establishedConnections, this.topics);
            this.mutex.runExclusive(async () => {
                this.transactions = 0;
            });
        }, 1000);
    }

    private startClientPrints(): void {
        if (this.printInterval) {
            clearInterval(this.printInterval);
        }
        this.printInterval = setInterval(() => {
            let last = Date.now();
            this.Printer.printClientData(
                this.transactions,
                this.traders.length * this.publishPerSecond,
                this.receivedMessages,
                this.transactions * this.subscribersPerTopic,
                this.clients.length);
            this.mutex.runExclusive(async () => {
                this.transactions = 0;
                this.receivedMessages = 0;
            });
            last = Date.now();
        }, 1000);
    }

    public startServer(): void {
        this.server = this.serverBuilder(this.Printer);
        this.server.onConnect(() => {
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
            this.receivedMessages++;
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

    public startClients(topics: number, publishersPerTopic: number, subscribersPerTopic: number): void {
        this.subscribersPerTopic = Math.max(publishersPerTopic, subscribersPerTopic);
        for (let topicId = 0; topicId < topics; topicId++) {
            this.startClientsForTopic(publishersPerTopic, `topic_${topicId}`);
        }
        this.startClientPrints();
        this.startPublishing();
    }
    public stop(): void {
        if (this.printInterval) {
            clearInterval(this.printInterval);
        }
        if (this.publishInteval) {
            clearInterval(this.publishInteval);
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
            clearInterval(this.publishInteval);
        }

        this.publishInteval = setInterval(() => {
            for (const trader of this.traders) {
                this.mutex.runExclusive(async () => {
                    this.transactions++;
                });
                trader.publish();
            }
        }, 1000 / this.publishPerSecond);
    }
}