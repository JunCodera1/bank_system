import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
    try {
        const result = await pool.query(`
            SELECT 
                al.log_id,
                al.action,
                al.old_data,
                al.new_data,
                al.changed_at,
                a.account_number
            FROM Audit_Logs al
            JOIN Accounts a ON al.account_id = a.account_id
            ORDER BY al.changed_at DESC
            LIMIT 15
        `);
        return NextResponse.json({ success: true, data: result.rows });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
