const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');
const fs = require('fs');

const dbPath = path.join(__dirname, 'admin', 'db', 'data.sqlite');
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

// Tabloları oluştur
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE,
      name TEXT,
      phone TEXT,
      email TEXT,
      car TEXT,
      plate TEXT,
      service TEXT,
      package TEXT,
      note TEXT,
      status TEXT DEFAULT 'beklemede',
      reply TEXT,
      reply_image TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS order_photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER,
      type TEXT,
      filename TEXT,
      FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS visitors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ip TEXT,
      page TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS credits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT,
      amount REAL,
      description TEXT,
      note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE TABLE IF NOT EXISTS wa_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      data TEXT
  );
`);

// Varsayılan admin kullanıcısını ekle (eğer yoksa)
const adminUser = db.prepare("SELECT * FROM users WHERE username = 'admin'").get();
if (!adminUser) {
    const defaultPassword = bcrypt.hashSync('123456', 10);
    db.prepare("INSERT INTO users (username, password) VALUES (?, ?)").run('admin', defaultPassword);
}

// Update DB Schema: Add missing columns
const migrations = [
    "ALTER TABLE orders ADD COLUMN package TEXT",
    "ALTER TABLE credits ADD COLUMN order_id INTEGER",
    "ALTER TABLE credits ADD COLUMN order_code TEXT",
];
for (const sql of migrations) {
    try { db.prepare(sql).run(); } catch (e) {}
}

module.exports = db;
