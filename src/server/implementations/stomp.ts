/* Simplified stock exchange made with mqtt pub/sub */
import { WebSocket } from 'ws';
import { webSocketClient, webSocketServer } from './interfaces';
import { Client, Stomp } from '@stomp/stompjs'

Stomp.WebSocketClass = WebSocket;

export class stompClient implements webSocketClient {
    private onConnectCallback?: () => void;
    private messageCallback?: (topic: string, message: string) => void;
    private client?: Client;
    constructor(_printable: {
        printStatus(message: string): void;
    }, private shreOfInterest: string, private host: string, private port: number, private protocol: string) {
        
    }
    connect(): void {
        this.client = Stomp.client(`${this.protocol}://${this.host}:${this.port}/ws`);
        this.client.debug = (_message) => {
        };
        this.client.onConnect = () => { 
            this.client?.subscribe(`/${this.shreOfInterest}`, (message) => {
                if (!this.messageCallback) {
                    return;
                }
                this.messageCallback(this.shreOfInterest, message.body);
            });
            this.client?.publish({destination: '/sub', body: ''});
            if (!this.onConnectCallback) {
                return;
            }
            this.onConnectCallback();
        }
        this.client.activate();
    }
    disconnect(): void {
        this.client?.deactivate();
    }
    publish(topic: string, message: string): void {
        this.client?.publish({ destination: `/${topic}`, body: message });
    }
    onMessage(callback: (topic: string, message: string) => void): void {
        this.messageCallback = callback;
    }
    onConnect(callback: () => void): void {
        this.onConnectCallback = callback;
    }
}

export class stompServer implements webSocketServer {
    private messageCallback?: (topic: string, message: string) => void;
    private onConnectCallback?: () => void;
    private client: Client;
    constructor(private printable: {
        printStatus(message: string): void;
    }, private host: string, private port: number, private protocol: string) {
        this.client = new Client();
    }
    public onConnect(callback: () => void): void {
        this.onConnectCallback = callback;
    }
    public onMessage(callback: (topic: string, message: string) => void): void {
        this.messageCallback = callback;
    }
    public sendToTopic(topic: string, message: string): void {
        this.client.publish({ destination: `/${topic}`, body: message });
    }
    public stop(): void {
        this.client.deactivate();
    }
    public startServer(): void {
        this.client = Stomp.client(`${this.protocol}://${this.host}:${this.port}/ws`);
        // this.client.debug = (_message) => {
        // };
        this.client.onConnect = () => {
            this.printable.printStatus('Connected to stomp server');
            this.client.subscribe('/buy', (message) => {
                if (!this.messageCallback) {
                    return;
                }
                this.messageCallback('buy', message.body);
            });
            this.client.subscribe('/sell', (message) => {
                if (!this.messageCallback) {
                    return;
                }
                this.messageCallback('sell', message.body);
            });
            this.client.subscribe('/sub', (message) => {
                if (!this.messageCallback) {
                    return;
                }
                this.messageCallback('sub', message.body);
            });
            if (!this.onConnectCallback) {
                return;
            }
            this.onConnectCallback();
        }
        new Promise((resolve, _reject) => {

            this.client.onDisconnect = () => {
                resolve(0);
            }; 
        });
        this.client.activate();
    }
}
