import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/utils/supabase";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  const { ids, newStatus } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: "'ids' must be a non-empty array" });
  }

  if (typeof newStatus !== "string" || !newStatus.trim()) {
    return res.status(400).json({ error: "'newStatus' must be a non-empty string" });
  }

  try {
    const { error } = await supabase
      .from("inventory")
      .update({ status: newStatus })
      .in("id", ids);

    if (error) {
      console.error("Supabase update error:", error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ message: `Updated ${ids.length} items to status '${newStatus}'` });
  } catch (err) {
    console.error("Unexpected error:", err);
    return res.status(500).json({ error: "Unexpected server error" });
  }
}
