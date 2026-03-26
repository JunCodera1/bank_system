import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(request: Request) {
    try {
        const { account_number, action } = await request.json(); // action: 'LOCK' | 'UNLOCK'

        if (!account_number || !action) {
            return NextResponse.json({ success: false, error: 'Thiếu thông tin yêu cầu.' }, { status: 400 });
        }

        const newStatus = action === 'LOCK' ? 'SUSPENDED' : 'ACTIVE';

        const accResult = await pool.query('SELECT account_id FROM Accounts WHERE account_number = $1', [account_number]);
        if (accResult.rowCount === 0) {
            return NextResponse.json({ success: false, error: 'Tài khoản không tồn tại.' }, { status: 404 });
        }

        const { account_id } = accResult.rows[0];

        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            // Chỉ Khóa thẻ Accounts (SUSPENDED), giữ nguyên trạng thái Khách hàng (ACTIVE) để họ không bị biến mất khỏi View
            await client.query('UPDATE Accounts SET status = $1 WHERE account_id = $2', [newStatus, account_id]);
            await client.query('COMMIT');

            return NextResponse.json({ success: true, message: `Đã ${action === 'LOCK' ? 'Khóa' : 'Mở khóa'} tài khoản thành công.` });
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }

    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
