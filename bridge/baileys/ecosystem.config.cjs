// pm2 keeps the bridge running: restarts on crash, starts with Windows (see README).
module.exports = {
  apps: [
    {
      name: "proppulse-bridge",
      script: "index.mjs",
      cwd: __dirname,
      autorestart: true,
      restart_delay: 10000, // don't hammer WhatsApp with instant reconnects
      exp_backoff_restart_delay: 5000,
      max_restarts: 50,
      kill_timeout: 5000, // let it save state + release the lock
      out_file: "logs/bridge.log",
      error_file: "logs/bridge-error.log",
      time: true,
    },
  ],
};
