import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { full_name, email, phone_number, address, account_type } = body;

        if (!full_name || !email || !phone_number || !account_type) {
            return NextResponse.json({ success: false, error: 'Thiếu thông tin bắt buộc' }, { status: 400 });
        }

        // Tìm account_type_id dựa trên type_name
        const typeResult = await pool.query('SELECT account_type_id FROM Account_Types WHERE type_name = $1', [account_type]);
        if (typeResult.rowCount === 0) {
            return NextResponse.json({ success: false, error: 'Loại tài khoản không hợp lệ' }, { status: 400 });
        }
        const account_type_id = typeResult.rows[0].account_type_id;

        // Bắt đầu một Transaction an toàn
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Tạo Customer mới
            const customerResult = await client.query(
                `INSERT INTO Customers (full_name, email, phone_number, address, status) 
                 VALUES ($1, $2, $3, $4, 'ACTIVE') RETURNING customer_id`,
                [full_name, email, phone_number, address]
            );
            const customer_id = customerResult.rows[0].customer_id;

            // 2. Tạo số tài khoản ngẫu nhiên định dạng 10 chữ số
            const randomAccountBuffer = Math.floor(1000000000 + Math.random() * 9000000000).toString();

            // 3. Tạo Account
            await client.query(
                `INSERT INTO Accounts (customer_id, account_type_id, account_number, balance, status) 
                 VALUES ($1, $2, $3, 0.00, 'ACTIVE')`,
                [customer_id, account_type_id, randomAccountBuffer]
            );

            await client.query('COMMIT');
            return NextResponse.json({ success: true, account_number: randomAccountBuffer });
        } catch (txnError: any) {
            await client.query('ROLLBACK');
            throw txnError;
        } finally {
            client.release();
        }

    } catch (error: any) {
        // Xử lý lỗi trùng lặp (UNIQUE constraint violation)
        if (error.code === '23505') {
            return NextResponse.json({ success: false, error: 'Email hoặc số điện thoại đã tồn tại trong hệ thống' }, { status: 400 });
        }
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
