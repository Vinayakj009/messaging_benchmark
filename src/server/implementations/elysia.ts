/* Simplified stock exchange made with expressWs pub/sub */
import { Elysia, t } from 'elysia';
import { webSocketClient, webSocketServer } from './interfaces';
import { WebSocket } from 'ws';


export class ElysiaClient implements webSocketClient {
    private socket?: WebSocket;
    private clientId: string = `bun_${Math.random().toString(16).slice(3)}`;
    private onConnectCallback?: () => void;
    private messageCallback?: (topic: string, message: string) => void;
    constructor(_printable: {
        printStatus(message: string): void;
    }, private shreOfInterest: string, private host: string, private port: number, private protocol: string) {
    }
    connect(): void {
        this.socket = new WebSocket(`${this.protocol}://${this.host}:${this.port}/ws?id=${this.clientId}`);
        this.socket.onopen = () => {
            this.socket?.send(JSON.stringify({ topic: 'sub', message: this.shreOfInterest }))
            if (!this.onConnectCallback) {
                return;
            }
            this.onConnectCallback();
        }
        this.socket.onmessage = (event) => {
            let json = JSON.parse(event.data.toString());
            if (!this.messageCallback) {
                return;
            }
            this.messageCallback(json.topic, json.message);
        }
    }
    disconnect(): void {
        this.socket?.close();
    }
    publish(topic: string, message: string): void {
        if (this.socket?.readyState !== 1) {
            return;
        }
        this.socket.send(JSON.stringify({
            topic,
            message
        }));
    }
    onMessage(callback: (topic: string, message: string) => void): void {
        this.messageCallback = callback;
    }
    onConnect(callback: () => void): void {
        this.onConnectCallback = callback;
    }
}

interface webSocket {
    data: {
        query: {
            id : string
        }
    },
    raw: {
        subscribe: (topic: string) => void
    },
    subscribe: (topic: string) => void
}

export class ElysiaServer implements webSocketServer {
    private server: Elysia;
    private messageCallback?: (topic: string, message: string) => void;
    private onConnectCallback?: () => void;

    constructor(_printable: {
        printStatus(message: string): void;
    }, _host: string, private port: number, _protocol: string) {
        this.server = new Elysia();
    }
    public onConnect(callback: () => void): void {
        this.onConnectCallback = callback;
    }
    public onMessage(callback: (topic: string, message: string) => void): void {
        this.messageCallback = callback;
    }
    public sendToTopic(topic: string, message: string): void {
        this.server.server?.publish(topic, message);
    }
    public stop(): void {
        this.server.stop();
    }
    public startServer(): void {
        const webSocketHandler = {
            body: t.String(),
            query: t.Object({ id: t.String() }),
            open: (ws: webSocket) => {
                if (!this.messageCallback) {
                    return;
                }
                this.messageCallback("sub", ws.data.query.id);
            },
            message: (ws: webSocket, data: string) => {
                const { topic, message } = JSON.parse(data);
                if (topic == "sub") {
                    ws.raw.subscribe(message);
                }
                if (!this.messageCallback) {
                    return;
                }
                this.messageCallback(topic, message);
            },
            close: (ws: webSocket) => {
                if (!this.messageCallback) {
                    return;
                }
                this.messageCallback("disconnect/", ws.data.query.id);
            }
        };
        this.server.ws("/ws", webSocketHandler);
        this.server.listen(this.port);
        if (!this.onConnectCallback) {
            return;
        }
        this.onConnectCallback();
    }
}
