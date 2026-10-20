import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

// Create mongo client instance using env URI
const client = new MongoClient(process.env.MONGODB_URI);

let db;

export async function connectToMongoDB() {
  try {
    await client.connect();
    db = client.db(process.env.DB_NAME || 'swiftcounter');
    console.log("You successfully connected to MongoDB!");
    return db;
  } catch (err) {
    console.dir(err);
    process.exit(1);
  }
}

//get db instance for routes
export const getDB = () => db;

// Call this only when your application terminates
export async function disconnectFromMongoDB() {
//   await client.close();
}