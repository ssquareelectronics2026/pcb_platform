import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { adminSecret, table = 'components', targetValue } = body;

    // 1. Verify Admin Secret
    const validSecret = process.env.ADMIN_SECRET || process.env.NEXT_PUBLIC_ADMIN_SECRET || '';
    if (adminSecret && adminSecret !== validSecret) {
      return NextResponse.json({ error: 'Unauthorized: Invalid admin secret key.' }, { status: 401 });
    }

    const tableName = table === 'component_requests' ? 'component_requests' : 'components';

    // 2. Initialize Supabase Client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 3. Fetch all existing IDs to compute max ID and lowest available gap
    const { data: records, error: fetchError } = await supabase
      .from(tableName)
      .select('id')
      .order('id', { ascending: true });

    if (fetchError) {
      console.error(`Error querying ${tableName} IDs:`, fetchError);
      return NextResponse.json({ error: `Database query error: ${fetchError.message}` }, { status: 500 });
    }

    const idList = (records || [])
      .map((r: { id: string | number }) => Number(r.id))
      .filter((n: number) => Number.isInteger(n) && n > 0);

    const maxId = idList.length > 0 ? Math.max(...idList) : 0;

    // Calculate lowest available gap starting at 1
    const idSet = new Set(idList);
    let lowestAvailableId = 1;
    while (idSet.has(lowestAvailableId)) {
      lowestAvailableId++;
    }

    // 4. Try calling Supabase RPC if database function exists
    let rpcExecuted = false;
    let rpcResult: unknown = null;

    try {
      if (typeof targetValue === 'number' && targetValue >= 0) {
        const { data, error } = await supabase.rpc('set_table_sequence', {
          seq_table: tableName,
          target_val: targetValue,
        });
        if (!error) {
          rpcExecuted = true;
          rpcResult = data;
        }
      } else if (tableName === 'components') {
        const { data, error } = await supabase.rpc('reset_components_sequence');
        if (!error) {
          rpcExecuted = true;
          rpcResult = data;
        }
      }
    } catch (rpcErr) {
      console.warn('RPC sequence reset note (SQL function may not be applied yet):', rpcErr);
    }

    return NextResponse.json({
      success: true,
      table: tableName,
      maxId,
      lowestAvailableId,
      nextSequentialId: maxId + 1,
      rpcExecuted,
      rpcResult,
      message: `ID sequence inspected for table "${tableName}". Max existing ID: ${maxId}. Lowest available gap: ${lowestAvailableId}.`,
    });
  } catch (err: unknown) {
    console.error('reset-sequence API error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
