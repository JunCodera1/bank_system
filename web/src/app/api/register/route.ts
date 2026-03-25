import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(request: Request) {
    const client = await pool.connect();
    try {
        const body = await request.json();
        const { full_name, email, phone_number, address, account_type } = body;

        if (!full_name || !email || !phone_number || !account_type) {
            return NextResponse.json({ success: false, error: 'Vui lòng điền đủ thông tin bắt buộc.' }, { status: 400 });
        }

        await client.query('BEGIN'); // Start Transaction

        // 1. Get Account Type ID
        const typeRes = await client.query('SELECT account_type_id FROM Account_Types WHERE type_name = $1 LIMIT 1', [account_type]);
        if (typeRes.rowCount === 0) {
            throw new Error(`Loại tài khoản '${account_type}' không hợp lệ.`);
        }
        const typeId = typeRes.rows[0].account_type_id;

        // 2. Insert Customer
        const custRes = await client.query(
            'INSERT INTO Customers (full_name, email, phone_number, address) VALUES ($1, $2, $3, $4) RETURNING customer_id',
            [full_name, email, phone_number, address || null]
        );
        const customerId = custRes.rows[0].customer_id;

        // 3. Generate a 10-digit random account number
        const accountNumber = Math.floor(1000000000 + Math.random() * 9000000000).toString();

        // 4. Create Account (Balance starts at 0)
        await client.query(
            'INSERT INTO Accounts (customer_id, account_type_id, account_number, balance) VALUES ($1, $2, $3, 0)',
            [customerId, typeId, accountNumber]
        );

        await client.query('COMMIT'); // Commit Transaction

        return NextResponse.json({ success: true, account_number: accountNumber });
    } catch (error: any) {
        await client.query('ROLLBACK'); // Rollback if any error occurs

        // Xử lý lỗi trùng lặp (UNIQUE Constraint violation)
        if (error.code === '23505') {
            return NextResponse.json({ success: false, error: 'Email hoặc số điện thoại đã được đăng ký!' }, { status: 400 });
        }
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    } finally {
        client.release();
    }
}
