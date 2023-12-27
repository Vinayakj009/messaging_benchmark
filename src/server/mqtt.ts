/* Simplified stock exchange made with mqtt pub/sub */
import mqtt from 'mqtt'
import { Printable, Publishable, Server, webSocketClient, webSocketServer } from './interfaces';
import { Printer } from './printer';


class MqttClient implements webSocketClient {
    private client: mqtt.MqttClient;
    private clientId: string = `mqtt_${Math.random().toString(16).slice(3)}`;
    private onConnectCallback: () => void;
    private messageCallback: (topic: string, message: string) => void;
    constructor(private printable: {
        printStatus(message: string): void;
    }, private shreOfInterest : string) {
    }
    connect(url: string): void{
        this.client = mqtt.connect(
            url,
            {
                clientId: this.clientId,
                clean: true,
                connectTimeout: 4000,
                reconnectPeriod: 1000,
                will: {
                    topic: `disconnect/${this.clientId}`,
                    payload: Buffer.from(this.clientId),
                    qos: 0,
                    retain: false
                }
            }
        );
        this.client.on('connect', () => {
            this.client.subscribe([this.shreOfInterest], () => {
                this.printable.printStatus(`Client : ${this.clientId} ,Subscribed to ${this.shreOfInterest}`);
                this.client.publish('sub', this.clientId);
                if (!this.onConnectCallback) {
                    return;
                }
                this.onConnectCallback();
            });
        });
        this.client.on('message', (topic: string, buffer: Buffer) => {
            if (!this.messageCallback) {
                return;
            }
            this.messageCallback(topic, buffer.toString());
        });
    }
    disconnect(): void{
        this.client.end();
    }
    publish(topic: string, message: string): void{
        this.client.publish(topic, message);
    }
    onMessage(callback: (topic: string, message: string) => void): void{
        this.messageCallback = callback;
    }
    onConnect(callback: () => void): void{
        this.onConnectCallback = callback;
    }
}
class MqttServer implements webSocketServer{
    private client: mqtt.MqttClient;
    private messageCallback: (topic: string, message: string) => void;
    private onConnectCallback: () => void;
    constructor(private printable: {
        printStatus(message: string): void;
    }) {
    }
    public onConnect(callback: () => void): void {
        this.onConnectCallback = callback;
    }
    public onMessage(callback: (topic: string, message: string) => void): void {
        this.messageCallback = callback;
    }
    public sendToTopic(topic: string, message: string): void {
        this.client.publish(topic, message);
    }
    public stop(): void {
        this.client.end();
    }
    public startServer(url: string): void{
        this.client = mqtt.connect(
            url,
            {
                clientId: `mqtt_a`,
                clean: true,
                connectTimeout: 4000,
                reconnectPeriod: 1000,
            }
        );
        this.client.on('connect', () => {
            this.client.subscribe(["buy", "sell", "sub", "disconnect/+"], () => {
                this.printable.printStatus(`Subscribed to topic "buy" and "sell" success`);
                if (!this.onConnectCallback) {
                    return;
                }
                this.onConnectCallback();
            });
        });
        this.client.on('message', (topic: string, buffer: Buffer) => {
            if (!this.messageCallback) {
                return;
            }
            this.messageCallback(topic, buffer.toString());
        })
    }
}

export { MqttServer, MqttClient };
