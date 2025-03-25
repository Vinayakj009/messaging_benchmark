/* Simplified stock exchange made with expressWs pub/sub */
import { Server, ServerWebSocket } from 'bun';
import { webSocketClient, webSocketServer } from './interfaces';

import { WebSocket } from 'ws';

export class BunWSClient implements webSocketClient {
    private socket?: WebSocket;
    private clientId: string = `bun_${Math.random().toString(16).slice(3)}`;
    private onConnectCallback?: () => void;
    private messageCallback?: (topic: string, message: string) => void;
    constructor(_printable: {
        printStatus(message: string): void;
    }, private topic: string, private host: string, private port: number, private protocol: string) {
    }
    connect(): void {
        this.socket = new WebSocket(`${this.protocol}://${this.host}:${this.port}/ws?id=${this.clientId}`);
        this.socket.onopen = () => {
            this.socket?.send(JSON.stringify({ topic: 'sub', message: this.topic }))
            if (!this.onConnectCallback) {
                return;
            }
            this.onConnectCallback();
        }
        this.socket.onmessage = (event) => {
            if (!this.messageCallback) {
                return;
            }
            this.messageCallback(this.topic, event.data.toString());
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

export class BunWSServer implements webSocketServer {
    private server: Server;
    private messageCallback?: (topic: string, message: string) => void;
    private onConnectCallback?: () => void;

    constructor(_printable: {
        printStatus(message: string): void;
    }, _host: string, private port: number, _protocol: string) {
        this.server = Bun.serve<{ id: string }>({
            fetch: (_req, _server) => { },
            websocket: {
                open: (_ws: ServerWebSocket<{ id: string }>) => { },
                message: (_ws: ServerWebSocket<{ id: string }>, _data: string) => { },
                close: (_ws: ServerWebSocket<{ id: string }>) => { }
            }
        });
    }
    public onConnect(callback: () => void): void {
        this.onConnectCallback = callback;
    }
    public onMessage(callback: (topic: string, message: string) => void): void {
        this.messageCallback = callback;
    }
    public sendToTopic(topic: string, message: string): void {
        this.server.publish(topic, message);
    }
    public stop(): void {
        this.server.stop();
    }
    public startServer(): void {
        const webSocketHandler = {
            open: (ws: ServerWebSocket<{ id: string }>) => {
                if (!this.messageCallback) {
                    return;
                }
                this.messageCallback("sub", ws.data.id);
            },
            message: (ws: ServerWebSocket<{ id: string }>, data: string) => {
                const { topic, message } = JSON.parse(data);
                if (topic == "sub") {
                    ws.subscribe(message);
                }
                if (!this.messageCallback) {
                    return;
                }
                this.messageCallback(topic, message);
            },
            close: (ws: ServerWebSocket<{ id: string }>) => {
                if (!this.messageCallback) {
                    return;
                }
                this.messageCallback("disconnect/", ws.data.id);
            }
        };
        this.server = Bun.serve<{ id: string }>({
            port: this.port,
            fetch(req, server) {
                const url = new URL(req.url);
                console.log(`fetch ${url.pathname}`);
                if (url.pathname === "/ws") {
                    console.log(`upgrade!`);
                    const id = url.searchParams.get("id");
                    const success = server.upgrade(req, { data: { id } });
                    return success
                        ? undefined
                        : new Response("WebSocket upgrade error", { status: 400 });
                }

                return new Response("Hello world");
            },
            websocket: webSocketHandler,
        });
        if(!this.onConnectCallback){
            return;
        }
        this.onConnectCallback();
    }
}
