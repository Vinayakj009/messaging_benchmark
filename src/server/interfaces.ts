export * from "./implementations/interfaces";
export interface Printable {
    printServerData(transactionsPerSecond: number, activeSubscribers: number, shares: { [key: string]: number }): void;
    printClientData(
        sentTransactionsPerSecond: number,
        expectedTransactionsPerSecond: number,
        receivedTransactionsPerSecond: number,
        expectedReceivedTransactionsPerSecond: number,
        clients: number): void;
    printStatus(message: string): void;
    onDisconnect(): void;
}

export interface Server {
    startServer(): void;
    startClients(topics: number, publishers: number, subscribersPerPublisher: number): void;
    stop(): void;
}

export interface Publishable {
    publish(topic: string, message: string): void;
}
