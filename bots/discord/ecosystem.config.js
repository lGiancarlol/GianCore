module.exports = {
  apps: [
    {
      name:        "giancore-discord-bot",
      script:      "dist/index.js",
      interpreter: "node",
      cwd:         __dirname,

      // Auto-restart
      autorestart:      true,
      max_restarts:     10,
      restart_delay:    5000,   // 5s between restarts
      exp_backoff_restart_delay: 100,

      // Process limits
      max_memory_restart: "256M",

      // Logs
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      out_file:        "./logs/out.log",
      error_file:      "./logs/error.log",
      merge_logs:      true,

      // Env
      env: {
        NODE_ENV: "production",
      },

      // Watch (disable in production)
      watch: false,
    },
  ],
};
