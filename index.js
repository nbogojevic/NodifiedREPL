var spawn = require('child_process').spawn;
var config = {
  python: {
    cmd: 'D:\\Python33\\python.exe',
    args: ['-u', '-i']
    },
  groovy: {
    cmd: 'C:\\windows\\system32\\cmd.exe',
    args: ['/c', 'D:\\java\\groovy-1.7.5\\bin\\groovysh.bat']
  },
  debug: false
};

var replList = {
  list: [],
  configure: function (repl) {
    app.get('/' + repl + '/:cmd', function(req, res) {
      replList.init(repl, null);
      replList.send(req, res, repl);
    });
    io.of('/'+repl).on('connection', function (socket) {
      console.log('Connection to ' + repl + ' REPL.');
      replList.init(repl, socket);
      socket.on('cmd', function (data) {
        // console.log("Received: " + data);
        var cmd = data.cmd;
        replList.list[repl].app.stdin.write(cmd);
      });
    });
  },
  send: function (req, res, repl) {
    if (replList.list[repl] != null) {
      replList.list[repl].app.stdin.write(req.params.cmd);
      replList.list[repl].app.stdin.write('\r\n');
      if (replList.list[repl].socket != null) {
        replList.list[repl].socket.emit('stdin', req.params.cmd);
        res.send({status:'ok'});
      }
      else {
        res.send({status:'no-listener'});
      }    
    }
    else {
      res.send({status:'no-repl-provider'});
    }
  },
  init: function (repl, socket) {
    if (replList.list[repl] == null) {
      replList.list[repl] = {app: spawn(config[repl].cmd, config[repl].args) };
      if (config.debug) {
        replList.list[repl].app.stdout.on('data', function (data) {
          console.log('Stdout: ' + data);
        });

        replList.list[repl].app.stderr.on('data', function (data) {
          console.log('Stderr: ' + data);
        });
      }
      replList.list[repl].app.on('exit', function (code) {
        console.log('child process ' + repl + 'exited with code ' + code);
        replList.list[repl] = null;
      });
      if (socket != null) {
        replList.list[repl].socket = socket;
        replList.pipeStreams(repl);
      }
    }
  },
  /**
   * Forwards events:
   * app 'stdout' -> socket 'stdout'
   * app 'stderr' -> socket 'stderr'
   */
  pipeStreams: function (repl) {
    var app = replList.list[repl].app;
    var socket = replList.list[repl].socket;
    var proc = app.process;
    // TODO: This forces proc output to be interpreted as UTF-8. Should send binary data to client and let them deal with it
    app.stdout.setEncoding('utf8');
    app.stderr.setEncoding('utf8');
    var streamHandler = function(type, data) {
      data = Buffer.isBuffer(data) ? data.toString('base64') : data;
      socket.emit(type, data);
    };
    var stdoutListener = streamHandler.bind(null, 'stdout');
    var stderrListener = streamHandler.bind(null, 'stderr');
    app.stdout.on('data', stdoutListener);
    app.stderr.on('data', stderrListener);
    app.on('exit', function() {
      app.stdout.removeListener('data', stdoutListener);
      app.stderr.removeListener('data', stderrListener);
    });
  }
};

// var python = spawn(config.python.cmd, config.python.args);

var express = require('express')
  , app = express()
  , server = require('http').createServer(app)
  , io = require('socket.io').listen(server);
    
   
app.get('/', function (req, res) {
  res.sendfile(__dirname + '/index.html');
});
app.get('/shutdown', function(req, res) {
  process.exit(1);
});

replList.configure('python');
replList.configure('groovy');

process.stdin.resume();
process.stdin.setEncoding('utf8');

server.listen(3002, function() {
  console.log('listening on port 3002');
});


