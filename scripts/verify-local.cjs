// Preloaded only by verify.sh. Keep dotenv files and network data out of a
// local verification run, including Next's automatic dotenv discovery.
const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');
if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(process.env.TURSO_DATABASE_URL || '')) {
  console.error('Refusing verification: database URL must use loopback HTTP.');
  process.exit(3);
}
const isEnv = (file) => typeof file === 'string' && /^\.env(?:\.|$)/.test(path.basename(file));
for (const method of ['readFileSync', 'readFile']) {
  const original = fs[method];
  fs[method] = function (file, ...args) {
    if (isEnv(file)) {
      const error = Object.assign(new Error('Dotenv files are hidden during local verification'), { code: 'ENOENT' });
      if (method === 'readFile') return args.at(-1)(error);
      throw error;
    }
    return original.call(this, file, ...args);
  };
}
const readFile = fs.promises.readFile;
fs.promises.readFile = async function (file, ...args) {
  if (isEnv(file)) throw Object.assign(new Error('Dotenv files are hidden during local verification'), { code: 'ENOENT' });
  return readFile.call(this, file, ...args);
};
const connect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...args) {
  // net.connect() passes its already-normalized argument array to Socket.connect.
  const [options] = Array.isArray(args[0]) ? args[0] : net._normalizeArgs(args);
  const host = options.host || 'localhost';
  if (!options.path && !['127.0.0.1', 'localhost', '::1'].includes(host)) {
    // Don't include URLs, headers or credentials in this error.
    throw new Error('Non-loopback network connections are forbidden during local verification');
  }
  return connect.apply(this, args);
};
