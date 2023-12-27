/* NOTE: ws as client cannot even remotely stress uWebSockets.js,
 * however we don't care for ultra correctness here as
 * Socket.IO is so pointlessly slow anyways, we simply do not care */
const mqtt = require('mqtt')
const protocol = 'mqtt'
const host = 'mqtt-broker'
const port = '1883'

const connectUrl = `${protocol}://${host}:${port}`

/* By default we use 10% active traders, 90% passive watchers */
const numClients = 100;
const tradersFraction = 0.1;

/* 125 * 4 = 500, even though 4 instances cannot stress the server fully */
console.log("RUN 4 INSTANCES OF THIS CLIENT");

let shares = [
	'NFLX',
	'TSLA',
	'AMZN',
	'GOOG',
	'NVDA'
];

let transactionsPerSecond = 0;
let establishedConnections = 0;
let receivedMessages = 0;

function printData() {
	/* Print transactions per second */
	let last = Date.now();
	setInterval(() => {
		transactionsPerSecond /= ((Date.now() - last) * 0.001)
		console.log("Transactions per second: " + transactionsPerSecond + ", here are the current shares:");
		console.log("Established connections: " + establishedConnections);
		console.log("Received messages: " + receivedMessages);
		transactionsPerSecond = 0;
		receivedMessages = 0;
		last = Date.now();
	}, 1000);
}

const traders = [];

function establishConnections(isTrader, shareOfInterest) {
	const clientId = `mqtt_${Math.random().toString(16).slice(3)}`
	const client = mqtt.connect(connectUrl, {
		clientId,
		clean: true,
		connectTimeout: 4000,
		reconnectPeriod: 1000,
	})

	/* Current value of our share */
	let value;

	client.on('connect', () => {
		// console.log(`Connected to the MQTT broker`)
		establishedConnections++;
		client.on("message", (topic, message) => {
			receivedMessages++;
			let json = JSON.parse(message);

			/* Keep track of our one share value (even though current strategy doesn't care for value) */
			for (let share in json) {
				value = json[share];
			}
		});
		client.subscribe([`shares/${shareOfInterest}/value`], () => {
			// console.log(`Subscribed to topic share/+/value success`);
		});
		if (!isTrader) {
			return;
		}
		traders.push({
			client,
			shareOfInterest
		});
		/* If so, then buy and sell shares every 1ms, driving change in the stock market */
	})
	
	client.on('close', () => {
		console.log("We did not expect any client to disconnect, exiting!");
		process.exit();
	})
}

let i = 0;
for (; i < tradersFraction * numClients; i++) {
	establishConnections(true, shares[i % 5]);
}
for (; i < numClients; i++) {
	establishConnections(false, shares[i % 5]);
}
setInterval(async () => {
	/* For simplicity we just randomly buy/sell */
	for (const data of traders) {
		transactionsPerSecond++;
		const topic = Math.random() < 0.5 ? 'buy' : 'sell';
		data.client.publish(topic, data.shareOfInterest);
	}
}, 1);

printData();