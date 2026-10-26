import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, User } from 'firebase/auth';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  AlertCircle,
  ArrowUpRight,
  Bell,
  CircleHelp,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Package,
  RefreshCw,
  Search,
  ShoppingBag,
  X,
} from 'lucide-react';
import { auth } from './firebase';
import { AdminOrder, AdminShipment, AdminUser, getAdminOrders, getAdminShipments, getAdminUsers, resendSellerEmail, ShippingEmailIssue } from './api';

const navItems = [
  { label: 'Overview', icon: LayoutDashboard, active: true },
  { label: 'Shipments', icon: Bell, active: false },
  { label: 'Orders', icon: ShoppingBag, active: false },
  { label: 'Products', icon: Package, active: false },
  { label: 'Users', icon: Bell, active: false },
];

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => onAuthStateChanged(auth, (next) => { setUser(next); setLoading(false); }), []);
  if (loading) return <div className="loading-screen">Loading Cherry Admin</div>;
  return user ? <Dashboard user={user} /> : <Login />;
}

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try { await signInWithEmailAndPassword(auth, email, password); }
    catch { setError('Sign-in failed. Check your credentials and admin access.'); }
    finally { setBusy(false); }
  }
  return <main className="login-page"><div className="login-shell">
    <div className="brand-mark">C</div><span className="eyebrow">Operations console</span>
    <h1>Welcome to Cherry Admin</h1><p className="muted">A quiet place to keep orders moving.</p>
    <form onSubmit={submit} className="login-form">
      <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
      <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
      {error && <p className="form-error"><AlertCircle size={16} />{error}</p>}
      <button className="primary-button" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}<ArrowUpRight size={17} /></button>
    </form>
  </div></main>;
}

