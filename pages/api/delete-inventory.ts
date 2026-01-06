import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "../../utils/supabase";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "DELETE") {
    res.setHeader("Allow", ["DELETE"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const { ids } = req.body as { ids: string[] };

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "No IDs provided" });
    }

    // Optionally validate IDs format here if you have specific ID format

    // Supabase deletes one at a time, but you can use 'in' filter
    const { error } = await supabase
      .from("inventory")
      .delete()
      .in("id", ids);

    if (error) {
      throw error;
    }

    return res.status(200).json({ success: true, deletedCount: ids.length });
  } catch (error: any) {
    console.error("Error deleting inventory:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
