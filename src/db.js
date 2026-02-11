import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  //host: process.env.DB_HOST,
  //port: Number(process.env.DB_PORT),
  //user: process.env.DB_USER,
  //password: process.env.DB_PASSWORD,
  //database: process.env.DB_NAME,
  connectionString: process.env.DATABASE_URL,

  ssl: {
    rejectUnauthorized: false,
  },

  idleTimeoutMillis: 30000,        // cierra conexiones inactivas
  connectionTimeoutMillis: 10000,  // evita cuelgues al conectar
});

pool.on("error", (err) => {
  console.error("Error inesperado en PostgreSQL Pool:", err);
});

export default pool;
