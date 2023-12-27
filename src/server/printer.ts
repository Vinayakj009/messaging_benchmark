import { Printable } from "./interfaces";


export class Printer implements Printable {
    printServerData(transactionsPerSecond: number, activeSubscribers: number, shares: { [key: string]: number }): void {
        console.log("Transactions per second: ", transactionsPerSecond);
        console.log("Active subscribers: ", activeSubscribers);
        console.log("Here are the curret shares:", shares);
    }

    printClientData(sentTransactionsPerSecond: number, receivedTransactionsPerSecond: number, expected: number, clients: number): void {
        console.log("Transactions sent per second: ", sentTransactionsPerSecond);
        console.log("Transactions received per second : ", receivedTransactionsPerSecond);
        console.log("Expected ", expected);
        console.log("Clients ", clients);
    }

    printStatus(message: string): void {
        // Implementation goes here
    }

    onDisconnect(): void {
        // Implementation goes here
    }
}