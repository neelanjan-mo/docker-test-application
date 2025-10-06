import mongoose from "mongoose";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;

// Defensive check — don’t crash during build
if (!uri || !dbName) {
  console.warn("[DB] Skipping connection initialization (missing MONGODB_* envs)");
}

declare global {
  // eslint-disable-next-line no-var
  var __mongooseConn: Promise<typeof mongoose> | undefined;
}

export async function connectToDB() {
  if (!uri || !dbName) {
    console.warn("[DB] Connection skipped — environment not configured.");
    return;
  }

  if (!global.__mongooseConn) {
    global.__mongooseConn = mongoose.connect(uri, { dbName });
    mongoose.connection.on("connected", () => {
      console.log(`[DB] Connected to database: ${dbName}`);
    });
    mongoose.connection.on("error", (err) => {
      console.error("[DB] Connection error:", err);
    });
  }

  return global.__mongooseConn;
}
