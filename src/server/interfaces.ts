export * from "./implementations/interfaces";
export interface Printable {
    printClientData(
        sentTransactionsPerSecond: number,
        expectedTransactionsPerSecond: number,
        receivedTransactionsPerSecond: number,
        expectedReceivedTransactionsPerSecond: number,
        clients: number): void;
    printStatus(message: string): void;
    onDisconnect(): void;
}

export interface Publishable {
    publish(topic: string, message: string): void;
}
