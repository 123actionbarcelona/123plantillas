# Deploy "Simple y Seguro"

Guía rápida para levantar y desplegar la app sin exponer la base de datos, con front+API en el mismo origen, CSP estricta para scripts y soporte de estilos inline solo para previsualizar plantillas.

## Requisitos
- Node.js 18+ (recomendado LTS 20)
- npm 9+
- Acceso a un SMTP de Gmail Workspace (EMAIL_USER/EMAIL_PASS = App Password)

## Estructura
- `public/` (HTML/CSS/JS) — único directorio servido como estático
- `server.js` — API + servidor estático
- `utils/` — validaciones/seguridad
- `scripts/reset-admin.js` — reset/creación de usuario admin
- `.env.example` — plantilla de variables (copiar a `.env` y completar)
- `.gitignore` — ignora `.env`, `templates.db`, logs y `node_modules`

## Variables de entorno (`.env`)
Copia `./.env.example` a `./.env` y completa:

```
PORT=3004
NODE_ENV=production
DB_PATH=/ruta/segura/por-fuera/templates.db
JWT_SECRET=<cadena_aleatoria_larga>
EMAIL_USER=<tu_gmail_workspace>
EMAIL_PASS=<tu_app_password>
```

Notas:
- Usa una ruta ABSOLUTA para `DB_PATH` fuera de cualquier carpeta pública.
- No subas `.env` al repo.

## Base de datos
- Ubica el archivo SQLite indicado en `DB_PATH`. Si no se indica, usará `./templates.db` (no recomendado para producción).
- No subas `templates.db` al repo (ya está en `.gitignore`).

## Instalación y build CSS
```
cd "deploy simple y seguro"
npm install
npm run build:css
```

## Ejecutar localmente
```
PORT=3004 NODE_ENV=production node server.js
```
- Acceso: `http://localhost:3004`
- LAN (móvil misma Wi‑Fi): `http://<IP_LAN>:3004`

## Verificación rápida
- Salud front: `curl -I http://localhost:3004`
- Assets: `curl -I http://localhost:3004/app.js`
- API sin token: `curl -I http://localhost:3004/api/templates` → 401
- Login (JSON):
```
curl -s -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"<pwd>"}' \
  http://localhost:3004/api/login
```

## Usuarios
Reset/crear admin:
```
node scripts/reset-admin.js admin <nueva_contraseña>
```

## Producción (Hostinger)
1) Subir contenido de `deploy simple y seguro/` como app Node.
2) Definir variables de entorno (panel):
   - `PORT=3004`
   - `NODE_ENV=production`
   - `DB_PATH=/ruta/segura/templates.db`
   - `JWT_SECRET=<secreto_largo>`
   - `EMAIL_USER`, `EMAIL_PASS`
3) Iniciar la app (PM2/panel). Si usan proxy, el dominio servirá 443/80 y la app escuchará internamente en 3004.

## PM2 (opcional)
```
# desde "deploy simple y seguro"
npm install --global pm2
pm2 start server.js --name templates --update-env
pm2 save
pm2 startup   # (seguir instrucciones para persistir)
```

## Seguridad aplicada
- Estáticos solo desde `./public` → no se expone `.env` ni `templates.db`.
- CSP estricta para scripts (sin inline). Estilos inline solo para previsualizar HTML de plantillas.
- Front y API mismo origen (sin CORS).
- Rate limit suave en login (20 intentos/5min; éxitos no cuentan).

## Puertos
- Recomendado: `PORT=3004` (evita 3000 si ya está en uso).
- Alternativas: `3005`, `3006`, `8080`, `8081`.
- El front usa `window.location.origin`, no requiere cambios de código al cambiar el puerto.

## Problemas comunes
- “Solo se ve HTML”: refrescar cache (Ctrl/Cmd+Shift+R). Verificar `/app.js` devuelve 200.
- “Error de conexión” al login en móvil: comprobar misma Wi‑Fi/LAN y que `/api/login` responde 200/401 (no error de red).
- Reordenar Categorías/Tags no guarda: refrescar (caché), usar flechas ▲▼ en móvil; drag & drop con ratón en desktop.

## Notas de uso
- Orden de plantillas por “última usada”: al Enviar, `updated_at` se actualiza y la plantilla sube en el listado.
- Envío de emails (Gmail): el nombre visible del remitente está fijado en `server.js` como `"123 Action Barcelona" <EMAIL_USER>`.
