import { Pool } from 'pg';
import { MongoClient } from 'mongodb'; // Keep for future MongoDB integration
import dotenv from 'dotenv';

dotenv.config(); // Ensure environment variables are loaded

// PostgreSQL Connection
let pgPool: Pool | null = null;

if (process.env.PG_DATABASE) { // Only initialize if PG_DATABASE is set
  pgPool = new Pool({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: Number(process.env.PG_PORT) || 5432,
    // ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false, // Optional: for production SSL
  });

  pgPool.on('connect', () => {
    console.log('🐘 Connected to PostgreSQL database:', process.env.PG_DATABASE);
  });

  pgPool.on('error', (err) => {
    console.error('Error with PostgreSQL pool:', err.stack);
    // Consider whether to exit or attempt to reconnect, or if queries will just fail.
  });

  // Test the connection
  pgPool.query('SELECT NOW()', (err, res) => {
    if (err) {
      console.error('PostgreSQL connection test failed:', err.stack);
    } else {
      console.log('PostgreSQL connection test successful, current time from DB:', res.rows[0].now);
    }
  });

} else {
  console.warn("⚠️ PostgreSQL database not configured (PG_DATABASE not set in .env). User and Venue data will not be persisted for PostgreSQL.");
}


// MongoDB Connection (Placeholder for now)
// const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/pawsroam';
// let mongoClient: MongoClient | null = null;

// async function connectMongo() {
//   if (process.env.MONGO_URI) {
//     mongoClient = new MongoClient(mongoUri);
//     try {
//       await mongoClient.connect();
//       console.log('🍃 Connected to MongoDB database');
//       // const db = mongoClient.db(process.env.MONGO_DB_NAME || 'pawsroam');
//       // return db;
//     } catch (error) {
//       console.error('Error connecting to MongoDB:', error);
//     }
//   } else {
//     console.warn("MongoDB URI not configured. MongoDB features will be disabled.");
//   }
// }
// connectMongo(); // Call if you want to connect on startup

export { pgPool /*, mongoClient */ }; // Export connections/clients
