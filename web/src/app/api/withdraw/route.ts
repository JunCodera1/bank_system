import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(request: Request) {
    try {
        const { account_number, amount, teller_id } = await request.json();

        if (!account_number || !amount) {
            return NextResponse.json({ success: false, error: 'Thiếu thông tin rút tiền bắt buộc.' }, { status: 400 });
        }

        const accResult = await pool.query('SELECT account_id, balance FROM Accounts WHERE account_number = $1 AND status = \'ACTIVE\'', [account_number]);
        if (accResult.rowCount === 0) {
            return NextResponse.json({ success: false, error: 'Tài khoản không tồn tại hoặc đang bị KHÓA. Giao dịch từ chối.' }, { status: 404 });
        }

        const targetAccountId = accResult.rows[0].account_id;
        const currentBalance = Number(accResult.rows[0].balance);

        if (currentBalance < Number(amount)) {
            return NextResponse.json({ success: false, error: `Số dư trong thẻ không đủ để rút. (Hiện tại: ${currentBalance} VNĐ)` }, { status: 400 });
        }

        // Tạo giao dịch: Rút tiền (WITHDRAWAL)
        await pool.query(
            `INSERT INTO Transactions (teller_id, from_account_id, amount, transaction_type, status, description) 
       VALUES ($1, $2, $3, 'WITHDRAWAL', 'COMPLETED', 'Rút tiền Khách tại quầy')`,
            [teller_id || '99999999-9999-9999-9999-999999999999', targetAccountId, amount]
        );

        return NextResponse.json({ success: true, message: 'Đã xuất phiếu Rút tiền thành công!' });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
