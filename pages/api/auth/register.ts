// pages/api/register.ts

import { NextApiRequest, NextApiResponse } from "next";
import { registerUser } from "@/lib/mongodb"; // Adjust this if needed

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method Not Allowed" });
  }

  const { Email, Password, Role, Firstname, Lastname, ReferenceID } = req.body;

  // Basic field validation
  if (!Email || !Password || !Role || !Firstname || !Lastname || !ReferenceID) {
    return res.status(400).json({ success: false, message: "All fields are required" });
  }

  try {
    const response = await registerUser({
      Email,
      Password,
      Role,
      Firstname,
      Lastname,
      ReferenceID,
    });

    if (response.success) {
      return res.status(200).json({ success: true });
    } else {
      return res.status(400).json({ success: false, message: response.message });
    }
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({ success: false, message: "An error occurred while registering!" });
  }
}