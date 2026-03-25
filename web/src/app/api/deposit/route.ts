import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(request: Request) {
    try {
        const { account_number, amount } = await request.json();

        if (!account_number || !amount) {
            return NextResponse.json({ success: false, error: 'Thiếu thông tin nạp tiền' }, { status: 400 });
        }

        // Lấy account_id từ account_number
        const accResult = await pool.query('SELECT account_id FROM Accounts WHERE account_number = $1', [account_number]);
        if (accResult.rowCount === 0) {
            return NextResponse.json({ success: false, error: 'Tài khoản không tồn tại' }, { status: 404 });
        }

        const targetAccountId = accResult.rows[0].account_id;

        // Insert giao dịch nạp tiền, Trigger sẽ lo việc cộng balance
        await pool.query(
            `INSERT INTO Transactions (to_account_id, amount, transaction_type, description) 
       VALUES ($1, $2, 'DEPOSIT', 'Nạp tiền mặt từ Web App')`,
            [targetAccountId, amount]
        );

        return NextResponse.json({ success: true, message: 'Nạp tiền thành công!' });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
