const Happn3 = require('happn-3');
const HappnMq = require('../../index');

module.exports = class Happn3Harness {

    constructor() {
    }

    async initialise() {
        await this.__createHappnServerInstance();
        await this.__createHappnClientInstance();
    }

    __createHappnServerInstance() {

        let self = this;

        return new Promise((resolve, reject) => {

            let happnConfig = {
                utils: {
                    logLevel: 'error',
                    // see happn-logger module for more config options
                },
                services: {
                    // queue: {
                    //     config: {
                    //         host: process.env['RABBITMQ_HOST'] || '0.0.0.0',
                    //         userName: process.env['RABBITMQ_USERNAME'],
                    //         password: process.env['RABBITMQ_PASSWORD']
                    //     }
                    // },
                    data: {
                        config: {
                            filename: 'happn-mq-TEST-APP',
                            autoload: true,
                            timestampData: true
                        }
                    }
                }
            };

            let happnMqConfig = {
                trace: true,
                queues: [
                    { name: 'HAPPN_PUBSUB_IN', type: 'pubsub_in' },
                    { name: 'HAPPN_PUBSUB_OUT', type: 'pubsub_out' },
                    { name: 'HAPPN_WORKER_IN', type: 'worker_in' },
                    { name: 'HAPPN_WORKER_OUT', type: 'worker_out' }
                ],
                queueProvider: 'rabbitmq',  // to be interchangeable with other implementations, eg: rabbitmq, memory
                data: {
                    provider: 'nedb',
                    filename: 'happn-MQ',
                    autoload: true,
                    timestampData: true
                },
                host: process.env['RABBITMQ_HOST'] || '0.0.0.0',
                userName: process.env['RABBITMQ_USERNAME'],
                password: process.env['RABBITMQ_PASSWORD']
            };

            Happn3.service.create(happnConfig, async function (e, happnServer) {

                if (e)
                    return reject(e);

                console.log('HAPPN3 SERVER UP...');

                self.__happnServer = happnServer;

                try {
                    // set up happn-mq
                    self.__happnMq = HappnMq.create(happnMqConfig);
                    await self.__happnMq.initialize();
                    await self.__happnMq.setOutboundWorkerQueueHandler(self.queueItemHandler.bind(self));

                    console.log('HAPPN-MQ INITIALIZED...');

                    // override the message handler so that we can shortcut adding to the happn-mq queue...
                    console.log('OVERRIDING HAPPN3 MESSAGE HANDLER....');
                    self.__overrideSessionMessageHandler();

                    resolve();
                } catch (err) {
                    return reject(err);
                }

            });
        });
    }

    __createHappnClientInstance() {

        let self = this;

        return new Promise((resolve, reject) => {
            // now lets create a client and send a message
            Happn3.client.create([], function (e, instance) {

                if (e)
                    return reject(e);

                self.__happnClient = instance;

                self.__happnClient.onAll((message, meta) => {
                    console.log('EVENT MESSAGE: ', message, meta);
                }, function (e) {
                    console.log(e);
                });

                resolve();
            });
        });
    }

    sendMessage(path, data, options) {

        return new Promise((resolve, reject) => {

            this.__happnClient.set(path, data, options, function (e, result) {

                if (e)
                    return reject(e);

                //your result object has a special _meta property (not enumerable) that contains its actual _id, path, created and modified dates
                //so you get back {property1:'property1',property2:'property2',property3:'property3', _meta:{path:'e2e_test1/testsubscribe/data/', created:20151011893020}}

                resolve(result);
            });
        });
    }

    __overrideSessionMessageHandler() {

        this.__happnServer.services.session.happnMq = this.__happnMq;

        let newHandler = function handleMessage(message, client) {

            //legacy clients do pings
            if (message.indexOf && message.indexOf('primus::ping::') === 0)
                return client.onLegacyPing(message);

            // this must happen before the protocol service processes the message stack
            if (message.action === 'configure-session') this.__configureSession(message, client);

            if (!this.__sessions[client.sessionId]) return this.__discardMessage(message);

            this.__currentMessageId++;

            let msg = {
                raw: message,
                session: this.__sessions[client.sessionId].data,
                id: this.__currentMessageId
            };

            if (msg.raw.action === 'configure-session') {
                // use the existing protocol service (for now) to deal with the session
                this.happn.services.protocol.processMessageIn(msg, (e, processed) => {
                    if (e)
                        return this.happn.services.error.handleSystem(
                            e,
                            'SessionService.handleMessage',
                            'MEDIUM'
                            // constants.ERROR_SEVERITY.MEDIUM
                        );

                    processed.response.__outbound = true;
                    client.write(processed.response);
                });
            } else {    // everything else gets passed to happn-mq....

                // decorate the object with a request field containing the sessionId and eventId,
                // obtained when the session was created...
                msg['request'] = {
                    sessionId: client.sessionId,
                    eventId: msg.eventId,
                    data: msg.raw.data
                }

                // immediately add it to the queue
                console.log('PROCESSING INBOUND MESSAGE...');
                this.happn.services.session.happnMq.processInboundMessage(msg);
            }
        }

        this.__happnServer.services.session.handleMessage = newHandler;
        console.log('DONE...')
    }

    // outbound queue handler
    async queueItemHandler(channel, queueItem) {

        let self = this;

        if (!queueItem)
            return;

        let msg = queueItem.content;
        let msgObj = JSON.parse(msg);

        console.log('HANDLING OUTGOING MESSAGE: ', msgObj);

        if (msgObj.session) {
            // find the client associated with the sessionId... then return the response
            let client = self.__happnServer.services.session.getClient(msgObj.session.id);
            // console.log('CLIENT: ', client);
            msgObj.__outbound = true;

            if (client) {
                // console.log('WRITING TO CLIENT: ', msgObj.response);
                client.write(msgObj.response);
            }
        }

        channel.ack(queueItem);
    }
}