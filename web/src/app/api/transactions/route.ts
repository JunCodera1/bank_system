import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
    try {
        const result = await pool.query(`
            SELECT 
                t.reference_code, 
                t.transaction_type, 
                t.amount, 
                t.status, 
                t.transaction_date, 
                t.description,
                tel.full_name as teller_name,
                a_from.account_number as from_account,
                a_to.account_number as to_account
            FROM Transactions t
            LEFT JOIN Tellers tel ON t.teller_id = tel.teller_id
            LEFT JOIN Accounts a_from ON t.from_account_id = a_from.account_id
            LEFT JOIN Accounts a_to ON t.to_account_id = a_to.account_id
            ORDER BY t.transaction_date DESC
            LIMIT 15
        `);
        return NextResponse.json({ success: true, data: result.rows });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
