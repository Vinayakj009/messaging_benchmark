import { App, TemplatedApp } from 'uWebSockets.js';
import { webSocketClient, webSocketServer } from './interfaces';

/* Simplified stock exchange made with mqtt pub/sub */
import { StringDecoder } from 'string_decoder';
import { WebSocket as socket } from 'ws';

const decoder = new StringDecoder('utf8');

export class uWebSocketClient implements webSocketClient {
    private socket?: socket;
    private onConnectCallback?: () => void;
    private messageCallback?: (topic: string, message: string) => void;
    constructor(_printable: {
        printStatus(message: string): void;
    }, private topic: string, private host: string, private port: number, private protocol: string) {
    }
    connect(): void {
        this.socket = new socket(`${this.protocol}://${this.host}:${this.port}`);
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

export class uWebSocketServer implements webSocketServer {
    private server?: TemplatedApp;
    private messageCallback?: (topic: string, message: string) => void;
    private onConnectCallback?: () => void;
    constructor(private printable: {
        printStatus(message: string): void;
    }, _host: string, private port: number, _protocol: string) {
    }
    public onConnect(callback: () => void): void {
        this.onConnectCallback = callback;
    }
    public onMessage(callback: (topic: string, message: string) => void): void {
        this.messageCallback = callback;
    }
    public sendToTopic(topic: string, message: string): void {
        this.server?.publish(topic, message);
    }
    public stop(): void {
    }
    public startServer(): void {
        this.server = App();
        this.server.ws('/*', {
            message: (ws, message, _isBinary) => {
                /* Parse JSON and perform the action */
                let json = JSON.parse(decoder.write(Buffer.from(message)));
                if (json.topic === 'sub') {
                    ws.subscribe(json.message);
                }
                if (!this.messageCallback) {
                    return;
                }
                this.messageCallback(json.topic, json.message);
            }
        }).listen(this.port, (listenSocket) => { 
            if (listenSocket) {
                this.printable.printStatus(`Listening to port ${this.port}`);
            }
            if (!this.onConnectCallback) {
                return;
            }
            this.onConnectCallback();
        });
    }
}
