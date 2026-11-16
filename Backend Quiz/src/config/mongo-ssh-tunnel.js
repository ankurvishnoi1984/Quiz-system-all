const fs = require("fs");
const net = require("net");
const { Client } = require("ssh2");
const env = require("./env");

let sshClient = null;
let localServer = null;
let started = false;

function tunnelConfig() {
  return env.mongo?.ssh || {};
}

function isTunnelEnabled() {
  return Boolean(env.mongo?.logEnabled && tunnelConfig().enabled);
}

function buildSshConnectConfig() {
  const ssh = tunnelConfig();
  const cfg = {
    host: ssh.host,
    port: ssh.port,
    username: ssh.user,
    readyTimeout: 20000,
    keepaliveInterval: 15000,
    // Windows OpenSSH often offers keyboard-interactive as well as password
    tryKeyboard: true
  };

  const keyPath = String(ssh.privateKeyPath || "").trim();
  if (keyPath) {
    cfg.privateKey = fs.readFileSync(keyPath);
  } else if (ssh.password) {
    cfg.password = ssh.password;
  } else {
    throw new Error(
      "MONGO_SSH_TUNNEL_ENABLED requires MONGO_SSH_PRIVATE_KEY_PATH or MONGO_SSH_PASSWORD"
    );
  }

  return cfg;
}

/**
 * Opens a local TCP listener and forwards each connection through SSH to
 * MongoDB on the remote host (usually 127.0.0.1:27017 on the Windows server).
 * No-ops when the tunnel is disabled. Non-fatal on failure.
 */
async function startMongoSshTunnel() {
  if (!isTunnelEnabled()) {
    return null;
  }
  if (started && localServer) {
    return localServer;
  }

  const ssh = tunnelConfig();

  try {
    const conn = new Client();
    const connectCfg = buildSshConnectConfig();
    await new Promise((resolve, reject) => {
      conn
        .on("ready", resolve)
        .on("error", reject)
        .on("keyboard-interactive", (_name, _instructions, _lang, prompts, finish) => {
          const answers = prompts.map((p) =>
            /password/i.test(p.prompt) ? connectCfg.password || "" : ""
          );
          finish(answers);
        })
        .connect(connectCfg);
    });

    const server = net.createServer((socket) => {
      conn.forwardOut(
        ssh.localHost,
        0,
        ssh.remoteHost,
        ssh.remotePort,
        (err, stream) => {
          if (err) {
            socket.destroy();
            return;
          }
          socket.pipe(stream).pipe(socket);
          socket.on("error", () => stream.end());
          stream.on("error", () => socket.destroy());
        }
      );
    });

    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(ssh.localPort, ssh.localHost, () => {
        server.removeListener("error", reject);
        resolve();
      });
    });

    sshClient = conn;
    localServer = server;
    started = true;

    conn.on("close", () => {
      started = false;
      sshClient = null;
    });

    console.log(
      `[mongo] SSH tunnel listening on ${ssh.localHost}:${ssh.localPort} -> ${ssh.remoteHost}:${ssh.remotePort} via ${ssh.host}:${ssh.port}`
    );
    return server;
  } catch (error) {
    console.warn(
      `[mongo] SSH tunnel failed (continuing without Mongo): ${error.message}`
    );
    await stopMongoSshTunnel().catch(() => {});
    return null;
  }
}

async function stopMongoSshTunnel() {
  const server = localServer;
  const client = sshClient;
  localServer = null;
  sshClient = null;
  started = false;

  if (server) {
    await new Promise((resolve) => server.close(() => resolve()));
  }
  if (client) {
    client.end();
  }
}

function isMongoSshTunnelActive() {
  return Boolean(started && localServer && sshClient);
}

module.exports = {
  startMongoSshTunnel,
  stopMongoSshTunnel,
  isMongoSshTunnelActive,
  isTunnelEnabled
};
