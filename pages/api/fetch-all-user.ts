import { NextApiRequest, NextApiResponse } from "next";
import { MongoClient, Db } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB;

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

// Helper to connect to MongoDB
async function connectToMongo(): Promise<Db> {
  if (cachedDb && cachedClient) return cachedDb;

  if (!MONGODB_URI) throw new Error("Missing MONGODB_URI environment variable");
  if (!MONGODB_DB) throw new Error("Missing MONGODB_DB environment variable");

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(MONGODB_DB);

  cachedClient = client;
  cachedDb = db;
  return db;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  try {
    const db = await connectToMongo();

    // Fetch ALL users
    const users = await db
      .collection("users")
      .find({})
      .project({
        Firstname: 1,
        Lastname: 1,
        ReferenceID: 1,
        profilePicture: 1,
        _id: 0,
      })
      .toArray();

    if (!users || users.length === 0) {
      return res.status(404).json({ error: "No users found" });
    }

    res.status(200).json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Server error fetching users" });
  }
}