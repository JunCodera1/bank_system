'use client';

import { useState, useEffect } from 'react';
import {
  Landmark,
  Wallet,
  Send,
  ShieldCheck,
  Users,
  ArrowRightLeft,
  RefreshCw,
  Info,
  UserPlus
} from 'lucide-react';
import './spin.css';

type Customer = {
  'Customer Name': string;
  'Account Number': string;
  'Account Type': string;
  'Current Balance': string;
};

export default function Home() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  // Deposit Form
  const [depositAcc, setDepositAcc] = useState('');
  const [depositAmount, setDepositAmount] = useState('');

  // Transfer Form
  const [transferFrom, setTransferFrom] = useState('');
  const [transferTo, setTransferTo] = useState('');
  const [transferAmount, setTransferAmount] = useState('');

  // Register Form
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [regType, setRegType] = useState('Checking Account');

  const [message, setMessage] = useState({ text: '', type: '' });

  const fetchCustomers = async () => {
    try {
      const res = await fetch('/api/customers');
      const data = await res.json();
      if (data.success) {
        setCustomers(data.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 6000);
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!depositAcc || !depositAmount) return;

    try {
      const res = await fetch('/api/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_number: depositAcc, amount: parseFloat(depositAmount) })
      });
      const data = await res.json();

      if (data.success) {
        showMessage('Nạp tiền thành công!', 'success');
        setDepositAcc('');
        setDepositAmount('');
        fetchCustomers();
      } else {
        showMessage(data.error || 'Lỗi nạp tiền', 'error');
      }
    } catch (err: any) {
      showMessage(err.message, 'error');
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferFrom || !transferTo || !transferAmount) return;

    try {
      const res = await fetch('/api/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_account: transferFrom,
          to_account: transferTo,
          amount: parseFloat(transferAmount)
        })
      });
      const data = await res.json();

      if (data.success) {
        showMessage('Chuyển khoản thành công!', 'success');
        setTransferFrom('');
        setTransferTo('');
        setTransferAmount('');
        fetchCustomers();
      } else {
        showMessage(data.error || 'Lỗi chuyển khoản', 'error');
      }
    } catch (err: any) {
      showMessage(err.message, 'error');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || !regEmail || !regPhone || !regType) return;

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: regName,
          email: regEmail,
          phone_number: regPhone,
          address: regAddress,
          account_type: regType
        })
      });
      const data = await res.json();

      if (data.success) {
        showMessage(`Mở tài khoản thành công! Số TK mới: ${data.account_number}`, 'success');
        setRegName('');
        setRegEmail('');
        setRegPhone('');
        setRegAddress('');
        fetchCustomers();
      } else {
        showMessage(data.error || 'Đăng ký thất bại', 'error');
      }
    } catch (err: any) {
      showMessage(err.message, 'error');
    }
  };

  const formatCurrency = (amountStr: string) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(Number(amountStr));
  };

  return (
    <main className="container animate-fade-in">
      <div className="flex-between mb-6 mt-8">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', padding: '0.75rem', borderRadius: '16px' }}>
            <Landmark size={32} color="white" />
          </div>
          <div>
            <h1>Nexus Banking</h1>
            <p style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldCheck size={16} color="var(--success)" />
              Hệ thống Quản trị Cơ sở dữ liệu Nội bộ
            </p>
          </div>
        </div>
        <button onClick={fetchCustomers} style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.3)' }}>
          <RefreshCw size={18} /> Cập nhật Data
        </button>
      </div>

      {message.text && (
        <div style={{
          padding: '1rem',
          borderRadius: '12px',
          marginBottom: '1.5rem',
          background: message.type === 'success' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
          border: `1px solid ${message.type === 'success' ? 'var(--success)' : 'var(--danger)'}`,
          color: message.type === 'success' ? '#4ade80' : '#f87171',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }} className="animate-fade-in">
          <Info size={20} />
          {message.text}
        </div>
      )}

      {/* Row 1: Dashboard + Create Account */}
      <div className="grid-cols-2 animate-fade-in animate-delay-1 mb-6">

        {/* Customer Accounts Overview Array */}
        <div className="glass-panel" style={{ padding: '1.5rem', overflowX: 'auto', gridColumn: '1 / 3' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Users size={24} color="var(--primary)" />
            Tổng quan Tài khoản Khách hàng
          </h2>
          {loading ? (
            <div style={{ color: 'var(--text-secondary)', padding: '2rem 0', textAlign: 'center' }}>
              <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 1rem auto' }} />
              Đang tải dữ liệu từ CSDL...
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tên Khách Hàng</th>
                  <th>Số Tài Khoản</th>
                  <th>Loại Tài Khoản</th>
                  <th>Số Dư Hiện Tại</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 500, color: 'white' }}>{c['Customer Name']}</td>
                    <td style={{ fontFamily: 'monospace', letterSpacing: '2px', color: '#cbd5e1' }}>{c['Account Number']}</td>
                    <td>
                      <span style={{
                        background: 'rgba(255,255,255,0.1)',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontSize: '0.8rem'
                      }}>
                        {c['Account Type']}
                      </span>
                    </td>
                    <td className="currency" style={{ fontSize: '1.1rem' }}>
                      {formatCurrency(c['Current Balance'])}
                    </td>
                  </tr>
                ))}
                {customers.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
                      Chưa có tài khoản nào hợp lệ
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="grid-cols-2 animate-fade-in animate-delay-2 mb-6">
        {/* Registration Panel */}
        <div className="glass-panel" style={{ padding: '1.5rem', gridColumn: '1 / 3' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <UserPlus size={24} color="#60a5fa" /> Mở Tài Khoản Mới
          </h2>
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="grid-cols-2" style={{ gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  Họ và tên
                </label>
                <input
                  type="text"
                  placeholder="Nguyễn Văn C"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  Email Đăng ký
                </label>
                <input
                  type="email"
                  placeholder="nguyenvanc@example.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  Số điện thoại
                </label>
                <input
                  type="text"
                  placeholder="09..."
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  Loại Tài khoản
                </label>
                <select
                  value={regType}
                  onChange={(e) => setRegType(e.target.value)}
                  style={{
                    width: '100%', padding: '0.75rem 1rem', borderRadius: '12px',
                    border: '1px solid var(--surface-border)', background: 'rgba(15, 23, 42, 0.6)',
                    color: 'var(--text-primary)', fontFamily: 'var(--font-base)', fontSize: '1rem',
                    outline: 'none', appearance: 'none'
                  }}
                  required
                >
                  <option value="Checking Account">Checking Account (Thanh toán)</option>
                  <option value="Savings Account">Savings Account (Tiết kiệm)</option>
                </select>
              </div>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                Địa chỉ (Tùy chọn)
              </label>
              <input
                type="text"
                placeholder="Số XYZ Đường..."
                value={regAddress}
                onChange={(e) => setRegAddress(e.target.value)}
              />
            </div>
            <button type="submit" style={{ marginTop: '0.5rem', background: '#3b82f6' }}>
              <UserPlus size={18} /> Kiến tạo Tài Khoản
            </button>
          </form>
        </div>
      </div>

      <div className="grid-cols-2 animate-fade-in animate-delay-3" style={{ marginBottom: '4rem' }}>
        {/* Deposit Panel */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Wallet size={24} color="var(--success)" /> Nạp Tiền
          </h2>
          <form onSubmit={handleDeposit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                Số tài khoản đích
              </label>
              <input
                type="text"
                placeholder="VD: 1010101010"
                value={depositAcc}
                onChange={(e) => setDepositAcc(e.target.value)}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                Khối lượng (VNĐ)
              </label>
              <input
                type="number"
                min="1000"
                step="100"
                placeholder="Nhập số tiền nạp..."
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                required
              />
            </div>
            <button type="submit" style={{ marginTop: '0.5rem', background: 'var(--success)' }}>
              <Wallet size={18} /> Xác nhận Nạp tiền
            </button>
          </form>
        </div>

        {/* Transfer Panel */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <ArrowRightLeft size={24} color="var(--accent)" /> Chuyển Khoản Nội Bộ
          </h2>
          <form onSubmit={handleTransfer} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="grid-cols-2" style={{ gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  Từ (Người gửi)
                </label>
                <input
                  type="text"
                  placeholder="VD: 1010101010"
                  value={transferFrom}
                  onChange={(e) => setTransferFrom(e.target.value)}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  Đến (Người nhận)
                </label>
                <input
                  type="text"
                  placeholder="VD: 2020202020"
                  value={transferTo}
                  onChange={(e) => setTransferTo(e.target.value)}
                  required
                />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                Số lượng (VNĐ)
              </label>
              <input
                type="number"
                min="1000"
                step="100"
                placeholder="Nhập số tiền giao dịch..."
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="accent" style={{ marginTop: '0.5rem' }}>
              <Send size={18} /> Thực thi Lệnh Chuyển
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
