import { Pool } from 'pg';

// Bắt buộc cấu hình host là localhost, port 5433 như lúc deploy database
const pool = new Pool({
    user: 'bank_admin',
    password: 'SecretPassword123!',
    host: 'localhost',
    port: 5433,
    database: 'bank_management',
});

export default pool;
