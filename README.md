# Broadcast Benchmarking
This codebase is an extension to [Unetworking's PubSub-Benchmark](https://github.com/uNetworking/pubsub-benchmark)

Here we have removed the stock exchange theme, in favour of a benchmarking system to test out different frameworks that can be used for broadcasting messages.

The codebase has inbuilt support for testing the following frameworks.

1. SocketIo.
2. Stomp.
3. MQTT.
4. expressWS.
5. uWebSockets.
6. Elysia.
7. Bun.

To run the test ensure that docker and python is installed, and run the following command
```
bash run.sh
```