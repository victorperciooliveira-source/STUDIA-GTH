import express from 'express';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database('school.db');

// --- DATABASE SETUP ---
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    uid TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    password TEXT,
    displayName TEXT,
    role TEXT CHECK(role IN ('admin', 'teacher')),
    subject TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT,
    startTime TEXT,
    endTime TEXT,
    subject TEXT,
    room TEXT,
    teacherId TEXT,
    teacherName TEXT,
    classGroup TEXT,
    status TEXT CHECK(status IN ('pending', 'confirmed', 'absent', 'vaga')) DEFAULT 'pending',
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (teacherId) REFERENCES users(uid)
  );

  CREATE TABLE IF NOT EXISTS labs (
    id TEXT PRIMARY KEY,
    name TEXT
  );

  CREATE TABLE IF NOT EXISTS lab_bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    labId TEXT,
    teacherId TEXT,
    teacherName TEXT,
    date TEXT,
    startTime TEXT,
    endTime TEXT,
    FOREIGN KEY (labId) REFERENCES labs(id),
    FOREIGN KEY (teacherId) REFERENCES users(uid)
  );

  CREATE TABLE IF NOT EXISTS certificates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    teacherId TEXT,
    teacherName TEXT,
    date TEXT,
    reason TEXT,
    imageUrl TEXT,
    status TEXT DEFAULT 'pending',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (teacherId) REFERENCES users(uid)
  );
