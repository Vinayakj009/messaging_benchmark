import { Printable } from "./interfaces";


export class Printer implements Printable {
    printServerData(transactionsPerSecond: number, activeSubscribers: number, shares: { [key: string]: number }): void {
        console.log("Transactions per second: ", transactionsPerSecond);
        console.log("Active subscribers: ", activeSubscribers);
        console.log("Here are the curret shares:", shares);
    }

    printClientData(
        sentTransactionsPerSecond: number,
        expectedTransactionsPerSecond: number,
        receivedTransactionsPerSecond: number,
        expectedReceivedTransactionsPerSecond: number,
        clients: number): void {
        console.log("Transactions sent per second: ", sentTransactionsPerSecond,
            " expected: ", expectedTransactionsPerSecond,
            " effeciency: ", sentTransactionsPerSecond * 100 / expectedTransactionsPerSecond);
        console.log("Transactions received per second: ", receivedTransactionsPerSecond,
            " expected: ", expectedReceivedTransactionsPerSecond,
            " effeciency: ", receivedTransactionsPerSecond * 100 / expectedReceivedTransactionsPerSecond);
        console.log("Clients ", clients);
    }

    printStatus(message: string): void {
        console.log("Status", message);
    }

    onDisconnect(): void {
        // Implementation goes here
    }
}