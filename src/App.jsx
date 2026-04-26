import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabaseClient';
import { expenseCategories, incomeCategories, paymentMethods } from './data/categories';
import { Plus, Trash2, Pencil, Download, LogOut, Wallet, TrendingUp, TrendingDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const emptyForm = {
  type: 'expense',
  transaction_date: new Date().toISOString().slice(0, 10),
  amount: '',
  main_category: 'Housing',
  sub_category: 'Rent',
  payment_method: 'Credit Card',
  description: ''
};

function formatAED(value) {
  return new Intl.NumberFormat('en-AE', {
    style: 'currency',
    currency: 'AED',
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function monthKey(dateStr) {
  return dateStr?.slice(0, 7);
}

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('signin');
  const [message, setMessage] = useState('');

  async function submit(e) {
    e.preventDefault();
    setMessage('');
    let result;

if (mode === 'signin') {
  result = await supabase.auth.signInWithPassword({ email, password });
} else {
  result = await supabase.auth.signUp({ email, password });
}

const { error } = result;
    if (error) setMessage(error.message);
    else setMessage(mode === 'signin' ? 'Signed in.' : 'Check your email if confirmation is enabled.');
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-100">
      <form onSubmit={submit} className="w-full max-w-md bg-white rounded-3xl shadow p-6 space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Siva Expense Tracker</h1>
          <p className="text-sm text-slate-500">Private AED expense tracker for personal use</p>
        </div>
        <input className="w-full border rounded-xl p-3" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
        <input className="w-full border rounded-xl p-3" placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
        <button className="w-full bg-slate-900 text-white rounded-xl p-3 font-semibold">
          {mode === 'signin' ? 'Sign in' : 'Create account'}
        </button>
        <button type="button" className="w-full text-sm text-slate-600" onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
          {mode === 'signin' ? 'Create new account' : 'Already have an account? Sign in'}
        </button>
        {message && <p className="text-sm text-center text-slate-600">{message}</p>}
      </form>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) fetchTransactions();
  }, [session]);

  async function fetchTransactions() {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('transaction_date', { ascending: false });
    if (!error) setTransactions(data || []);
  }

  function handleTypeChange(type) {
    if (type === 'expense') {
      setForm({ ...form, type, main_category: 'Housing', sub_category: 'Rent' });
    } else {
      setForm({ ...form, type, main_category: 'Income', sub_category: 'Salary' });
    }
  }

  function availableSubCategories() {
    if (form.type === 'income') return incomeCategories;
    return expenseCategories[form.main_category] || [];
  }

  async function saveTransaction(e) {
    e.preventDefault();
    const payload = {
      ...form,
      amount: Number(form.amount),
      user_id: session.user.id
    };

    let result;
    if (editingId) {
      result = await supabase.from('transactions').update(payload).eq('id', editingId);
    } else {
      result = await supabase.from('transactions').insert(payload);
    }

    if (!result.error) {
      setForm(emptyForm);
      setEditingId(null);
      fetchTransactions();
    } else {
      alert(result.error.message);
    }
  }

  function editTransaction(tx) {
    setEditingId(tx.id);
    setForm({
      type: tx.type,
      transaction_date: tx.transaction_date,
      amount: tx.amount,
      main_category: tx.main_category,
      sub_category: tx.sub_category,
      payment_method: tx.payment_method || 'Credit Card',
      description: tx.description || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function deleteTransaction(id) {
    if (!confirm('Delete this transaction?')) return;
    await supabase.from('transactions').delete().eq('id', id);
    fetchTransactions();
  }

  const filtered = useMemo(() => {
    return transactions.filter(t => {
      const inMonth = monthKey(t.transaction_date) === selectedMonth;
      const text = `${t.main_category} ${t.sub_category} ${t.description || ''} ${t.payment_method || ''}`.toLowerCase();
      return inMonth && text.includes(search.toLowerCase());
    });
  }, [transactions, selectedMonth, search]);

  const summary = useMemo(() => {
    const income = filtered.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
    const expense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
    return { income, expense, balance: income - expense };
  }, [filtered]);

  const categoryData = useMemo(() => {
    const map = {};
    filtered.filter(t => t.type === 'expense').forEach(t => {
      map[t.main_category] = (map[t.main_category] || 0) + Number(t.amount);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
  }, [filtered]);

  const dailyData = useMemo(() => {
    const map = {};
    filtered.forEach(t => {
      const day = t.transaction_date.slice(8,10);
      map[day] = (map[day] || 0) + (t.type === 'expense' ? Number(t.amount) : 0);
    });
    return Object.entries(map).map(([day, expense]) => ({ day, expense }));
  }, [filtered]);

  function exportCSV() {
    const rows = [
      ['Date', 'Type', 'Amount', 'Main Category', 'Sub Category', 'Payment Method', 'Description'],
      ...filtered.map(t => [t.transaction_date, t.type, t.amount, t.main_category, t.sub_category, t.payment_method || '', t.description || ''])
    ];
    const csv = rows.map(r => r.map(v => `"${String(v).replaceAll('"', '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses-${selectedMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <div className="p-6">Loading...</div>;
  if (!session) return <Login />;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-10 bg-white border-b px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-lg">Expense Tracker</h1>
          <p className="text-xs text-slate-500">AED monthly personal tracker</p>
        </div>
        <button onClick={() => supabase.auth.signOut()} className="p-2 rounded-xl bg-slate-100">
          <LogOut size={18} />
        </button>
      </header>

      <main className="max-w-5xl mx-auto p-4 space-y-4">
        <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card icon={<TrendingUp />} title="Income" value={formatAED(summary.income)} />
          <Card icon={<TrendingDown />} title="Expenses" value={formatAED(summary.expense)} />
          <Card icon={<Wallet />} title="Balance" value={formatAED(summary.balance)} />
        </section>

        <section className="bg-white rounded-3xl shadow-sm p-4">
          <h2 className="font-bold mb-3">{editingId ? 'Edit Transaction' : 'Add Transaction'}</h2>
          <form onSubmit={saveTransaction} className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select className="border rounded-xl p-3" value={form.type} onChange={e => handleTypeChange(e.target.value)}>
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
            <input className="border rounded-xl p-3" type="date" value={form.transaction_date} onChange={e => setForm({...form, transaction_date: e.target.value})} />
            <input className="border rounded-xl p-3" type="number" step="0.01" placeholder="Amount" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} required />

            {form.type === 'expense' ? (
              <select className="border rounded-xl p-3" value={form.main_category} onChange={e => {
                const main = e.target.value;
                setForm({...form, main_category: main, sub_category: expenseCategories[main][0]});
              }}>
                {Object.keys(expenseCategories).map(c => <option key={c}>{c}</option>)}
              </select>
            ) : (
              <input className="border rounded-xl p-3 bg-slate-100" value="Income" disabled />
            )}

            <select className="border rounded-xl p-3" value={form.sub_category} onChange={e => setForm({...form, sub_category: e.target.value})}>
              {availableSubCategories().map(c => <option key={c}>{c}</option>)}
            </select>

            <select className="border rounded-xl p-3" value={form.payment_method} onChange={e => setForm({...form, payment_method: e.target.value})}>
              {paymentMethods.map(p => <option key={p}>{p}</option>)}
            </select>

            <input className="border rounded-xl p-3 md:col-span-2" placeholder="Description / notes" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />

            <button className="bg-slate-900 text-white rounded-xl p-3 font-semibold flex gap-2 items-center justify-center">
              <Plus size={18} /> {editingId ? 'Update' : 'Add'}
            </button>
          </form>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-3xl shadow-sm p-4 h-72">
            <h2 className="font-bold mb-2">Daily Spending</h2>
            <ResponsiveContainer width="100%" height="85%">
              <BarChart data={dailyData}>
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip formatter={(v) => formatAED(v)} />
                <Bar dataKey="expense" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-3xl shadow-sm p-4 h-72">
            <h2 className="font-bold mb-2">Category Split</h2>
            <ResponsiveContainer width="100%" height="85%">
              <PieChart>
                <Pie data={categoryData} dataKey="value" nameKey="name" outerRadius={90} label />
                <Tooltip formatter={(v) => formatAED(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="bg-white rounded-3xl shadow-sm p-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
            <h2 className="font-bold">Transactions</h2>
            <div className="flex gap-2">
              <input className="border rounded-xl p-2" type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} />
              <input className="border rounded-xl p-2 w-full" placeholder="Search" value={search} onChange={e => setSearch(e.target.value)} />
              <button onClick={exportCSV} className="p-2 rounded-xl bg-slate-100"><Download size={18} /></button>
            </div>
          </div>

          <div className="space-y-2">
            {filtered.map(t => (
              <div key={t.id} className="flex items-center justify-between border rounded-2xl p-3">
                <div>
                  <div className="font-semibold">{t.sub_category} <span className="text-xs text-slate-400">({t.main_category})</span></div>
                  <div className="text-xs text-slate-500">{t.transaction_date} • {t.payment_method} • {t.description}</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className={t.type === 'expense' ? 'font-bold text-red-600' : 'font-bold text-green-600'}>
                    {t.type === 'expense' ? '-' : '+'}{formatAED(t.amount)}
                  </div>
                  <button onClick={() => editTransaction(t)} className="p-2 bg-slate-100 rounded-xl"><Pencil size={16} /></button>
                  <button onClick={() => deleteTransaction(t.id)} className="p-2 bg-slate-100 rounded-xl"><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
            {filtered.length === 0 && <p className="text-center text-slate-500 py-8">No transactions for this month.</p>}
          </div>
        </section>
      </main>
    </div>
  );
}

function Card({ icon, title, value }) {
  return (
    <div className="bg-white rounded-3xl shadow-sm p-4 flex items-center gap-3">
      <div className="p-3 bg-slate-100 rounded-2xl">{icon}</div>
      <div>
        <p className="text-sm text-slate-500">{title}</p>
        <p className="text-xl font-bold">{value}</p>
      </div>
    </div>
  );
}
