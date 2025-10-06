import mongoose from "mongoose";

const uri = process.env.MONGODB_URI!;
const dbName = process.env.MONGODB_DB!;
if (!uri || !dbName) throw new Error("Missing MONGODB_* envs");

declare global {
  var __mongooseConn: Promise<typeof mongoose> | undefined;
}

export async function connectToDB() {
  if (!global.__mongooseConn) {
    global.__mongooseConn = mongoose.connect(uri, { dbName });
  }
  return global.__mongooseConn;
}
