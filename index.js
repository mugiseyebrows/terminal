const express = require('express');
const expressWs = require('express-ws');
const os = require('os');
const pty = require('node-pty');

const app = express();
const appWs = expressWs(app).app;

const USE_BINARY = os.platform() !== "win32";

function buffer(socket, timeout, maxSize) {
    let s = '';
    let sender = null;
    return (data) => {
      s += data;
      if (s.length > maxSize || userInput) {
        userInput = false;
        socket.send(s);
        s = '';
        if (sender) {
          clearTimeout(sender);
          sender = null;
        }
      } else if (!sender) {
        sender = setTimeout(() => {
          socket.send(s);
          s = '';
          sender = null;
        }, timeout);
      }
    };
  }
  // binary message buffering
  function bufferUtf8(socket, timeout, maxSize) {
    const chunks = [];
    let length = 0;
    let sender = null;
    return (data) => {
      chunks.push(data);
      length += data.length;
      if (length > maxSize || userInput) {
        userInput = false;
        socket.send(Buffer.concat(chunks));
        chunks.length = 0;
        length = 0;
        if (sender) {
          clearTimeout(sender);
          sender = null;
        }
      } else if (!sender) {
        sender = setTimeout(() => {
          socket.send(Buffer.concat(chunks));
          chunks.length = 0;
          length = 0;
          sender = null;
        }, timeout);
      }
    };
  }

const env = {};
    for (const k of Object.keys(process.env)) {
      const v = process.env[k];
      if (v) {
        env[k] = v;
      }
    }

const term = pty.spawn(process.platform === 'win32' ? 'cmd.exe' : 'bash', [], {
    name: 'xterm-256color',
    cols: 80,
    rows: 24,
    cwd: process.platform === 'win32' ? undefined : env.PWD,
    env,
    encoding: USE_BINARY ? null : 'utf8'
});

let unsentOutput = ''
let temporaryDisposable = term.onData(function(data) {
    unsentOutput += data;
});
//const unsentOutput = 

appWs.ws('/terminal', function (ws, req) {

    console.log('ws connected')
    const send = (USE_BINARY ? bufferUtf8 : buffer)(ws, 3, 262144);

    if (temporaryDisposable) {
        delete temporaryDisposable
        ws.send(unsentOutput)
    }

    term.onData(function(data) {
        try {
          send(data);
        } catch (ex) {
          // The WebSocket is not open, ignore
        }
      });

      ws.on('message', function(msg) {
        term.write(msg);
        userInput = true;
      });

})

const port = 3000;

const host = '0.0.0.0';

app.listen(port, host, () => {
    console.log(`listening on ${port}`)
});