var child_process = require('child_process')
  , fs = require('fs')
  , temp = require('temp');
  
var config = {
  debug: true
};

pythonSetup();

function pythonSetup() {
  config.python = {
    cmd: 'D:\\Python33\\python.exe',
    argsREPL: ['-u', '-i'],
    argsFile: []
  };
}

console.log(config);

var scriptSupport = {
  list: [],
  configure: function (repl,interactive) {
	if (interactive) {
		app.get('/cmd/' + repl + '/:cmd', function(req, res) {
		  scriptSupport.init(repl, null);
		  scriptSupport.send(req, res, repl);
		});
		io.of('/'+repl).on('connection', function (socket) {
		  console.log('Connection to %s REPL.', repl);
		  scriptSupport.init(repl, socket);
		  socket.on('cmd', function (data) {
			if (config.debug) console.log("Received: %s %j" , repl, data);
			var cmd = data.cmd;
			scriptSupport.list[repl].app.stdin.write(cmd);
		  });
		});
	}
	app.post('/run/' + repl, function(req, res) {
    temp.open({suffix: '.'+repl}, function(err, info) {
      fs.write(info.fd, req.body);
      console.log(req.body);
      fs.close(info.fd, function(err) {
        console.log(info.path);
        var args = config[repl].argsFile.concat(info.path);
        child_process.execFile(config[repl].cmd, args, {}, function(error, stdout, stderr) {
          console.log('stdout: ' + stdout);
          console.log('stderr: ' + stderr);
          if (error !== null) {
            console.log('exec error: ' + error);
          }
          res.send(stdout);
        });
      });
    });
	});
  },
  send: function (req, res, repl) {
    if (scriptSupport.list[repl] != null) {
      scriptSupport.list[repl].app.stdin.write(req.params.cmd);
      scriptSupport.list[repl].app.stdin.write('\r\n');
      if (scriptSupport.list[repl].socket != null) {
        scriptSupport.list[repl].socket.emit('stdin', req.params.cmd);
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
    if (scriptSupport.list[repl] == null) {
      scriptSupport.list[repl] = {app: child_process.spawn(config[repl].cmd, config[repl].argsREPL) };
	  process.stdin.resume();
	  process.stdin.setEncoding('utf8');
      if (config.debug) {
        scriptSupport.list[repl].app.stdout.on('data', function (data) {
          console.log('Stdout: %s %j', repl, data);
        });

        scriptSupport.list[repl].app.stderr.on('data', function (data) {
          console.log('Stdout: %s %j', repl, data);
        });
      }
      scriptSupport.list[repl].app.on('exit', function (code) {
        console.error('child process %s exited with code %d', repl, code);
        scriptSupport.list[repl] = null;
      });
      if (socket != null) {
        scriptSupport.list[repl].socket = socket;
        scriptSupport.pipeStreams(repl);
      }
    }
  },
  /**
   * Forwards events:
   * app 'stdout' -> socket 'stdout'
   * app 'stderr' -> socket 'stderr'
   */
  pipeStreams: function (repl) {
    var app = scriptSupport.list[repl].app;
    var socket = scriptSupport.list[repl].socket;
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

var express = require('express')
  , app = express()
  , server = require('http').createServer(app)
  , io = require('socket.io').listen(server);
    
   
var allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');

    // intercept OPTIONS method
    if ('OPTIONS' == req.method) {
      res.send(200);
    }
    else {
      next();
    }
};

app.use(allowCrossDomain);

app.get('/', function (req, res) {
  res.sendfile(__dirname + '/index.html');
});

app.get('/shutdown', function(req, res) {
  process.exit(1);
});

scriptSupport.configure('python', true);

server.listen(3002, function() {
  console.log('listening on port 3002');
});


