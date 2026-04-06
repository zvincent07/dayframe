module.exports = {
  apps: [
    {
      name: "dayframe-web",
      script: "./node_modules/next/dist/bin/next",
      args: "start",
      env: {
        NODE_ENV: "production",
      },
      windowsHide: true,
      autorestart: true,
      watch: false,
      max_memory_restart: "2G",
    }
  ]
};
