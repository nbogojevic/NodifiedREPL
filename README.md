Nodified REPL
=============

This project provides node.js/socket.io web equivalent of Read-eval-print loop for scritping languages. 

First implementation supports Python and groovy. 

Usage
-----

Currently server only listens on port 3002.

    node index.js

API
---

Read part can be realized either using REST api or using socket.io events. When using socket.io events, connection is established using `<your-server>/<repl-name>` URL. For example, for groovy
    var socket = io.connect('http://localhost:3002/groovy');

REST api has form `<your-server>/<repl-name>/<command>`. For example, for python:

    localhost:3002/python/print(42)
    
Response is JSON object containing status.

The equivalent using socket.io event is `cmd` event with payload being JSON object containig field `cmd`. For example for python:

    socket.emit('cmd', {cmd:'print(42)\r\n'});

Eval part is, of course, done sever side.

Print part is available via socket.io events. Two events are available: `stdout` and `stderr`. They correspond to stdout and stderr stream of server side REPL implementation. Data content is content of stream.
    
