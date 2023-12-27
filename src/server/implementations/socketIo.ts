/* Simplified stock exchange made with mqtt pub/sub */
import { Server } from 'socket.io';
import { io,Socket } from 'socket.io-client';
import { webSocketClient, webSocketServer } from './interfaces';

export class SocketIoClient implements webSocketClient {
    private socket: Socket;
    private clientId: string = `mqtt_${Math.random().toString(16).slice(3)}`;
    private onConnectCallback: () => void;
    private messageCallback: (topic: string, message: string) => void;
    constructor(private printable: {
        printStatus(message: string): void;
    }, private shreOfInterest: string, private host: string, private port: number, private protocol: string) {
    }
    connect(): void {
        this.socket = io(`${this.protocol}://${this.host}:${this.port}`);
        this.socket.on('connect', () => {
            this.socket.send(JSON.stringify({
                topic: 'sub',
                message: this.shreOfInterest
            }));
            this.socket.on(this.shreOfInterest, (message) => {
                let json = JSON.parse(message);
                if (!this.messageCallback) {
                    return;
                }
                this.messageCallback(json.topic, json.message);
                
            });
            if(!this.onConnectCallback) {
                return;
            }
            this.onConnectCallback();
        });
        this.socket.on('message', (topic: string, buffer: Buffer) => {
            if (!this.messageCallback) {
                return;
            }
            this.messageCallback(topic, buffer.toString());
        });
    }
    disconnect(): void {
        this.socket.close();
    }
    publish(topic: string, message: string): void {
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

export class SocketIoServer implements webSocketServer {
    private server: Server;
    private messageCallback: (topic: string, message: string) => void;
    private onConnectCallback: () => void;
    constructor(private printable: {
        printStatus(message: string): void;
    }, private host: string, private port: number, private protocol: string) {
    }
    public onConnect(callback: () => void): void {
        this.onConnectCallback = callback;
    }
    public onMessage(callback: (topic: string, message: string) => void): void {
        this.messageCallback = callback;
    }
    public sendToTopic(topic: string, message: string): void {
        this.server.emit(topic, message);
    }
    public stop(): void {
        this.server.close();
    }
    public startServer(): void {
        this.server = new Server();
        this.server.on('connection', (socket) => {
            socket.on('message', (message) => {
                let json = JSON.parse(message);
                if (json.topic === 'sub') {
                    socket.join(json.message);
                }
                if (!this.messageCallback) {
                    return;
                }
                this.messageCallback(json.topic, json.message);
            });
        });
        if (!this.onConnectCallback) {
            return;
        }
        this.onConnectCallback();
        this.server.listen(this.port);
    }
}
