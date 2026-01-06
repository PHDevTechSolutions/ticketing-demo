import { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "../../utils/supabase";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PUT") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { id } = req.query;
  const updateData = req.body;

  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: "Missing or invalid 'id'" });
  }

  if (!updateData || typeof updateData !== "object") {
    return res.status(400).json({ error: "Missing or invalid request body" });
  }

  try {
    // fetch date_created
    const { data: existing, error: fetchError } = await supabase
      .from("inventory")
      .select("date_created")
      .eq("id", id)
      .single();

    if (fetchError) {
      return res.status(404).json({ error: "Inventory item not found" });
    }

    const updatedItem = {
      ...updateData,
      date_created: existing?.date_created || new Date().toISOString(),
      date_updated: new Date().toISOString(),
    };

    const { error: updateError } = await supabase
      .from("inventory")
      .update(updatedItem)
      .eq("id", id);

    if (updateError) {
      return res.status(500).json({ error: updateError.message });
    }

    return res.status(200).json({ message: "Updated successfully" });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
