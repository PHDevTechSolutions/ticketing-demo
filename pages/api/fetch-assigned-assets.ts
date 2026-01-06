import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/utils/supabase";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { referenceid } = req.query;

    if (!referenceid || typeof referenceid !== "string") {
        return res.status(400).json({ error: "Missing referenceid" });
    }

    const { data, error } = await supabase
        .from("assign_asset")
        .select("*")
        .eq("referenceid", referenceid)
        .order("date_created", { ascending: false });

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ data });
}
