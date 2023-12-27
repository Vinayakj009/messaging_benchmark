import { Printable, Publishable, Server, webSocketClient, webSocketServer } from "./interfaces";
import { Printer } from "./printer";

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
    private shares: { [key: string]: number } = {
    };
    private printInterval: NodeJS.Timeout;
    private publishInteval: NodeJS.Timeout;
    private traders: Trader[] = [];
    private clients: webSocketClient[] = [];
    private Printer: Printable = new Printer();


    constructor(private serverBuilder: (Printable: Printable) => webSocketServer,
        private clientBuilder: (Printable: Printable, shareOfInterest: string) => webSocketClient) {
        this.Printer = new Printer();
    }

    private startServerPrints(): void {
        if (this.printInterval) {
            clearInterval(this.printInterval);
        }
        this.printInterval = setInterval(() => {
            this.Printer.printServerData(this.transactions, this.establishedConnections, this.shares);
            this.transactions = 0;
        }, 1000);
    }

    private startClientPrints(): void {
        if (this.printInterval) {
            clearInterval(this.printInterval);
        }
        this.printInterval = setInterval(() => {
            let last = Date.now();
            const transactionsPerSecond = this.transactions / ((Date.now() - last) * 0.001);
            const receivedMessagesPerSecond = this.receivedMessages / ((Date.now() - last) * 0.001);
            this.Printer.printClientData(this.transactions, this.receivedMessages, this.transactions * this.clients.length / this.traders.length, this.clients.length);
            this.transactions = 0;
            this.receivedMessages = 0;
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
                    this.shares[message] = this.shares[message] || 1;

                    /* For simplicity, shares increase 0.1% with every buy */
                    this.shares[message] *= 1.001;

                    /* Value of share has changed, update subscribers */
                    this.server.sendToTopic(message, JSON.stringify({ [message]: this.shares[message] }));
                    break;
                }
                case 'sell': {
                    this.transactions++;
                    this.shares[message] = this.shares[message] || 1;

                    /* For simplicity, shares decrease 0.1% with every sale */
                    this.shares[message] *= 0.999

                    this.server.sendToTopic(message, JSON.stringify({ [message]: this.shares[message] }));
                    break;
                }
            }
        });
        this.server.startServer();
    }

    public startClients(publishers: number, subscribersPerPublisher: number): void {
        for (let publisherId = 0; publisherId < publishers; publisherId++) {
            for (let subscriberId = 0; subscriberId < subscribersPerPublisher; subscriberId++) {
                const client = this.clientBuilder(this.Printer, `share_${publisherId}`);
                client.onConnect(() => {
                    this.establishedConnections++;
                });
                client.onMessage((topic: string, message: string) => {
                    this.receivedMessages++;
                });
                client.connect();
                this.clients.push(client);
                if (subscriberId == 0) {
                    this.traders.push(new Trader(client, `share_${publisherId}`));
                }
            }
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
                this.transactions++;
                trader.publish();
            }
        }, 1);
    }
}