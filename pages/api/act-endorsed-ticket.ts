// pages/api/act-endorsed-ticket.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { MongoClient } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB;

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable inside .env.local");
}

if (!MONGODB_DB) {
  throw new Error("Please define the MONGODB_DB environment variable inside .env.local");
}

const mongoUri: string = MONGODB_URI;
const mongoDb: string = MONGODB_DB;

let cachedClient: MongoClient | null = null;
let cachedDb: any = null;

async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const client = new MongoClient(mongoUri);
  await client.connect();
  const db = client.db(mongoDb);

  cachedClient = client;
  cachedDb = db;

  return { client, db };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const body = req.body;

    // Extract and validate as strings to avoid undefined errors
    const account_reference_number = typeof body.account_reference_number === "string" ? body.account_reference_number : "";
    const company_name = typeof body.company_name === "string" ? body.company_name : "";
    const contact_person = typeof body.contact_person === "string" ? body.contact_person : "";
    const contact_number = typeof body.contact_number === "string" ? body.contact_number : "";
    const email_address = typeof body.email_address === "string" ? body.email_address : "";
    const address = typeof body.address === "string" ? body.address : "";
    const ticket_reference_number = typeof body.ticket_reference_number === "string" ? body.ticket_reference_number : "";
    const wrap_up = typeof body.wrap_up === "string" ? body.wrap_up : "";
    const inquiry = typeof body.inquiry === "string" ? body.inquiry : "";
    const manager = typeof body.manager === "string" ? body.manager : "";
    const agent = typeof body.agent === "string" ? body.agent : "";

    // (Optional) Basic required field check - remove if no validation needed
    if (
      !account_reference_number ||
      !company_name ||
      !contact_person ||
      !contact_number ||
      !email_address ||
      !address ||
      !ticket_reference_number ||
      !wrap_up ||
      !inquiry ||
      !manager ||
      !agent
    ) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const { db } = await connectToDatabase();
    const collection = db.collection("endorsed-ticket");

    const now = new Date();

    const result = await collection.insertOne({
      account_reference_number,
      company_name,
      contact_person,
      contact_number,
      email_address,
      address,
      ticket_reference_number,
      wrap_up,
      inquiry,
      manager,
      agent,
      date_created: now,
      date_updated: now,
    });

    return res.status(201).json({ message: "Endorsed ticket saved", id: result.insertedId });
  } catch (error: any) {
    console.error("Failed to save endorsed ticket:", error);
    return res.status(500).json({ error: "Failed to save endorsed ticket" });
  }
}
