export interface webSocketClient {
    connect(): void;
    disconnect(): void;
    publish(topic: string, message: string): void;
    onMessage(callback: (topic: string, message: string) => void): void;
    onConnect(callback: () => void): void;
}

export interface webSocketServer {
    startServer(): void;
    stop(): void;
    sendToTopic(topic: string, message: string): void;
    onMessage(callback: (topic: string, message: string) => void): void;
    onConnect(callback: () => void): void;
}
