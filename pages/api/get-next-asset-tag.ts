import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "@/lib/mongodb";

const prefixMap: Record<string, string> = {
  Laptop: "LAP",
  Monitor: "MON",
  Desktop: "DES",
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  const asset_type = req.query.asset_type;
  if (!asset_type || typeof asset_type !== "string" || !prefixMap[asset_type]) {
    return res.status(400).json({ error: "Invalid or missing asset_type" });
  }

  try {
    const db = await connectToDatabase();
    const prefix = prefixMap[asset_type];
    const year = new Date().getFullYear();

    // Regex pattern for matching asset tags like LAP-2025-001
    const regex = new RegExp(`^${prefix}-${year}-(\\d{3})$`);

    // Find all asset_tags for this type/year
    const items = await db
      .collection("inventory")
      .find({ asset_tag: { $regex: regex } })
      .toArray();

    // Extract sequence numbers, find max
    const seqNumbers = items
      .map((item) => {
        const match = item.asset_tag?.match(regex);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter((n) => !isNaN(n));

    const maxSeq = seqNumbers.length > 0 ? Math.max(...seqNumbers) : 0;
    const nextSeq = (maxSeq + 1).toString().padStart(3, "0");

    const nextAssetTag = `${prefix}-${year}-${nextSeq}`;

    res.status(200).json({ asset_tag: nextAssetTag });
  } catch (error) {
    console.error("Error generating next asset tag:", error);
    res.status(500).json({ error: "Server error generating asset tag" });
  }
}
