/* Simplified stock exchange made with expressWs pub/sub */
import { webSocketClient, webSocketServer } from './interfaces';
import { WebSocket as socket } from 'ws';
import ws from "ws";
import express from 'express'
import expressWs from 'express-ws'


export class ExpressWSClient implements webSocketClient {
    private socket?: socket;
    private onConnectCallback?: () => void;
    private messageCallback?: (topic: string, message: string) => void;
    constructor(_printable: {
        printStatus(message: string): void;
    }, private shreOfInterest: string, private host: string, private port: number, private protocol: string) {
    }
    connect(): void {
        this.socket = new socket(`${this.protocol}://${this.host}:${this.port}`);
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

export class ExpressWSServer implements webSocketServer {
    private server: expressWs.Instance;
    private messageCallback?: (topic: string, message: string) => void;
    private onConnectCallback?: () => void;
    private subscriptions: {
        [key: string]: ws[]
    } = {};

    constructor(private printable: {
        printStatus(message: string): void;
    }, _host: string, private port: number, _protocol: string) {
        var app = express();
        this.server = expressWs(app);
    }
    public onConnect(callback: () => void): void {
        this.onConnectCallback = callback;
    }
    public onMessage(callback: (topic: string, message: string) => void): void {
        this.messageCallback = callback;
    }
    public sendToTopic(topic: string, message: string): void {
        const removables: {
            [prop: string]: ws[]
        } = {};
        this.subscriptions[topic].forEach((subscriber) => {
            try {
                subscriber.send(JSON.stringify({
                    topic: topic,
                    message: message
                }));
        } catch (error) {
                this.printable.printStatus(`Error sending message to ${topic}`);
                removables[topic] = removables[topic] || [];
                removables[topic].push(subscriber);
        }
        });  
        for (const topic in removables) {
            this.subscriptions[topic] = this.subscriptions[topic].filter((sub) => !removables[topic].includes(sub));
        }
    }
    public stop(): void {
    }
    public startServer(): void {
        this.server.app.ws('/', (ws, _req) => {
            ws.on('message', (message) => {
                let json = JSON.parse(message.toString());
                if (json.topic === 'sub') {
                    this.subscriptions[json.message] = this.subscriptions[json.message] || [];
                    this.subscriptions[json.message].push(ws);
                }
                if (!this.messageCallback) {
                    return;
                }
                this.messageCallback(json.topic, json.message);
            });
        });
        this.server.app.listen(this.port, () => {
            this.printable.printStatus(`Server started on port ${this.port}`);
            if (!this.onConnectCallback) {
                return;
            }
            this.onConnectCallback();
        });
    }
}
