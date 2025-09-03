#!/usr/bin/env node
// Resetea o crea el usuario admin con una contraseña dada
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const username = process.argv[2] || 'admin';
const newPassword = process.argv[3] || 'admin123';

const dbPath = path.join(__dirname, '..', 'templates.db');
const db = new sqlite3.Database(dbPath);

const hash = bcrypt.hashSync(newPassword, 10);

db.serialize(() => {
  db.run(
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'admin',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`
  );

  db.get('SELECT id FROM users WHERE username = ?', [username], (err, row) => {
    if (err) {
      console.error('Error consultando usuarios:', err.message);
      process.exit(1);
    }
    if (row) {
      db.run('UPDATE users SET password = ? WHERE id = ?', [hash, row.id], (uErr) => {
        if (uErr) {
          console.error('Error actualizando contraseña:', uErr.message);
          process.exit(1);
        }
        console.log(`Contraseña de '${username}' actualizada.`);
        process.exit(0);
      });
    } else {
      const id = uuidv4();
      db.run(
        'INSERT INTO users (id, username, email, password, role) VALUES (?, ?, ?, ?, ?)',
        [id, username, null, hash, 'admin'],
        (iErr) => {
          if (iErr) {
            console.error('Error creando usuario:', iErr.message);
            process.exit(1);
          }
          console.log(`Usuario '${username}' creado.`);
          process.exit(0);
        }
      );
    }
  });
});
