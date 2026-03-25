import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
    try {
        const text = 'SELECT * FROM v_customer_summary ORDER BY "Customer Name"';
        const result = await pool.query(text);
        return NextResponse.json({ success: true, data: result.rows });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
