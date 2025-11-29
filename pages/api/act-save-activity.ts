// pages/api/history.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "../../utils/supabase";
import redis from "../../lib/redis";

const safe = (v: any) => (v === undefined || v === "" ? null : v);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const {
      activity_reference_number,
      account_reference_number,
      status,
      type_activity,
      referenceid,
      tsm,
      manager,
      target_quota,
      type_client,
      source,
      callback,
      call_status,
      call_type,
      product_category,
      project_type,
      project_name,
      quotation_number,
      quotation_amount,
      so_number,
      so_amount,
      dr_number,
      actual_sales,
      payment_terms,
      delivery_date,
      date_followup,
      remarks,
      start_date,
      end_date,
      date_created,
      date_updated,
    } = req.body;

    // Validation
    if (!activity_reference_number)
      return res.status(400).json({ error: "Missing activity_reference_number" });
    if (!account_reference_number)
      return res.status(400).json({ error: "Missing account_reference_number" });
    if (!status) return res.status(400).json({ error: "Missing status" });
    if (!type_activity)
      return res.status(400).json({ error: "Missing type_activity" });

    // Check cache if activity_reference_number exists
    const cacheKey = `history:${activity_reference_number}`;
    const cached = await redis.get(cacheKey);

    if (cached && typeof cached === "string") {
      return res.status(200).json({ success: true, data: JSON.parse(cached), cached: true });
    }

    // Insert sa Supabase kung walang cache
    const { data, error } = await supabase
      .from("history")
      .insert({
        referenceid: safe(referenceid),
        tsm: safe(tsm),
        manager: safe(manager),
        target_quota: safe(target_quota),
        type_client: safe(type_client),
        activity_reference_number,
        account_reference_number,
        status,
        type_activity,
        source: safe(source),
        callback: safe(callback),
        call_status: safe(call_status),
        call_type: safe(call_type),
        product_category: safe(product_category),
        project_type: safe(project_type),
        project_name: safe(project_name),
        quotation_number: safe(quotation_number),
        quotation_amount: safe(quotation_amount),
        so_number: safe(so_number),
        so_amount: safe(so_amount),
        dr_number: safe(dr_number),
        actual_sales: safe(actual_sales),
        payment_terms: safe(payment_terms),
        delivery_date: safe(delivery_date),
        date_followup: safe(date_followup),
        remarks: safe(remarks),
        start_date: safe(start_date),
        end_date: safe(end_date),
        date_created: safe(date_created),
        date_updated: safe(date_updated),
      })
      .select();

    if (error) {
      console.error("Supabase Insert Error:", error);
      return res.status(500).json({ error: error.message });
    }

    // Cache the inserted data for 5 minutes (300 seconds)
    await redis.set(cacheKey, JSON.stringify(data), { ex: 300 });

    return res.status(200).json({ success: true, data, cached: false });
  } catch (err: any) {
    console.error("Server Error:", err);
    return res.status(500).json({ error: "Server Error" });
  }
}
