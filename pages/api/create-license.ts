import { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/utils/supabase"; // adjust the import path as needed

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const {
      referenceid,
      software_name,
      software_version,
      total_purchased,
      managed_installation,
      remaining,
      compliance_status,
      action,
      purchase_date,
      asset_age,
      remarks,
    } = req.body;

    if (!referenceid) {
      return res.status(400).json({ error: "referenceid is required" });
    }

    // Insert data into 'license' table
    const { data, error } = await supabase.from("license").insert([
      {
        referenceid,
        software_name: software_name ?? null,
        software_version: software_version ?? null,
        total_purchased: total_purchased ?? null,
        managed_installation: managed_installation ?? null,
        remaining: remaining ?? null,
        compliance_status: compliance_status ?? null,
        action: action ?? null,
        purchase_date: purchase_date ? new Date(purchase_date).toISOString() : null,
        asset_age: asset_age ?? null,
        remarks: remarks ?? null,
        date_created: new Date().toISOString(),
      },
    ]);

    if (error) {
      console.error("Supabase insert error:", error);
      return res.status(500).json({ error: "Failed to create license item" });
    }

    res.status(201).json({ message: "license item created", data });
  } catch (error) {
    console.error("Error creating license item:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
