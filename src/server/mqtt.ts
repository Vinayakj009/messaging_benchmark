/* Simplified stock exchange made with mqtt pub/sub */
import mqtt from 'mqtt'

interface Printable {
    printServerData(transactionsPerSecond: number, activeSubscribers: number, shares: { [key: string]: number }): void;
    printClientData(sentTransactionsPerSecond: number, receivedTransactionsPerSecond: number, expected: number, clients: number): void;
    printStatus(message: string): void;
    onDisconnect(): void;
}

interface Server {
    startServer(): void;
    startClients(publishers: number, subscribersPerPublisher: number): void;
    stop(): void;
}


class Trader{
    constructor(private client: Publishable, private shareOfInterest: string) {
    }
    public publish(): void {
        const topic = Math.random() > 0.5 ? 'buy' : 'sell';
        this.client.publish(topic, this.shareOfInterest);
    }
}

interface Publishable {
    publish(topic: string, message: string): void;
}

interface webSocketClient {
    connect(url: string): void;
    disconnect(): void;
    publish(topic: string, message: string): void;
    onMessage(callback: (topic: string, message: string) => void): void;
    onConnect(callback: () => void): void;
}


class MqttClient implements webSocketClient {
    private client: mqtt.MqttClient;
    private clientId: string = `mqtt_${Math.random().toString(16).slice(3)}`;
    private onConnectCallback: () => void;
    private messageCallback: (topic: string, message: string) => void;
    constructor(private printable: {
        printStatus(message: string): void;
    }, private shreOfInterest : string) {
    }
    connect(url: string): void{
        this.client = mqtt.connect(
            url,
            {
                clientId: this.clientId,
                clean: true,
                connectTimeout: 4000,
                reconnectPeriod: 1000,
                will: {
                    topic: `disconnect/${this.clientId}`,
                    payload: Buffer.from(this.clientId),
                    qos: 0,
                    retain: false
                }
            }
        );
        this.client.on('connect', () => {
            this.client.subscribe([this.shreOfInterest], () => {
                this.printable.printStatus(`Client : ${this.clientId} ,Subscribed to ${this.shreOfInterest}`);
                this.client.publish('sub', this.clientId);
                if (!this.onConnectCallback) {
                    return;
                }
                this.onConnectCallback();
            });
        });
        this.client.on('message', (topic: string, buffer: Buffer) => {
            if (!this.messageCallback) {
                return;
            }
            this.messageCallback(topic, buffer.toString());
        });
    }
    disconnect(): void{
        this.client.end();
    }
    publish(topic: string, message: string): void{
        this.client.publish(topic, message);
    }
    onMessage(callback: (topic: string, message: string) => void): void{
        this.messageCallback = callback;
    }
    onConnect(callback: () => void): void{
        this.onConnectCallback = callback;
    }
}

interface webSocketServer {
    startServer(url: string): void;
    stop(): void;
    sendToTopic(topic: string, message: string): void;
    onMessage(callback: (topic: string, message: string) => void): void;
    onConnect(callback: () => void): void;
}

class MqttServer implements webSocketServer{
    private client: mqtt.MqttClient;
    private messageCallback: (topic: string, message: string) => void;
    private onConnectCallback: () => void;
    constructor(private printable: {
        printStatus(message: string): void;
    }) {
    }
    public onConnect(callback: () => void): void {
        this.onConnectCallback = callback;
    }
    public onMessage(callback: (topic: string, message: string) => void): void {
        this.messageCallback = callback;
    }
    public sendToTopic(topic: string, message: string): void {
        this.client.publish(topic, message);
    }
    public stop(): void {
        this.client.end();
    }
    public startServer(url: string): void{
        this.client = mqtt.connect(
            url,
            {
                clientId: `mqtt_a`,
                clean: true,
                connectTimeout: 4000,
                reconnectPeriod: 1000,
            }
        );
        this.client.on('connect', () => {
            this.client.subscribe(["buy", "sell", "sub", "disconnect/+"], () => {
                this.printable.printStatus(`Subscribed to topic "buy" and "sell" success`);
                if (!this.onConnectCallback) {
                    return;
                }
                this.onConnectCallback();
            });
        });
        this.client.on('message', (topic: string, buffer: Buffer) => {
            if (!this.messageCallback) {
                return;
            }
            this.messageCallback(topic, buffer.toString());
        })
    }
}

class Printer implements Printable {
    printServerData(transactionsPerSecond: number, activeSubscribers: number, shares: { [key: string]: number }): void {
        console.log("Transactions per second: " , transactionsPerSecond);
        console.log("Active subscribers: " , activeSubscribers);
        console.log("Here are the curret shares:", shares);
    }

    printClientData(sentTransactionsPerSecond: number, receivedTransactionsPerSecond: number, expected: number, clients: number): void {
        console.log("Transactions sent per second: " , sentTransactionsPerSecond);
        console.log("Transactions received per second : " , receivedTransactionsPerSecond);
        console.log("Expected " , expected);
        console.log("Clients " , clients);
    }

    printStatus(message: string): void {
        // Implementation goes here
    }

    onDisconnect(): void {
        // Implementation goes here
    }
}

class TestServer implements Server {
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
        private clientBuilder: (Printable: Printable, shareOfInterest: string) => webSocketClient,
        private url: string) {
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
        this.server.startServer(this.url);
    }

    public startClients(publishers: number, subscribersPerPublisher: number): void {
        for (let publisherId = 0; publisherId < publishers; publisherId++) {
            for(let subscriberId = 0; subscriberId < subscribersPerPublisher; subscriberId++) {
                const client = this.clientBuilder(this.Printer, `share_${publisherId}`);
                client.onConnect(() => {
                    this.establishedConnections++;
                });
                client.onMessage((topic: string, message: string) => {
                    this.receivedMessages++;
                });
                client.connect(this.url);
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

export { TestServer as ServerTester, MqttServer, Printable, MqttClient };
