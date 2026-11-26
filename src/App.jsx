import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FIELDS,
  TITLE_FIELDS,
  SUBTITLE_FIELD,
  AMOUNT_FIELD,
  SEARCH_FIELDS,
} from './fields.js';
import {
  addOrder,
  updateOrder,
  deleteOrder,
  listOrders,
  getConfig,
  saveConfig,
  clearConfig,
} from './api.js';

const emptyForm = () =>
  Object.fromEntries(FIELDS.map((f) => [f.key, f.type === 'select' ? '' : '']));

const money = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n.toLocaleString(undefined, { style: 'currency', currency: 'USD' }) : '';
};

const fmtDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d) ? '' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function App() {
  const [config, setConfig] = useState(getConfig());
  const [tab, setTab] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [editing, setEditing] = useState(null); // order being edited, or null
  const [query, setQuery] = useState('');

  const configured = Boolean(config.url && config.token);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2400);
  };

  const refresh = useCallback(async () => {
    if (!configured) return;
    setLoading(true);
    setError('');
    try {
      setOrders(await listOrders());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [configured]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleSave = async (form, existing) => {
    if (existing) {
      const saved = await updateOrder({ ...form, id: existing.id });
      setOrders((os) => os.map((o) => (o.id === saved.id ? saved : o)));
      showToast('Order updated');
    } else {
      const saved = await addOrder(form);
      setOrders((os) => [...os, saved]);
      showToast('Order saved to sheet');
    }
  };

  const handleDelete = async (order) => {
    await deleteOrder(order.id);
    setOrders((os) => os.filter((o) => o.id !== order.id));
    setEditing(null);
    showToast('Order deleted');
  };

  if (!configured || tab === 'settings') {
    return (
      <Shell tab="settings" setTab={setTab} configured={configured} toast={toast}>
        <Settings
          config={config}
          onSave={(c) => {
            saveConfig(c);
            setConfig(getConfig());
            setTab('orders');
          }}
          onClear={() => {
            clearConfig();
            setConfig(getConfig());
            setOrders([]);
          }}
        />
      </Shell>
    );
  }

  return (
    <Shell tab={tab} setTab={setTab} configured toast={toast}>
      {tab === 'new' && (
        <OrderForm
          key="new"
          onSave={async (form) => {
            await handleSave(form, null);
            setTab('orders');
          }}
          onCancel={() => setTab('orders')}
        />
      )}

      {tab === 'orders' && editing && (
        <OrderForm
          key={editing.id}
          existing={editing}
          onSave={async (form) => {
            await handleSave(form, editing);
            setEditing(null);
          }}
          onCancel={() => setEditing(null)}
          onDelete={() => handleDelete(editing)}
        />
      )}

      {tab === 'orders' && !editing && (
        <OrderList
          orders={orders}
          loading={loading}
          error={error}
          query={query}
          setQuery={setQuery}
          onRefresh={refresh}
          onOpen={setEditing}
        />
      )}
    </Shell>
  );
}

/* ------------------------------ layout ------------------------------ */

function Shell({ tab, setTab, configured, toast, children }) {
  return (
    <div className="app">
      <header className="topbar">
        <h1>Orders</h1>
        <span className="sub">Desert Firewood</span>
      </header>
      <main className="content">{children}</main>
      {toast && <div className="toast" role="status">{toast}</div>}
      <nav className="tabbar">
        <button
          className={tab === 'orders' ? 'active' : ''}
          disabled={!configured}
          onClick={() => setTab('orders')}
        >
          <span aria-hidden>▤</span>Orders
        </button>
        <button
          className={tab === 'new' ? 'active' : ''}
          disabled={!configured}
          onClick={() => setTab('new')}
        >
          <span aria-hidden>＋</span>New
        </button>
        <button className={tab === 'settings' ? 'active' : ''} onClick={() => setTab('settings')}>
          <span aria-hidden>⚙</span>Settings
        </button>
      </nav>
    </div>
  );
}

/* ------------------------------ list ------------------------------ */

function OrderList({ orders, loading, error, query, setQuery, onRefresh, onOpen }) {
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sorted = [...orders].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    if (!q) return sorted;
    return sorted.filter((o) =>
      SEARCH_FIELDS.some((k) => String(o[k] ?? '').toLowerCase().includes(q))
    );
  }, [orders, query]);

  const total = filtered.reduce((s, o) => s + (parseFloat(o[AMOUNT_FIELD]) || 0), 0);

  return (
    <>
      <div className="toolbar">
        <input
          type="search"
          placeholder="Search orders…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button className="btn ghost" onClick={onRefresh} disabled={loading}>
          {loading ? '…' : '↻'}
        </button>
      </div>

      {error && <div className="banner error">{error}</div>}

      <div className="summary">
        <span>{filtered.length} order{filtered.length === 1 ? '' : 's'}</span>
        <strong>{money(total) || '$0.00'}</strong>
      </div>

      {loading && orders.length === 0 && <p className="muted center">Loading…</p>}
      {!loading && !error && filtered.length === 0 && (
        <p className="muted center">{query ? 'No matches.' : 'No orders yet. Tap New to add one.'}</p>
      )}

      <ul className="cards">
        {filtered.map((o) => (
          <li key={o.id}>
            <button className="card" onClick={() => onOpen(o)}>
              <div className="card-top">
                <span className="name">
                  {TITLE_FIELDS.map((k) => o[k]).filter(Boolean).join(' ') || '(no name)'}
                </span>
                <span className="amount">{money(o[AMOUNT_FIELD])}</span>
              </div>
              <div className="card-mid">{o[SUBTITLE_FIELD]}</div>
              <div className="card-bot">
                {o.paymentMethod && <span className="pill">{o.paymentMethod}</span>}
                <span className="muted">{fmtDate(o.createdAt)}</span>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

/* ------------------------------ form ------------------------------ */

function OrderForm({ existing, onSave, onCancel, onDelete }) {
  const [form, setForm] = useState(() => {
    if (!existing) return emptyForm();
    const f = emptyForm();
    FIELDS.forEach((fl) => (f[fl.key] = existing[fl.key] ?? ''));
    return f;
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      await onSave(form);
    } catch (e2) {
      setErr(e2.message);
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await onDelete();
    } catch (e2) {
      setErr(e2.message);
      setBusy(false);
    }
  };

  return (
    <form className="form" onSubmit={submit}>
      <h2>{existing ? 'Edit order' : 'New order'}</h2>

      {FIELDS.map((f) => (
        <label key={f.key} className="field">
          <span>
            {f.label}
            {f.required && <em> *</em>}
          </span>
          <Input field={f} value={form[f.key]} onChange={(v) => set(f.key, v)} />
        </label>
      ))}

      {err && <div className="banner error">{err}</div>}

      <div className="actions">
        <button type="submit" className="btn primary" disabled={busy}>
          {busy ? 'Saving…' : existing ? 'Save changes' : 'Save order'}
        </button>
        <button type="button" className="btn ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
      </div>

      {existing && (
        <div className="danger">
          {!confirmDelete ? (
            <button type="button" className="btn link" onClick={() => setConfirmDelete(true)}>
              Delete this order
            </button>
          ) : (
            <button type="button" className="btn danger-btn" onClick={remove} disabled={busy}>
              Tap again to permanently delete
            </button>
          )}
        </div>
      )}
    </form>
  );
}

function Input({ field, value, onChange }) {
  const common = {
    value,
    required: field.required,
    autoComplete: field.autoComplete,
    onChange: (e) => onChange(e.target.value),
  };
  switch (field.type) {
    case 'select':
      return (
        <select {...common}>
          <option value="">Select…</option>
          {field.options.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      );
    case 'textarea':
      return <textarea rows={3} {...common} />;
    case 'money':
      return <input type="number" inputMode="decimal" step="0.01" min="0" placeholder="0.00" {...common} />;
    case 'number':
      return <input type="number" inputMode="numeric" {...common} />;
    case 'tel':
      return <input type="tel" inputMode="tel" {...common} />;
    case 'date':
      return <input type="date" {...common} />;
    default:
      return <input type="text" {...common} />;
  }
}

/* ---------------------------- settings ---------------------------- */

function Settings({ config, onSave, onClear }) {
  const [url, setUrl] = useState(config.url);
  const [token, setToken] = useState(config.token);
  const [testing, setTesting] = useState(false);
  const [msg, setMsg] = useState('');

  const test = async () => {
    setTesting(true);
    setMsg('');
    saveConfig({ url, token });
    try {
      const orders = await listOrders();
      setMsg(`✓ Connected. ${orders.length} order(s) found.`);
    } catch (e) {
      setMsg(`✗ ${e.message}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ url, token });
      }}
    >
      <h2>Connect your Google Sheet</h2>
      <p className="muted">
        Paste the Web App URL from your Apps Script deployment and the secret you set in
        <code> Code.gs</code>. These are stored only on this device.
      </p>
      <label className="field">
        <span>Web App URL</span>
        <input
          type="url"
          required
          placeholder="https://script.google.com/macros/s/…/exec"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
      </label>
      <label className="field">
        <span>Secret token</span>
        <input
          type="password"
          required
          autoComplete="off"
          value={token}
          onChange={(e) => setToken(e.target.value)}
        />
      </label>
      {msg && <div className={`banner ${msg.startsWith('✓') ? 'ok' : 'error'}`}>{msg}</div>}
      <div className="actions">
        <button className="btn primary" type="submit">Save</button>
        <button className="btn ghost" type="button" onClick={test} disabled={testing || !url || !token}>
          {testing ? 'Testing…' : 'Test connection'}
        </button>
      </div>
      {config.url && (
        <div className="danger">
          <button type="button" className="btn link" onClick={onClear}>Disconnect this device</button>
        </div>
      )}
    </form>
  );
}
