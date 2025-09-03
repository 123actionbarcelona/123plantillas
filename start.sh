#!/bin/bash

echo "🚀 Iniciando Gestor de Plantillas en modo producción..."

# Verificar que Node.js esté instalado
if ! command -v node &> /dev/null
then
    echo "❌ Node.js no está instalado. Por favor instálalo primero."
    exit 1
fi

# Instalar dependencias si no existen
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependencias..."
    npm install --production
fi

# Verificar archivo .env
if [ ! -f ".env" ]; then
    echo "⚠️  Archivo .env no encontrado!"
    echo "Creando .env desde .env.example..."
    cp .env.example .env
    echo "Por favor edita .env con tu configuración real"
    exit 1
fi

# Crear base de datos desde la plantilla si no existe
if [ ! -f "templates.db" ]; then
    if [ -f "templates.sample.db" ]; then
        echo "📊 Creando base de datos desde plantilla..."
        cp templates.sample.db templates.db
        echo "✅ Base de datos creada con estructura completa"
    else
        echo "⚠️  No se encontró plantilla de base de datos, se creará una nueva"
    fi
fi

# Limpiar variables de entorno del sistema que podrían sobrescribir .env
unset EMAIL_USER
unset EMAIL_PASS
echo "🔧 Variables de entorno del sistema limpiadas"

# Iniciar el servidor
echo "✅ Iniciando servidor en http://localhost:3000"
node server.js