`);

// --- DATABASE MIGRATIONS ---
const tableInfo = db.prepare("PRAGMA table_info(users)").all() as { name: string }[];
const columnNames = tableInfo.map(c => c.name);

if (!columnNames.includes('password')) {
  try {
    db.exec("ALTER TABLE users ADD COLUMN password TEXT");
    console.log("Migration: Added 'password' column to 'users' table.");
  } catch (e) {
    console.error("Error adding password column:", e);
  }
}

if (!columnNames.includes('subject')) {
  try {
    db.exec("ALTER TABLE users ADD COLUMN subject TEXT");
    console.log("Migration: Added 'subject' column to 'users' table.");
  } catch (e) {
    console.error("Error adding subject column:", e);
  }
}

const certInfo = db.prepare("PRAGMA table_info(certificates)").all() as { name: string }[];
const certColumns = certInfo.map(c => c.name);
if (!certColumns.includes('imageUrl')) {
  db.exec("ALTER TABLE certificates ADD COLUMN imageUrl TEXT");
}

// Initial Data
db.prepare("INSERT OR IGNORE INTO labs (id, name) VALUES ('info', 'Laboratório de Informática'), ('chem', 'Laboratório de Química')").run();

// Insert initial accounts (overwriting to ensure passwords and structure are correct)
const insertUser = db.prepare('INSERT OR REPLACE INTO users (uid, email, password, displayName, role, subject) VALUES (?, ?, ?, ?, ?, ?)');
insertUser.run('admin-1', 'victor.percio.oliveira@escola.pr.gov.br', 'admin123', 'Victor Oliveira', 'admin', null);
insertUser.run('teacher-1', 'professor@escola.pr.gov.br', 'professor123', 'Professor de Teste', 'teacher', 'Matemática');

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // --- API ROUTES ---

  // Register
  app.post('/api/auth/register', (req, res) => {
    const { email, password, displayName, role, subject } = req.body;
    try {
      const uid = 'u-' + Math.random().toString(36).slice(2, 11);
      db.prepare('INSERT INTO users (uid, email, password, displayName, role, subject) VALUES (?, ?, ?, ?, ?, ?)').run(uid, email, password, displayName, role, subject);
      res.json({ uid, email, displayName, role, subject });
    } catch (err) {
      if ((err as Error).message.includes('UNIQUE')) {
        return res.status(400).json({ error: 'Email já cadastrado' });
      }
      res.status(500).json({ error: 'Erro ao registrar' });
    }
  });

  // Login
  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE email = ? AND password = ?').get(email, password);
    
    if (user) {
      res.json(user);
    } else {
      res.status(401).json({ error: 'Credenciais inválidas' });
    }
  });

  // Get Schedules
  app.get('/api/schedules', (req, res) => {
    const { teacherId } = req.query;
    let query = 'SELECT * FROM schedules';
    let params: any[] = [];

    if (teacherId) {
      query += ' WHERE teacherId = ?';
      params.push(teacherId);
    }
    
    query += ' ORDER BY date DESC, startTime ASC';
    const schedules = db.prepare(query).all(...params);
    res.json(schedules);
  });

  // Create Schedule
  app.post('/api/schedules', (req, res) => {
    const { date, startTime, endTime, subject, room, teacherId, teacherName } = req.body;
    const info = db.prepare(`
      INSERT INTO schedules (date, startTime, endTime, subject, room, teacherId, teacherName, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
    `).run(date, startTime, endTime, subject, room, teacherId, teacherName);
    
    res.json({ id: info.lastInsertRowid, status: 'success' });
  });

  // Update Status
  app.patch('/api/schedules/:id', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    db.prepare('UPDATE schedules SET status = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?').run(status, id);
    res.json({ status: 'success' });
  });

  // Delete Schedule
  app.delete('/api/schedules/:id', (req, res) => {
    const { id } = req.params;
    db.prepare('DELETE FROM schedules WHERE id = ?').run(id);
    res.json({ status: 'success' });
  });

  // Get Stats
  app.get('/api/stats', (req, res) => {
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(case when status = 'confirmed' then 1 else 0 end) as confirmed,
        SUM(case when status = 'absent' then 1 else 0 end) as absent,
        SUM(case when status = 'pending' then 1 else 0 end) as pending
      FROM schedules
    `).get();
    res.json(stats);
  });

  // Get Teachers
  app.get('/api/teachers', (req, res) => {
    const teachers = db.prepare("SELECT * FROM users WHERE role = 'teacher'").all();
    res.json(teachers);
  });

  // --- LAB BOOKINGS ---
  app.get('/api/labs/bookings', (req, res) => {
    const bookings = db.prepare('SELECT * FROM lab_bookings ORDER BY date DESC, startTime ASC').all();
    res.json(bookings);
  });

  app.post('/api/labs/bookings', (req, res) => {
    const { labId, teacherId, teacherName, date, startTime, endTime } = req.body;
    db.prepare(`
      INSERT INTO lab_bookings (labId, teacherId, teacherName, date, startTime, endTime)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(labId, teacherId, teacherName, date, startTime, endTime);
    res.json({ status: 'success' });
  });

  // --- CERTIFICATES ---
  app.get('/api/certificates', (req, res) => {
    const certs = db.prepare('SELECT * FROM certificates ORDER BY createdAt DESC').all();
    res.json(certs);
  });

  app.post('/api/certificates', (req, res) => {
    const { teacherId, teacherName, date, reason, imageUrl } = req.body;
    db.prepare(`
      INSERT INTO certificates (teacherId, teacherName, date, reason, imageUrl)
      VALUES (?, ?, ?, ?, ?)
    `).run(teacherId, teacherName, date, reason, imageUrl);
    res.json({ status: 'success' });
  });

  app.patch('/api/certificates/:id/approve', (req, res) => {
    const { id } = req.params;
    const cert = db.prepare('SELECT * FROM certificates WHERE id = ?').get(id) as { teacherId: string, date: string } | undefined;
    
    if (cert) {
      // 1. Approve certificate
      db.prepare("UPDATE certificates SET status = 'approved' WHERE id = ?").run(id);
      
      // 2. Automatically mark schedules as "vaga" (vacant) for that teacher on that date
      db.prepare("UPDATE schedules SET status = 'vaga' WHERE teacherId = ? AND date = ?").run(cert.teacherId, cert.date);
      
      res.json({ status: 'success' });
    } else {
      res.status(404).json({ error: 'Not found' });
    }
  });

  // --- VITE MIDDLEWARE ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist/index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
