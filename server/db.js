const { createClient } = require('@libsql/client');

// Initialize Turso client
const turso = createClient({
  url: process.env.TURSO_CONNECTION_URL || 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Wrapper to make Turso API similar to better-sqlite3
class Database {
  constructor() {
    this.client = turso;
  }

  exec(sql) {
    // Split multiple statements and execute them
    const statements = sql.split(';').filter(s => s.trim());
    statements.forEach(stmt => {
      if (stmt.trim()) {
        this.client.execute(stmt.trim());
      }
    });
  }

  prepare(sql) {
    return {
      run: (...params) => {
        return this.client.execute({
          sql,
          args: params,
        });
      },
      get: (...params) => {
        const result = this.client.execute({
          sql,
          args: params,
        });
        return result.rows?.[0];
      },
      all: (...params) => {
        const result = this.client.execute({
          sql,
          args: params,
        });
        return result.rows || [];
      },
    };
  }
}

module.exports = new Database();
