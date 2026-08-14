export const initializeDatabase = async (db) => {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT
    );
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      department TEXT,
      face_label TEXT,
      embedding_1 TEXT,
      embedding_2 TEXT,
      embedding_3 TEXT,
      embedding_4 TEXT,
      embedding_5 TEXT,
      face_embedding TEXT,
      face_image_base64 TEXT,
      face_match_vector TEXT,
      embedding_engine TEXT,
      embedding_updated_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      device_id TEXT NOT NULL,
      synced INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS attendance_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id TEXT NOT NULL,
      employee_name TEXT NOT NULL,
      device_id TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      status TEXT NOT NULL,
      synced INTEGER DEFAULT 0,
      response_message TEXT,
      image_uri TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  try {
    await db.execAsync("ALTER TABLE employees ADD COLUMN embedding_1 TEXT;");
  } catch (error) {
    if (!String(error.message).includes("duplicate column name")) {
      throw error;
    }
  }

  try {
    await db.execAsync("ALTER TABLE employees ADD COLUMN embedding_2 TEXT;");
  } catch (error) {
    if (!String(error.message).includes("duplicate column name")) {
      throw error;
    }
  }

  try {
    await db.execAsync("ALTER TABLE employees ADD COLUMN embedding_3 TEXT;");
  } catch (error) {
    if (!String(error.message).includes("duplicate column name")) {
      throw error;
    }
  }

  try {
    await db.execAsync("ALTER TABLE employees ADD COLUMN embedding_4 TEXT;");
  } catch (error) {
    if (!String(error.message).includes("duplicate column name")) {
      throw error;
    }
  }

  try {
    await db.execAsync("ALTER TABLE employees ADD COLUMN embedding_5 TEXT;");
  } catch (error) {
    if (!String(error.message).includes("duplicate column name")) {
      throw error;
    }
  }

  try {
    await db.execAsync("ALTER TABLE employees ADD COLUMN face_embedding TEXT;");
  } catch (error) {
    if (!String(error.message).includes("duplicate column name")) {
      throw error;
    }
  }

  try {
    await db.execAsync("ALTER TABLE employees ADD COLUMN face_image_base64 TEXT;");
  } catch (error) {
    if (!String(error.message).includes("duplicate column name")) {
      throw error;
    }
  }

  try {
    await db.execAsync("ALTER TABLE employees ADD COLUMN face_match_vector TEXT;");
  } catch (error) {
    if (!String(error.message).includes("duplicate column name")) {
      throw error;
    }
  }

  try {
    await db.execAsync("ALTER TABLE employees ADD COLUMN embedding_engine TEXT;");
  } catch (error) {
    if (!String(error.message).includes("duplicate column name")) {
      throw error;
    }
  }

  try {
    await db.execAsync("ALTER TABLE employees ADD COLUMN embedding_updated_at TEXT;");
  } catch (error) {
    if (!String(error.message).includes("duplicate column name")) {
      throw error;
    }
  }
};

export const getSetting = async (db, key) => {
  const row = await db.getFirstAsync("SELECT value FROM settings WHERE key = ?", key);
  return row?.value ?? null;
};

export const saveSetting = async (db, key, value) => {
  await db.runAsync(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    key,
    String(value ?? "")
  );
};

export const getEmployees = async (db) =>
  db.getAllAsync("SELECT * FROM employees ORDER BY name COLLATE NOCASE ASC");

export const saveEmployee = async (db, employee) => {
  const embeddings = employee.embeddings || [];
  const legacyEmbedding = employee.face_embedding || embeddings[0] || null;

  await db.runAsync(
    `INSERT INTO employees (employee_id, name, department, face_label, embedding_1, embedding_2, embedding_3, embedding_4, embedding_5, face_embedding, face_image_base64, face_match_vector, embedding_engine, embedding_updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(employee_id) DO UPDATE SET
       name = excluded.name,
       department = excluded.department,
       face_label = excluded.face_label,
       embedding_1 = COALESCE(excluded.embedding_1, employees.embedding_1),
       embedding_2 = COALESCE(excluded.embedding_2, employees.embedding_2),
       embedding_3 = COALESCE(excluded.embedding_3, employees.embedding_3),
       embedding_4 = COALESCE(excluded.embedding_4, employees.embedding_4),
       embedding_5 = COALESCE(excluded.embedding_5, employees.embedding_5),
       face_embedding = COALESCE(excluded.face_embedding, employees.face_embedding),
       face_image_base64 = COALESCE(excluded.face_image_base64, employees.face_image_base64),
       face_match_vector = COALESCE(excluded.face_match_vector, employees.face_match_vector),
        embedding_engine = COALESCE(excluded.embedding_engine, employees.embedding_engine),
        embedding_updated_at = COALESCE(excluded.embedding_updated_at, employees.embedding_updated_at)`,
    employee.employee_id,
    employee.name,
    employee.department || "",
    employee.face_label || employee.employee_id,
    embeddings[0] ? JSON.stringify(embeddings[0]) : null,
    embeddings[1] ? JSON.stringify(embeddings[1]) : null,
    embeddings[2] ? JSON.stringify(embeddings[2]) : null,
    embeddings[3] ? JSON.stringify(embeddings[3]) : null,
    embeddings[4] ? JSON.stringify(embeddings[4]) : null,
    legacyEmbedding ? JSON.stringify(legacyEmbedding) : null,
    employee.face_image_base64 || null,
    employee.face_match_vector ? JSON.stringify(employee.face_match_vector) : null,
    employee.embedding_engine || null,
    employee.embedding_updated_at || (legacyEmbedding || employee.face_match_vector ? new Date().toISOString() : null)
  );
};

