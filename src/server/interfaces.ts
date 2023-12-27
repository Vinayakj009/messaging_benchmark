export interface Printable {
    printServerData(transactionsPerSecond: number, activeSubscribers: number, shares: { [key: string]: number }): void;
    printClientData(sentTransactionsPerSecond: number, receivedTransactionsPerSecond: number, expected: number, clients: number): void;
    printStatus(message: string): void;
    onDisconnect(): void;
}

export interface Server {
    startServer(): void;
    startClients(publishers: number, subscribersPerPublisher: number): void;
    stop(): void;
}

export interface Publishable {
    publish(topic: string, message: string): void;
}

export interface webSocketClient {
    connect(url: string): void;
    disconnect(): void;
    publish(topic: string, message: string): void;
    onMessage(callback: (topic: string, message: string) => void): void;
    onConnect(callback: () => void): void;
}

export interface webSocketServer {
    startServer(url: string): void;
    stop(): void;
    sendToTopic(topic: string, message: string): void;
    onMessage(callback: (topic: string, message: string) => void): void;
    onConnect(callback: () => void): void;
}
