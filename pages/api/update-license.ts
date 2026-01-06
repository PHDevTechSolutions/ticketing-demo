import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/utils/supabase"; // adjust path if needed

export default async function updatelicense(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PUT") {
    res.setHeader("Allow", ["PUT"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const { id } = req.query;
  const updateData = req.body;

  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Missing or invalid 'id' query parameter" });
  }

  if (!updateData || typeof updateData !== "object") {
    return res.status(400).json({ error: "Missing or invalid request body" });
  }

  try {
    // First fetch the existing license item to preserve date_created
    const { data: existingItem, error: fetchError } = await supabase
      .from("license")
      .select("date_created")
      .eq("id", id)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") { // No rows found
        return res.status(404).json({ error: "license item not found" });
      }
      console.error("Supabase fetch error:", fetchError);
      return res.status(500).json({ error: "Error fetching license item" });
    }

    const dateCreated = existingItem?.date_created || new Date().toISOString();

    // Prepare update payload
    const updatedPayload = {
      ...updateData,
      date_created: dateCreated,
      date_updated: new Date().toISOString(),
    };

    // Perform update
    const { error: updateError } = await supabase
      .from("license")
      .update(updatedPayload)
      .eq("id", id);

    if (updateError) {
      console.error("Supabase update error:", updateError);
      return res.status(500).json({ error: "Error updating license item" });
    }

    return res.status(200).json({ message: "license item updated successfully" });
  } catch (error) {
    console.error("Unexpected error updating license:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
