const SocketIO = require('socket.io-client');

/* By default we use 10% active traders, 90% passive watchers */
const numClients = 100;
const tradersFraction = 0.1;

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
		receivedMessages = 0;
		transactionsPerSecond = 0;
		last = Date.now();
	}, 1000);
}
const traders = [];

function establishConnections(isTrader, shareOfInterest) {

	/* Current value of our share */
	let value;

	let socket = SocketIO('http://localhost:3000');
	socket.on('connect', () => {
		establishedConnections++;
		/* Randomly select one share this client will be interested in */

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
		

	});

	socket.on(shareOfInterest, (message) => {
		receivedMessages++;
		let json = JSON.parse(message);

		/* Keep track of our one share value (even though current strategy doesn't care for value) */
		for (let share in json) {
			value = json[share];
		}
	});

	socket.on('disconnect', () => {
		console.log("We did not expect any client to disconnect, exiting!");
		process.exit();
	});
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
		data.socket.send(JSON.stringify({ action: topic, share: data.shareOfInterest }));
	}
}, 1);

printData();