/* NOTE: ws as client cannot even remotely stress uWebSockets.js,
 * however we don't care for ultra correctness here as
 * Socket.IO is so pointlessly slow anyways, we simply do not care */
const WebSocket = require('ws');

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

	/* Current value of our share */
	let value;

	let socket = new WebSocket('ws://localhost:9001');
	socket.onopen = () => {
		establishedConnections++;

		/* Subscribe to the share we are interested in */
		socket.send(JSON.stringify({action: 'sub', share: shareOfInterest}));

		/* Is this client going to be an active trader, or a passive watcher? */
		if (!isTrader) {
			return;
		}
		traders.push({
			socket,
			shareOfInterest
		});
	};

	socket.onmessage = (e) => {
		let json = JSON.parse(e.data);
		receivedMessages++;
		/* Keep track of our one share value (even though current strategy doesn't care for value) */
		for (let share in json) {
			value = json[share];
		}
	};

	socket.onclose = () => {
		console.log("We did not expect any client to disconnect, exiting!");
		process.exit();
	}
}

let i = 0;
for (; i < tradersFraction * numClients; i++) {
	establishConnections(true, shares[i % 5]);
}
for (; i < numClients; i++) {
	establishConnections(false, shares[i % 5]);
}


setInterval(async() => {
	/* For simplicity we just randomly buy/sell */
	for (const data of traders) {
		transactionsPerSecond++;
		const topic = Math.random() < 0.5 ? 'buy' : 'sell';
		data.socket.send(JSON.stringify({ action: topic, share: data.shareOfInterest }));
	}
}, 1);

printData();