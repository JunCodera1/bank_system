'use client';

import { useState, useEffect } from 'react';
import {
  Landmark, Wallet, Send, ShieldCheck, Users, ArrowRightLeft,
  RefreshCw, Info, UserPlus, Lock, Unlock, Activity, User, Search, Fingerprint, Banknote
} from 'lucide-react';
import './spin.css';

type Customer = {
  'Customer Name': string;
  'Account Number': string;
  'Account Type': string;
  'Current Balance': string;
  'Account Status': string;
};

type Teller = { teller_id: string, full_name: string, role: string, branch_name: string };
type Transaction = {
  reference_code: string; transaction_type: string; amount: string;
  status: string; transaction_date: string; description: string;
  teller_name: string; from_account: string; to_account: string;
};
type AuditLog = {
  log_id: string; action: string; old_data: any; new_data: any; changed_at: string; account_number: string;
};

export default function Home() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [tellers, setTellers] = useState<Teller[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [audits, setAudits] = useState<AuditLog[]>([]);

  const [selectedTeller, setSelectedTeller] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Forms
  const [depositAcc, setDepositAcc] = useState('');
  const [depositAmount, setDepositAmount] = useState('');

  const [withdrawAcc, setWithdrawAcc] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');

  const [transferFrom, setTransferFrom] = useState('');
  const [transferTo, setTransferTo] = useState('');
  const [transferAmount, setTransferAmount] = useState('');

  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [regType, setRegType] = useState('Checking Account');

  const [message, setMessage] = useState({ text: '', type: '' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [cusRes, telRes, txnRes, audRes] = await Promise.all([
        fetch('/api/customers'),
        fetch('/api/tellers'),
        fetch('/api/transactions'),
        fetch('/api/audit')
      ]);
      const cusData = await cusRes.json();
      const telData = await telRes.json();
      const txnData = await txnRes.json();
      const audData = await audRes.json();

      if (cusData.success) setCustomers(cusData.data);
      if (telData.success) {
        setTellers(telData.data);
        if (telData.data.length > 0 && !selectedTeller) setSelectedTeller(telData.data[0].teller_id);
      }
      if (txnData.success) setTransactions(txnData.data);
      if (audData.success) setAudits(audData.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_number: depositAcc, amount: parseFloat(depositAmount), teller_id: selectedTeller })
      });
      const data = await res.json();
      if (data.success) { showMessage(data.message || 'Nạp tiền thành công!', 'success'); setDepositAcc(''); setDepositAmount(''); fetchData(); }
      else showMessage(data.error || 'Lỗi nạp tiền', 'error');
    } catch (err: any) { showMessage(err.message, 'error'); }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!withdrawAcc || !withdrawAmount) return;
    try {
      const res = await fetch('/api/withdraw', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_number: withdrawAcc, amount: parseFloat(withdrawAmount), teller_id: selectedTeller })
      });
      const data = await res.json();
      if (data.success) { showMessage(data.message, 'success'); setWithdrawAcc(''); setWithdrawAmount(''); fetchData(); }
      else showMessage(data.error || 'Lỗi rút tiền', 'error');
    } catch (err: any) { showMessage(err.message, 'error'); }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferFrom || !transferTo || !transferAmount) return;
    try {
      const res = await fetch('/api/transfer', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from_account: transferFrom, to_account: transferTo, amount: parseFloat(transferAmount), teller_id: selectedTeller })
      });
      const data = await res.json();
      if (data.success) { showMessage(data.message || 'Chuyển khoản thành công!', 'success'); setTransferFrom(''); setTransferTo(''); setTransferAmount(''); fetchData(); }
      else showMessage(data.error || 'Lỗi chuyển khoản', 'error');
    } catch (err: any) { showMessage(err.message, 'error'); }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: regName, email: regEmail, phone_number: regPhone, address: regAddress, account_type: regType })
      });
      const data = await res.json();
      if (data.success) { showMessage(`Mở TK thành công! Số TK mới: ${data.account_number}`, 'success'); setRegName(''); setRegEmail(''); setRegPhone(''); setRegAddress(''); fetchData(); }
      else showMessage(data.error || 'Đăng ký thất bại', 'error');
    } catch (err: any) { showMessage(err.message, 'error'); }
  };

  const handleLockAccount = async (account_number: string, currentStatus: string) => {
    const action = currentStatus === 'ACTIVE' ? 'LOCK' : 'UNLOCK';
    if (!window.confirm(`Bạn có chắc muốn ${action === 'LOCK' ? 'Khóa' : 'Mở khóa'} tài khoản ${account_number}?`)) return;
    try {
      const res = await fetch('/api/customers/lock', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_number, action })
      });
      const data = await res.json();
      if (data.success) { showMessage(data.message, 'success'); fetchData(); }
      else showMessage(data.error || 'Lỗi xử lý', 'error');
    } catch (err: any) { showMessage(err.message, 'error'); }
  };

  const formatCurrency = (amountStr: string | number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(amountStr));
  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });

  const totalBalance = customers.reduce((acc, curr) => acc + Number(curr['Current Balance']), 0);

  // Aggregation Metrics
  const depositTotal = transactions.filter(t => t.transaction_type === 'DEPOSIT' && t.status === 'COMPLETED').reduce((acc, t) => acc + Number(t.amount), 0);
  const withdrawTotal = transactions.filter(t => t.transaction_type === 'WITHDRAWAL' && t.status === 'COMPLETED').reduce((acc, t) => acc + Number(t.amount), 0);
  const transferTotal = transactions.filter(t => t.transaction_type === 'TRANSFER' && t.status === 'COMPLETED').reduce((acc, t) => acc + Number(t.amount), 0);

  const checkingCount = customers.filter(c => c['Account Type'].includes('Checking')).length;
  const savingsCount = customers.filter(c => c['Account Type'].includes('Savings')).length;
  const totalCount = checkingCount + savingsCount || 1;

  const checkingPct = Math.round((checkingCount / totalCount) * 100);
  const savingsPct = 100 - checkingPct;
  const cashFlowMax = Math.max(depositTotal, withdrawTotal, transferTotal) || 1;

  const filteredCustomers = customers.filter(c =>
    c['Customer Name'].toLowerCase().includes(searchQuery.toLowerCase()) ||
    c['Account Number'].includes(searchQuery)
  );

  return (
    <main className="container animate-fade-in" style={{ paddingBottom: '4rem' }}>
      {/* HEADER NAVBAR */}
      <div className="glass-panel" style={{ padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', position: 'sticky', top: '1rem', zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', padding: '0.75rem', borderRadius: '16px' }}>
            <Landmark size={28} color="white" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Nexus Banking Core</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <ShieldCheck size={14} color="var(--success)" /> Nội bộ bảo mật
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(255,255,255,0.05)', padding: '0.5rem 1rem', borderRadius: '12px' }}>
            <User size={18} color="#94a3b8" />
            <select
              value={selectedTeller} onChange={e => setSelectedTeller(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: 'white', outline: 'none', fontSize: '0.95rem', cursor: 'pointer' }}>
              <option value="" disabled>-- Chọn Teller --</option>
              {tellers.map(t => <option key={t.teller_id} value={t.teller_id} style={{ color: 'black' }}>{t.full_name} ({t.branch_name})</option>)}
            </select>
          </div>
          <button onClick={fetchData} style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.3)', padding: '0.6rem 1rem' }}>
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Cập nhật
          </button>
        </div>
      </div>

      {message.text && (
        <div style={{
          padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem',
          background: message.type === 'success' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
          border: `1px solid ${message.type === 'success' ? 'var(--success)' : 'var(--danger)'}`,
          color: message.type === 'success' ? '#4ade80' : '#f87171',
          display: 'flex', alignItems: 'center', gap: '0.5rem'
        }} className="animate-fade-in"><Info size={20} /> {message.text}</div>
      )}

      {/* QUICK STATS */}
      <div className="grid-cols-3 mb-6" style={{ gap: '1.5rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Users size={18} /> Tổng T.Khoản Hợp lệ</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'white' }}>{customers.length}</div>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Wallet size={18} /> Tổng Dòng Tiền Cơ sở</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#4ade80' }}>{formatCurrency(totalBalance)}</div>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Activity size={18} /> Lệnh Giao Dịch Bắt Được</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#60a5fa' }}>{transactions.length}</div>
        </div>
      </div>

      {/* DATA VISUALIZATIONS */}
      <div className="grid-cols-2 mb-6" style={{ gap: '1.5rem' }}>
        {/* Account Types Breakdown */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', fontSize: '1.1rem' }}>Tỉ trọng Nhóm Hình thức Thẻ</h2>
          <div style={{ width: '100%', height: '24px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', display: 'flex', overflow: 'hidden', marginBottom: '1rem' }}>
            <div style={{ width: `${checkingPct}%`, background: '#3b82f6', height: '100%', transition: 'width 1s ease' }}></div>
            <div style={{ width: `${savingsPct}%`, background: '#8b5cf6', height: '100%', transition: 'width 1s ease' }}></div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#3b82f6' }}></div> Checking ({checkingPct}%)</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#8b5cf6' }}></div> Savings ({savingsPct}%)</div>
          </div>
        </div>

        {/* Cash Flow Timeline */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', fontSize: '1.1rem' }}>Biên độ Giao dịch Tiền tệ</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {/* Deposit */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '60px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>NẠP VÀO</div>
              <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${(depositTotal / cashFlowMax) * 100}%`, background: '#4ade80', height: '100%', transition: 'width 1s ease' }}></div>
              </div>
              <div style={{ width: '90px', textAlign: 'right', fontSize: '0.8rem', color: '#4ade80', fontWeight: 'bold' }}>{formatCurrency(depositTotal)}</div>
            </div>
            {/* Withdraw */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '60px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>RÚT RA</div>
              <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${(withdrawTotal / cashFlowMax) * 100}%`, background: '#fb7185', height: '100%', transition: 'width 1s ease' }}></div>
              </div>
              <div style={{ width: '90px', textAlign: 'right', fontSize: '0.8rem', color: '#fb7185', fontWeight: 'bold' }}>{formatCurrency(withdrawTotal)}</div>
            </div>
            {/* Transfer */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '60px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>LUÂN CHUYỂN</div>
              <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${(transferTotal / cashFlowMax) * 100}%`, background: '#a855f7', height: '100%', transition: 'width 1s ease' }}></div>
              </div>
              <div style={{ width: '90px', textAlign: 'right', fontSize: '0.8rem', color: '#c084fc', fontWeight: 'bold' }}>{formatCurrency(transferTotal)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* THREE COLUMN FORMS */}
      <div className="grid-cols-3 mb-6" style={{ gap: '1.5rem', alignItems: 'stretch' }}>
        {/* COL 1: Registration */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}><UserPlus size={20} color="#60a5fa" /> Mở Tài Khoản</h2>
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
            <div><label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Họ và tên</label><input type="text" value={regName} onChange={e => setRegName(e.target.value)} required /></div>
            <div><label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Số điện thoại</label><input type="text" value={regPhone} onChange={e => setRegPhone(e.target.value)} required /></div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Loại thẻ</label>
              <select value={regType} onChange={e => setRegType(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--surface-border)', background: 'rgba(15, 23, 42, 0.6)', color: 'white' }} required>
                <option value="Checking Account">Checking (Thanh toán)</option>
                <option value="Savings Account">Savings (Tiết kiệm)</option>
              </select>
            </div>
            <div style={{ marginTop: 'auto', paddingTop: '1rem' }}><button type="submit" style={{ background: '#3b82f6', width: '100%' }}><UserPlus size={18} /> Cấp Thẻ Tài Khoản</button></div>
          </form>
        </div>

        {/* COL 2: Deposit & Withdraw */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-panel" style={{ padding: '1.5rem', flex: 1 }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--success)', marginBottom: '1rem' }}><Wallet size={20} /> Quầy Nạp Tiền</h2>
            <form onSubmit={handleDeposit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div><input type="text" placeholder="Số tài khoản..." value={depositAcc} onChange={e => setDepositAcc(e.target.value)} required /></div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <input type="number" min="1000" step="100" placeholder="Số tiền..." value={depositAmount} onChange={e => setDepositAmount(e.target.value)} required style={{ flex: 1 }} />
                <button type="submit" style={{ background: 'var(--success)', padding: '0 1.5rem' }}>Nạp</button>
              </div>
            </form>
          </div>
          <div className="glass-panel" style={{ padding: '1.5rem', flex: 1 }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#f43f5e', marginBottom: '1rem' }}><Banknote size={20} /> Quầy Rút Tiền</h2>
            <form onSubmit={handleWithdraw} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div><input type="text" placeholder="Số tài khoản..." value={withdrawAcc} onChange={e => setWithdrawAcc(e.target.value)} required /></div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <input type="number" min="1000" step="100" placeholder="Số tiền..." value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} required style={{ flex: 1 }} />
                <button type="submit" style={{ background: '#f43f5e', padding: '0 1.5rem' }}>Rút</button>
              </div>
            </form>
          </div>
        </div>

        {/* COL 3: Transfer */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--accent)', marginBottom: '1.5rem' }}><ArrowRightLeft size={20} /> Chuyển Khoản</h2>
          <form onSubmit={handleTransfer} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
            <div><label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Tài khoản nguồn (Trừ tiền)</label><input type="text" value={transferFrom} onChange={e => setTransferFrom(e.target.value)} required /></div>
            <div><label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Tài khoản đích (Thụ hưởng)</label><input type="text" value={transferTo} onChange={e => setTransferTo(e.target.value)} required /></div>
            <div><label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Khối lượng giao dịch (VNĐ)</label><input type="number" value={transferAmount} onChange={e => setTransferAmount(e.target.value)} required /></div>
            <div style={{ marginTop: 'auto', paddingTop: '1rem' }}><button type="submit" className="accent" style={{ width: '100%' }}><Send size={18} /> Kích hoạt Triggers</button></div>
          </form>
        </div>
      </div>

      {/* Customers List with Search */}
      <div className="glass-panel mb-6" style={{ padding: '1.5rem', overflowX: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0 }}><Users size={22} color="var(--primary)" /> Hệ quản trị Khách hàng</h2>
          <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '12px', padding: '0.5rem 1rem', border: '1px solid var(--surface-border)', width: '300px' }}>
            <Search size={18} color="var(--text-secondary)" style={{ marginRight: '0.75rem' }} />
            <input
              type="text" placeholder="Tìm theo Tên hoặc Số thẻ..."
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: 'white', outline: 'none', width: '100%' }}
            />
          </div>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Khách Hàng</th>
              <th>Số TK</th>
              <th>Loại</th>
              <th>Trạng Thái</th>
              <th>Số Dư</th>
              <th style={{ textAlign: 'right' }}>Thao tác DB</th>
            </tr>
          </thead>
          <tbody>
            {filteredCustomers.map((c, i) => (
              <tr key={i} style={{ opacity: c['Account Status'] === 'SUSPENDED' ? 0.6 : 1 }}>
                <td style={{ fontWeight: 500, color: 'white' }}>{c['Customer Name']}</td>
                <td style={{ fontFamily: 'monospace', color: '#cbd5e1' }}>{c['Account Number']}</td>
                <td><span style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: '6px', fontSize: '0.8rem' }}>{c['Account Type']}</span></td>
                <td>
                  <span style={{
                    background: c['Account Status'] === 'ACTIVE' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                    color: c['Account Status'] === 'ACTIVE' ? '#4ade80' : '#fbbf24',
                    padding: '4px 8px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold'
                  }}>
                    {c['Account Status']}
                  </span>
                </td>
                <td className="currency">{formatCurrency(c['Current Balance'])}</td>
                <td style={{ textAlign: 'right' }}>
                  <button
                    onClick={() => handleLockAccount(c['Account Number'], c['Account Status'])}
                    style={{
                      padding: '0.4rem 0.8rem', fontSize: '0.85rem', width: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                      background: c['Account Status'] === 'ACTIVE' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                      color: c['Account Status'] === 'ACTIVE' ? '#fbbf24' : '#4ade80', border: 'none'
                    }}
                  >
                    {c['Account Status'] === 'ACTIVE' ? <Lock size={14} /> : <Unlock size={14} />}
                    {c['Account Status'] === 'ACTIVE' ? ' Khóa thẻ' : ' Mở thẻ'}
                  </button>
                </td>
              </tr>
            ))}
            {filteredCustomers.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>Không tìm thấy khách hàng nào khớp dữ liệu</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Audit Log / Transactions */}
      <div className="glass-panel mb-6" style={{ padding: '1.5rem', overflowX: 'auto' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}><Activity size={22} color="#a855f7" /> Sổ Lệnh Giao dịch (Transactions)</h2>
        <table className="data-table" style={{ marginTop: '1rem' }}>
          <thead>
            <tr>
              <th>Mã Log (Ref)</th>
              <th>Thời gian</th>
              <th>Loại GD</th>
              <th>Soi Chiếu (Txn)</th>
              <th>Biến động Dư</th>
              <th>Trạng Thái</th>
              <th>Teller Quản lý</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t, i) => (
              <tr key={i}>
                <td style={{ fontFamily: 'monospace', color: '#cbd5e1', fontSize: '0.85rem' }}>{t.reference_code || '---'}</td>
                <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{formatDate(t.transaction_date)}</td>
                <td>
                  <span style={{
                    background: t.transaction_type === 'WITHDRAWAL' ? 'rgba(244, 63, 94, 0.2)' : 'rgba(168, 85, 247, 0.2)',
                    color: t.transaction_type === 'WITHDRAWAL' ? '#fb7185' : '#c084fc',
                    padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold'
                  }}>
                    {t.transaction_type}
                  </span>
                </td>
                <td style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                  {t.transaction_type === 'DEPOSIT' && `Nạp vào: ${t.to_account || 'N/A'}`}
                  {t.transaction_type === 'WITHDRAWAL' && `Rút từ: ${t.from_account || 'N/A'}`}
                  {t.transaction_type === 'TRANSFER' && `Từ ${t.from_account} ➔ ${t.to_account}`}
                </td>
                <td className="currency" style={{ color: t.transaction_type === 'DEPOSIT' ? '#4ade80' : '#f87171' }}>
                  {t.transaction_type === 'DEPOSIT' ? '+' : '-'}{formatCurrency(t.amount)}
                </td>
                <td>
                  <span style={{ color: t.status === 'COMPLETED' ? '#4ade80' : '#fbbf24', fontSize: '0.85rem', fontWeight: 'bold' }}>
                    {t.status}
                  </span>
                </td>
                <td style={{ fontSize: '0.85rem' }}>{t.teller_name || 'Hệ Thống API'}</td>
              </tr>
            ))}
            {transactions.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', color: '#64748b', padding: '1.5rem' }}>Chưa có giao dịch Lịch sử nào ở trạm cục bộ</td></tr>}
          </tbody>
        </table>
      </div>

      {/* System Triggers Radar */}
      <div className="glass-panel" style={{ padding: '1.5rem', overflowX: 'auto', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#fbbf24' }}><Fingerprint size={22} /> Triggers Radar (Audit Logs DB)</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Bảng truy xuất Real-time các tệp tin JSON ghi chép biến động từ Cổng Database PostgreSQL ngầm (Trigger Trackers).</p>
        <table className="data-table" style={{ fontSize: '0.8rem' }}>
          <thead>
            <tr>
              <th>Log Hash</th>
              <th>Thời gian (UTC)</th>
              <th>Thẻ Tác động</th>
              <th>Sự Kiện Database</th>
              <th>Snapshot Cũ (old_data)</th>
              <th>Snapshot Mới (new_data)</th>
            </tr>
          </thead>
          <tbody>
            {audits.map((a, i) => (
              <tr key={i}>
                <td style={{ fontFamily: 'monospace', color: '#64748b' }}>{a.log_id.substring(0, 8)}...</td>
                <td style={{ color: 'var(--text-secondary)' }}>{formatDate(a.changed_at)}</td>
                <td style={{ fontFamily: 'monospace', color: 'white' }}>{a.account_number}</td>
                <td><span style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', padding: '2px 6px', borderRadius: '4px' }}>{a.action}</span></td>
                <td style={{ fontFamily: 'monospace', color: '#f87171' }}>{a.old_data ? JSON.stringify(a.old_data) : 'NULL'}</td>
                <td style={{ fontFamily: 'monospace', color: '#4ade80' }}>{JSON.stringify(a.new_data)}</td>
              </tr>
            ))}
            {audits.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', color: '#64748b', padding: '1.5rem' }}>Radar ngầm quét chưa phát hiện biến động</td></tr>}
          </tbody>
        </table>
      </div>

    </main>
  );
}
