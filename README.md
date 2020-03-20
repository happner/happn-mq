# happn-mq

(NOTE: the repo and readme are both a work in-progress)

## Goals of happn-mq

- to port the message processing functionality in happn-3 to a queue-driven architecture
- to decouple the tightly bound message receive/response call stack currently found in happn-3; ie: incoming and outgoing message flows are separated by a queue
- to facilitate better load balancing amongst peer devices (particularly in a cluster scenario)
- messages are persisted in the queue until 'acked' - even if nodes are terminated

## General flow of messages

- a boundary service/proxy will field all __incoming__ websocket requests from happn clients
- a session is immediately created (*if required* - ie: the message action is *'configure-session'*) 
- the message is then immediately placed on a general __incoming__ AMQP message queue (RabbitMQ/AmazonMQ) - this decouples message receiving from message processing, and reduces backpressure on clients
- a __router__ service is bound as a queue handler to this incoming queue, which pops messages in a sequential fashion. This is important to note, as queue draining will remain blocked (if there are no other handlers bound to it) until an *ack* is called
- __authorization__ of the message is immediately processed via a __securityService__
- once authorized, the message is interrogated for it's particular *action*, and a factory (__actionServiceFactory__) is used to retrieve the correct action service to process the message
- once the action service has processed the message, it is then placed onto an __outgoing__ AMQP queue
- the boundary service/proxy outbound queue handler picks up the message from the outbound queue, and interrogates it for the session id. The relevant websocket connection is retrieved from an internally maintained list, and the message is returned to the correct client (broadcast messages are returned to all clients)

## Special considerations

- the AMQP service is made available to happn-mq using a __provider__ pattern. This allows different implementations with the same 'interface' to be used depending on the environment that the node is running on (eg: local vs AWS)
