import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(request: Request) {
    try {
        const { from_account, to_account, amount } = await request.json();

        if (!from_account || !to_account || !amount) {
            return NextResponse.json({ success: false, error: 'Thiếu thông tin chuyển khoản' }, { status: 400 });
        }

        // Gọi Stored Function fn_transfer_money
        const result = await pool.query(
            'SELECT fn_transfer_money($1, $2, $3) as message',
            [from_account, to_account, amount]
        );

        return NextResponse.json({ success: true, message: result.rows[0].message });
    } catch (error: any) {
        // Nếu có EXCEPTION RAISE từ fn_transfer_money, nó sẽ bị bắt ở đây
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
