import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "../../utils/supabase";

const prefixMap: Record<string, string> = {
  LAPTOP: "LAP",
  MONITOR: "MON",
  DESKTOP: "DES",
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
    const prefix = prefixMap[asset_type];
    const year = new Date().getFullYear();

    console.log(`Generating next asset tag for asset_type=${asset_type}, prefix=${prefix}, year=${year}`);

    // Regex pattern to match tags like LAP-2026-001
    const pattern = `^${prefix}-${year}-(\\d{3})$`;
    const regex = new RegExp(pattern);

    // Query Supabase for asset_tags starting with prefix-year-
    const { data, error } = await supabase
      .from("inventory")
      .select("asset_tag")
      .ilike("asset_tag", `${prefix}-${year}-%`);

    if (error) {
      console.error("Supabase query error:", error);
      return res.status(500).json({ error: "Error querying inventory" });
    }

    if (!data || data.length === 0) {
      console.log("No existing asset tags found for this prefix and year.");
    } else {
      console.log(`Found ${data.length} asset tags matching prefix-year.`);
    }

    const seqNumbers = data
      .map((item) => {
        if (!item.asset_tag) return NaN;
        const match = item.asset_tag.match(regex);
        return match ? parseInt(match[1], 10) : NaN;
      })
      .filter((n) => !isNaN(n));

    const maxSeq = seqNumbers.length > 0 ? Math.max(...seqNumbers) : 0;
    const nextSeq = (maxSeq + 1).toString().padStart(3, "0");
    const nextAssetTag = `${prefix}-${year}-${nextSeq}`;

    console.log(`Next asset tag generated: ${nextAssetTag}`);

    return res.status(200).json({ asset_tag: nextAssetTag });
  } catch (error) {
    console.error("Error generating next asset tag:", error);
    return res.status(500).json({ error: "Server error generating asset tag" });
  }
}
