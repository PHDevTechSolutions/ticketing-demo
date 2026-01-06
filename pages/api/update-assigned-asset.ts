// pages/api/update-assigned-asset.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/utils/supabase";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PUT") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { id, new_user, position, department } = req.body;

  if (!id || !new_user || !position || !department) {
    return res.status(400).json({ error: "Incomplete data" });
  }

  try {
    const { error } = await supabase
      .from("assign_asset")
      .update({ new_user, position, department })
      .eq("id", id);

    if (error) throw error;

    res.status(200).json({ success: true });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}
