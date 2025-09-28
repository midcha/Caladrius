import mongoose from "mongoose";

// Cache the connection in dev to avoid creating multiple connections on HMR
declare global {
  // eslint-disable-next-line no-var
  var _mongooseConn: Promise<typeof mongoose> | undefined;
}

export async function connectToDatabase() {
  const uri =
    process.env.MONGODB_URI ||
    process.env.MONGO_URI ||
    ""; // fallback empty so we throw meaningful error below

  if (!uri) {
    throw new Error(
      "Missing MONGODB_URI (or MONGO_URI) environment variable. Add it to .env.local"
    );
  }

  if (process.env.NODE_ENV === "development") {
    if (!global._mongooseConn) {
      global._mongooseConn = mongoose.connect(uri, {
        // Add any options if needed
      }).then(() => mongoose);
    }
    return global._mongooseConn;
  }

  // In production, don't use global cache
  return mongoose.connect(uri).then(() => mongoose);
}
