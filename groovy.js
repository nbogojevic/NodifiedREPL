var child_process = require('child_process')
  , fs = require('fs')
  , temp = require('temp');
  
var config = {
  debug: true
};

var repl = 'groovy';   

if (process.env['JAVA_HOME'] != null) {
  if (process.env['GROOVY_HOME'] != null) {
    config.groovy = {
      cmd: process.env['ComSpec'],
      argsFile: [
        '/C',
        process.env['GROOVY_HOME']+'/bin/groovy.bat', 
        ],
      
    };
  }
  else {
    console.error('GROOVY_HOME environment variable is not set.');
  }
}
else {
  console.error('JAVA_HOME environment variable is not set.');
}

console.log(config);

var express = require('express')
  , app = express();
app.use(function(req, res, next) {
    var data = '';
    req.setEncoding('utf8');
    req.on('data', function(chunk) { 
        data += chunk;
    });
    req.on('end', function() {
        req.rawBody = data;
        next();
    });
});
app.post('/run/' + repl, function(req, res) {
  temp.open({suffix: '.'+repl}, function(err, info) {
    fs.write(info.fd, req.rawBody);
    console.log(req.rawBody);
    fs.close(info.fd, function(err) {
      console.log(info.path);
      var args = config[repl].argsFile.concat(info.path);
      console.log(args);
      child_process.execFile(config[repl].cmd, args, {}, function(error, stdout, stderr) {
        if (error !== null) {
          console.log('exec error: ' + error);
        }
        res.send(stdout+stderr);
      });
    });
  });
});

app.get('/', function(req, res) {
  res.send('ok');
});

app.get('/shutdown', function(req, res) {
  process.exit(1);
});

app.listen(3003, function() {
  console.log('listening on port 3003');
});
