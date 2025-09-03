module.exports = {
  apps: [{
    name: 'gestor-plantillas',
    script: './server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      // No pongas EMAIL_USER o EMAIL_PASS aquí
      // Usa solo el archivo .env
    },
    // Limpiar variables de entorno del sistema antes de iniciar
    env_production: {
      NODE_ENV: 'production',
      EMAIL_USER: undefined,
      EMAIL_PASS: undefined
    }
  }]
};