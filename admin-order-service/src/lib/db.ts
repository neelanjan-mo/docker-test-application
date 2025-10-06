import mongoose from "mongoose";

const uri = process.env.MONGODB_URI!;
const dbName = process.env.MONGODB_DB!;

if (!uri || !dbName) {
  throw new Error("Missing MONGODB_URI or MONGODB_DB");
}

declare global {
  // eslint-disable-next-line no-var
  var __mongooseConn: Promise<typeof mongoose> | undefined;
}

export async function connectToDB() {
  if (!global.__mongooseConn) {
    global.__mongooseConn = mongoose.connect(uri, { dbName });
    mongoose.connection.on("connected", () => {
      console.log(`[DB] Connected: ${dbName}`);
    });
  }
  return global.__mongooseConn;
}