export const getParsedEmployees = async (db) => {
  const rows = await getEmployees(db);
  return rows.map((row) => ({
    ...row,
    embedding_1: row.embedding_1 ? JSON.parse(row.embedding_1) : null,
    embedding_2: row.embedding_2 ? JSON.parse(row.embedding_2) : null,
    embedding_3: row.embedding_3 ? JSON.parse(row.embedding_3) : null,
    embedding_4: row.embedding_4 ? JSON.parse(row.embedding_4) : null,
    embedding_5: row.embedding_5 ? JSON.parse(row.embedding_5) : null,
    embeddings: [row.embedding_1, row.embedding_2, row.embedding_3, row.embedding_4, row.embedding_5]
      .filter(Boolean)
      .map((item) => JSON.parse(item)),
    face_embedding: row.face_embedding ? JSON.parse(row.face_embedding) : null,
    face_image_base64: row.face_image_base64 || "",
    face_match_vector: row.face_match_vector ? JSON.parse(row.face_match_vector) : null,
    embedding_engine: row.embedding_engine || null
  }));
};

export const addAttendanceLog = async (db, payload) => {
  await db.runAsync(
    `INSERT INTO attendance (employee_id, timestamp, device_id, synced)
     VALUES (?, ?, ?, ?)`,
    payload.employee_id,
    payload.timestamp,
    payload.device_id,
    payload.synced ? 1 : 0
  );

  const result = await db.runAsync(
    `INSERT INTO attendance_logs
    (employee_id, employee_name, device_id, timestamp, status, synced, response_message, image_uri)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    payload.employee_id,
    payload.employee_name,
    payload.device_id,
    payload.timestamp,
    payload.status,
    payload.synced ? 1 : 0,
    payload.response_message || "",
    payload.image_uri || ""
  );

  return result.lastInsertRowId;
};

export const updateAttendanceLog = async (db, id, payload) => {
  if (payload.employee_id && payload.timestamp && payload.device_id) {
    await db.runAsync(
      `UPDATE attendance
       SET synced = ?
       WHERE employee_id = ? AND timestamp = ? AND device_id = ?`,
      payload.synced ? 1 : 0,
      payload.employee_id,
      payload.timestamp,
      payload.device_id
    );
  }

  await db.runAsync(
    `UPDATE attendance_logs
     SET status = ?, synced = ?, response_message = ?
     WHERE id = ?`,
    payload.status,
    payload.synced ? 1 : 0,
    payload.response_message || "",
    id
  );
};

export const getPendingLogs = async (db) =>
  db.getAllAsync("SELECT * FROM attendance_logs WHERE synced = 0 ORDER BY created_at ASC");

export const getLogs = async (db) =>
  db.getAllAsync("SELECT * FROM attendance_logs ORDER BY datetime(timestamp) DESC LIMIT 100");

export const getLatestAttendanceForEmployee = async (db, employee_id) =>
  db.getFirstAsync(
    `SELECT * FROM attendance
     WHERE employee_id = ?
     ORDER BY datetime(timestamp) DESC
     LIMIT 1`,
    employee_id
  );

export const clearKioskCompanyData = async (db) => {
  await db.execAsync(`
    DELETE FROM employees;
    DELETE FROM attendance;
    DELETE FROM attendance_logs;
  `);
};

export const clearEmployeeCache = async (db) => {
  await db.execAsync(`
    DELETE FROM employees;
  `);
};
