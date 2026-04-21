import { supabase } from "./supabase";

const BATCH_SIZE = 1000; // Supabase max limit per request

/**
 * Fetches all rows from a Supabase table without the 1000 row limit.
 * Uses pagination with range() to fetch data in batches.
 */
export async function fetchAllSupabaseRows<T = any>(
  table: string,
  select: string = "*",
  orderBy?: { column: string; ascending?: boolean }
): Promise<T[]> {
  const allData: T[] = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    let query = supabase.from(table).select(select);

    if (orderBy) {
      query = query.order(orderBy.column, {
        ascending: orderBy.ascending ?? false,
      });
    }

    const { data, error } = await query.range(offset, offset + BATCH_SIZE - 1);

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      hasMore = false;
      break;
    }

    allData.push(...(data as T[]));

    // If we got less than BATCH_SIZE rows, we've reached the end
    if (data.length < BATCH_SIZE) {
      hasMore = false;
    } else {
      offset += BATCH_SIZE;
    }
  }

  return allData;
}

/**
 * Fetches all rows from a Supabase table with filters
 */
export async function fetchAllSupabaseRowsWithFilter<T = any>(
  table: string,
  select: string = "*",
  filterFn?: (query: any) => any,
  orderBy?: { column: string; ascending?: boolean }
): Promise<T[]> {
  const allData: T[] = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    let query = supabase.from(table).select(select);

    if (filterFn) {
      query = filterFn(query);
    }

    if (orderBy) {
      query = query.order(orderBy.column, {
        ascending: orderBy.ascending ?? false,
      });
    }

    const { data, error } = await query.range(offset, offset + BATCH_SIZE - 1);

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      hasMore = false;
      break;
    }

    allData.push(...(data as T[]));

    if (data.length < BATCH_SIZE) {
      hasMore = false;
    } else {
      offset += BATCH_SIZE;
    }
  }

  return allData;
}