function Dashboard({ user }: { user: User }) {
  const queryClient = useQueryClient();
  const [active, setActive] = useState('Overview');
  const appEnvironment = import.meta.env.VITE_FIREBASE_PROJECT_ID === 'cherry-prod-d513e' ? 'Production' : 'Development';
  const orders = useQuery({ queryKey: ['admin-orders'], queryFn: getAdminOrders, enabled: active === 'Orders' });
  const users = useQuery({ queryKey: ['admin-users'], queryFn: getAdminUsers, enabled: active === 'Users' });
  const shipments = useQuery({ queryKey: ['admin-shipments'], queryFn: getAdminShipments, enabled: active === 'Shipments' || active === 'Overview' });
  return <div className="app-shell"><aside className="sidebar">
    <div className="sidebar-brand"><div className="brand-mark small">C</div><strong>cherry</strong><span>ADMIN</span></div>
    <div className="workspace"><span className="workspace-dot" />{appEnvironment} <ChevronRight size={14} /></div>
    <nav>{navItems.map(({ label, icon: Icon, active: defaultActive }) => <button className={active === label || (defaultActive && active === 'Overview') ? 'nav-item active' : 'nav-item'} onClick={() => setActive(label)} key={label}><Icon size={18} />{label}</button>)}</nav>
    <div className="sidebar-footer"><button className="nav-item"><CircleHelp size={18} />Help</button><button className="nav-item" onClick={() => signOut(auth)}><LogOut size={18} />Sign out</button></div>
  </aside><main className="main-content">
    <header className="topbar"><div><span className="eyebrow">Operations</span><h2>{active}</h2></div><div className="user-chip"><span className="avatar">{(user.email ?? 'A')[0].toUpperCase()}</span><span>{user.email}</span></div></header>
    {active === 'Shipments' ? <section className="content-section"><div className="section-heading"><div><span className="eyebrow">Fulfilment</span><h3>Shipments</h3><p className="muted">Monitor delivery and resend QR emails when needed.</p></div></div><ShipmentTable shipments={shipments.data ?? []} loading={shipments.isLoading} error={shipments.error as Error | null} /></section> : active === 'Orders' ? <section className="content-section"><div className="section-heading"><div><span className="eyebrow">Commerce</span><h3>Orders</h3><p className="muted">Payment and fulfilment activity across Cherry.</p></div></div><EntityTable type="orders" data={orders.data ?? []} loading={orders.isLoading} error={orders.error as Error | null} /></section> : active === 'Users' ? <section className="content-section"><div className="section-heading"><div><span className="eyebrow">Community</span><h3>Users</h3><p className="muted">Registered Cherry accounts.</p></div></div><EntityTable type="users" data={users.data ?? []} loading={users.isLoading} error={users.error as Error | null} /></section> : active !== 'Overview' ? <EmptySection title={active} /> : <>
      <section className="summary-grid"><Summary label="Needs attention" value={(shipments.data ?? []).filter((shipment) => shipment.qrStatus === 'missing').length} tone="warning" /><Summary label="Shipments" value={shipments.data?.length ?? '—'} /><Summary label="Orders" value={orders.data?.length ?? '—'} /><Summary label="System status" value="Healthy" tone="good" /></section>
      <section className="content-section"><div className="section-heading"><div><span className="eyebrow">Fulfilment</span><h3>Shipments needing attention</h3><p className="muted">Open the Shipments section to review and resend QR emails.</p></div><button className="icon-button" title="Refresh" onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-shipments'] })}><RefreshCw size={17} /></button></div><ShipmentTable shipments={(shipments.data ?? []).filter((shipment) => shipment.qrStatus === 'missing')} loading={shipments.isLoading} error={shipments.error as Error | null} /></section></>}
  </main></div>;
}

function Summary({ label, value, tone }: { label: string; value: string | number; tone?: string }) { return <div className="summary-card"><span className="muted">{label}</span><strong className={tone}>{value}</strong></div>; }

function EntityTable({ type, data, loading, error }: { type: 'orders' | 'users'; data: AdminOrder[] | AdminUser[]; loading: boolean; error: Error | null }) {
  const columns: ColumnDef<AdminOrder | AdminUser>[] = type === 'orders' ? [
    { header: 'Order', cell: ({ row }) => <span className="mono">{(row.original as AdminOrder).id.slice(0, 12)}…</span> },
    { header: 'Product', cell: ({ row }) => (row.original as AdminOrder).productName },
    { header: 'Amount', cell: ({ row }) => { const order = row.original as AdminOrder; return `${order.currency} ${(order.amount / 100).toFixed(2)}`; } },
    { header: 'Payment', cell: ({ row }) => <span className="status pending"><span />{(row.original as AdminOrder).paymentStatus}</span> },
    { header: 'Shipment', cell: ({ row }) => (row.original as AdminOrder).shipmentStatus },
    { header: 'Created', cell: ({ row }) => new Date((row.original as AdminOrder).createdAt).toLocaleDateString() },
  ] : [
    { header: 'User', cell: ({ row }) => <span className="mono">{(row.original as AdminUser).id.slice(0, 12)}…</span> },
    { header: 'Name', cell: ({ row }) => (row.original as AdminUser).name ?? '—' },
    { header: 'Email', cell: ({ row }) => (row.original as AdminUser).email ?? '—' },
    { header: 'Joined', cell: ({ row }) => { const date = (row.original as AdminUser).createdAt; return date ? new Date(date).toLocaleDateString() : '—'; } },
  ];
  const table = useReactTable({ data, columns, initialState: { pagination: { pageSize: 10 } }, getCoreRowModel: getCoreRowModel(), getPaginationRowModel: getPaginationRowModel() });
  if (loading) return <div className="empty-state">Loading {type}…</div>;
  if (error) return <div className="empty-state error-state"><AlertCircle size={20} />{error.message}</div>;
  return <><div className="table-wrap"><table><thead>{table.getHeaderGroups().map((group) => <tr key={group.id}>{group.headers.map((header) => <th key={header.id}>{flexRender(header.column.columnDef.header, header.getContext())}</th>)}</tr>)}</thead><tbody>{table.getRowModel().rows.map((row) => <tr key={row.id}>{row.getVisibleCells().map((cell) => <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}</tr>)}</tbody></table></div><div className="pagination"><span>Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}</span><div><button title="Previous page" disabled={!table.getCanPreviousPage()} onClick={() => table.previousPage()}><ChevronLeft size={16} /></button><button title="Next page" disabled={!table.getCanNextPage()} onClick={() => table.nextPage()}><ChevronRight size={16} /></button></div></div></>;
}

function ShipmentTable({ shipments, loading, error }: { shipments: AdminShipment[]; loading: boolean; error: Error | null }) {
  const [sending, setSending] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  async function resend(orderId: string) { setSending(orderId); setMessage(''); try { await resendSellerEmail(orderId); setMessage('Seller email resent successfully.'); } catch (err) { setMessage((err as Error).message); } finally { setSending(null); } }
  const columns: ColumnDef<AdminShipment>[] = [
    { header: 'Shipment', cell: ({ row }) => <><span className="mono">{row.original.id.slice(0, 12)}…</span><span className="subtle">Order {row.original.orderId.slice(0, 10)}…</span></> },
    { header: 'Carrier', accessorKey: 'carrier', cell: ({ getValue }) => getValue<string>() ?? '—' },
    { header: 'Tracking', cell: ({ row }) => row.original.trackingNumber ?? '—' },
    { header: 'Status', cell: ({ row }) => <span className="status pending"><span />{row.original.status.replace('_', ' ')}</span> },
    { header: 'QR', cell: ({ row }) => <span className={`status ${row.original.qrStatus === 'missing' ? 'failed' : 'attached'}`}><span />{row.original.qrStatus}</span> },
    { header: 'Updated', cell: ({ row }) => new Date(row.original.updatedAt).toLocaleDateString() },
    { id: 'actions', header: '', cell: ({ row }) => row.original.qrStatus === 'missing' ? <button className="table-action" onClick={() => resend(row.original.orderId)} disabled={sending === row.original.orderId}>{sending === row.original.orderId ? 'Sending…' : 'Resend QR'}<ArrowUpRight size={15} /></button> : null },
  ];
  const table = useReactTable({ data: shipments, columns, initialState: { pagination: { pageSize: 10 } }, getCoreRowModel: getCoreRowModel(), getPaginationRowModel: getPaginationRowModel() });
  if (loading) return <div className="empty-state">Loading shipments…</div>;
  if (error) return <div className="empty-state error-state"><AlertCircle size={20} />{error.message}</div>;
  if (!shipments.length) return <div className="empty-state"><div className="empty-icon"><Package size={20} /></div><strong>No shipments</strong><span>Shipment records will appear here after fulfilment.</span></div>;
  return <><div className="table-wrap"><table><thead>{table.getHeaderGroups().map((group) => <tr key={group.id}>{group.headers.map((header) => <th key={header.id}>{flexRender(header.column.columnDef.header, header.getContext())}</th>)}</tr>)}</thead><tbody>{table.getRowModel().rows.map((row) => <tr key={row.id}>{row.getVisibleCells().map((cell) => <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}</tr>)}</tbody></table></div><div className="pagination"><span>Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}</span><div><button title="Previous page" disabled={!table.getCanPreviousPage()} onClick={() => table.previousPage()}><ChevronLeft size={16} /></button><button title="Next page" disabled={!table.getCanNextPage()} onClick={() => table.nextPage()}><ChevronRight size={16} /></button></div></div>{message && <p className="toast"><span>{message}</span><button onClick={() => setMessage('')}><X size={15} /></button></p>}</>;
}

function IssueTable({ issues }: { issues: ShippingEmailIssue[] }) {
  const [sending, setSending] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  async function resend(orderId: string) { setSending(orderId); setMessage(''); try { await resendSellerEmail(orderId); setMessage('Seller email resent successfully.'); } catch (error) { setMessage((error as Error).message); } finally { setSending(null); } }
  const columns: ColumnDef<ShippingEmailIssue>[] = [
    { header: 'Order', cell: ({ row }) => <><strong className="mono">{row.original.orderId.slice(0, 10)}…</strong><span className="subtle">{row.original.trackingNumber ?? 'No tracking'}</span></> },
    { header: 'Product', accessorKey: 'productName', cell: ({ getValue }) => getValue<string>() ?? 'Unknown product' },
    { header: 'QR status', cell: ({ row }) => <><span className={`status ${row.original.labelAttachmentStatus}`}><span />{row.original.labelAttachmentStatus.replace('_', ' ')}</span>{row.original.labelAttachmentError && <span className="subtle error-text">{row.original.labelAttachmentError}</span>}</> },
    { header: 'Last attempt', cell: ({ row }) => <span className="subtle">{row.original.lastSellerEmailAttemptAt ? new Date(row.original.lastSellerEmailAttemptAt).toLocaleString() : 'Not attempted'}</span> },
    { id: 'actions', header: '', cell: ({ row }) => <button className="table-action" onClick={() => resend(row.original.orderId)} disabled={sending === row.original.orderId}>{sending === row.original.orderId ? 'Sending…' : 'Resend'}<ArrowUpRight size={15} /></button> },
  ];
  const table = useReactTable({
    data: issues,
    columns,
    initialState: { pagination: { pageSize: 10 } },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });
  return <><div className="table-wrap"><table><thead>{table.getHeaderGroups().map((headerGroup) => <tr key={headerGroup.id}>{headerGroup.headers.map((header) => <th key={header.id}>{flexRender(header.column.columnDef.header, header.getContext())}</th>)}</tr>)}</thead><tbody>{table.getRowModel().rows.map((row) => <tr key={row.id}>{row.getVisibleCells().map((cell) => <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}</tr>)}</tbody></table></div><div className="pagination"><span>Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}</span><div><button title="Previous page" disabled={!table.getCanPreviousPage()} onClick={() => table.previousPage()}><ChevronLeft size={16} /></button><button title="Next page" disabled={!table.getCanNextPage()} onClick={() => table.nextPage()}><ChevronRight size={16} /></button></div></div>{message && <p className="toast"><span>{message}</span><button onClick={() => setMessage('')}><X size={15} /></button></p>}</>;
}

function EmptySection({ title }: { title: string }) { return <section className="content-section empty-page"><Package size={24} /><h3>{title}</h3><p className="muted">This workspace is ready for the next operations view.</p></section>; }
