/* Simplified stock exchange made with mqtt pub/sub */
const mqtt = require('mqtt')
const protocol = 'mqtt'
const host = 'mqtt-broker'
const port = '1883'

const connectUrl = `${protocol}://${host}:${port}`

/* We measure transactions per second server side */
let transactionsPerSecond = 0;

/* Share valuations */
let shares = {
	'NFLX': 280.48,
	'TSLA': 244.74,
	'AMZN': 1720.26,
	'GOOG': 1208.67,
	'NVDA': 183.03
};



function printData() {
	/* Print transactions per second */
	let last = Date.now();
	setInterval(() => {
		transactionsPerSecond /= ((Date.now() - last) * 0.001)
		console.log("Transactions per second: " + transactionsPerSecond + ", here are the curret shares:");
		console.log(shares);
		console.log("");
		transactionsPerSecond = 0;
		last = Date.now();
	}, 1000);
}


function server() {
	const clientId = `mqtt_a`
	const client = mqtt.connect(connectUrl, {
		clientId,
		clean: true,
		connectTimeout: 4000,
		reconnectPeriod: 1000,
	})

	client.on('connect', () => {
		console.log(`Connected to the MQTT broker`)
		client.on("message", (topic, message) => {
			switch (topic) {
				case 'buy': {
					transactionsPerSecond++;

					/* For simplicity, shares increase 0.1% with every buy */
					shares[message] *= 1.001;

					/* Value of share has changed, update subscribers */
					client.publish('shares/' + message + '/value', JSON.stringify({ [message]: shares[message] }));
					break;
				}
				case 'sell': {
					transactionsPerSecond++;

					/* For simplicity, shares decrease 0.1% with every sale */
					shares[message] *= 0.999

					client.publish('shares/' + message + '/value', JSON.stringify({ [message]: shares[message] }));
					break;
				}
			}
		});
		client.subscribe(["buy", "sell"], () => {
			console.log(`Subscribed to topic "buy" and "sell" success`);
			printData();
		})
	})
}

server();
