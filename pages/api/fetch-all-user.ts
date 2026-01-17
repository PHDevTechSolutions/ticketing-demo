import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "@/lib/mongodb";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  try {
    const db = await connectToDatabase();

    // Fetch ALL users (no TSM filter)
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

    if (users.length === 0) {
      return res.status(404).json({ error: "No users found" });
    }

    res.status(200).json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Server error fetching users" });
  }
}
