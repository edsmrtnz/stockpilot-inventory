'use client';

import { AlertTriangle, ArrowDownRight, ArrowUpRight, Boxes, ChartNoAxesCombined, Check, ChevronDown, CircleDollarSign, ClipboardList, Eye, EyeOff, Filter, LogOut, Menu, Minus, PackageCheck, Plus, Search, Settings, ShoppingCart, Trash2, TrendingUp, X } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { supabase } from '../src/lib/supabase';

type View = 'overview' | 'products' | 'orders' | 'settings';
type Product = { id: number; name: string; sku: string; category: string; stock: number; reorder: number; price: number; status: 'Active' | 'Draft' };
type Order = { id: string; customer: string; items: number; total: number; status: 'Processing' | 'Shipped' | 'Delivered'; date: string };

const initialProducts: Product[] = [
  { id: 1, name: 'Wireless Mechanical Keyboard', sku: 'KB-MECH-01', category: 'Peripherals', stock: 46, reorder: 12, price: 89, status: 'Active' },
  { id: 2, name: '27-inch QHD Monitor', sku: 'MON-QHD-27', category: 'Displays', stock: 8, reorder: 10, price: 329, status: 'Active' },
  { id: 3, name: 'USB-C Docking Station', sku: 'DOCK-USBC-8', category: 'Accessories', stock: 22, reorder: 8, price: 119, status: 'Active' },
  { id: 4, name: 'Ergonomic Office Chair', sku: 'CHR-ERGO-02', category: 'Furniture', stock: 4, reorder: 6, price: 279, status: 'Active' },
  { id: 5, name: 'NVMe SSD 1TB', sku: 'SSD-NVME-1T', category: 'Components', stock: 64, reorder: 15, price: 84, status: 'Active' },
  { id: 6, name: '1080p Conference Webcam', sku: 'CAM-HD-1080', category: 'Peripherals', stock: 0, reorder: 8, price: 72, status: 'Draft' },
];
const initialOrders: Order[] = [
  { id: 'ORD-1048', customer: 'Northstar Studio', items: 5, total: 842, status: 'Processing', date: 'Aug 27, 2026' },
  { id: 'ORD-1047', customer: 'Mira Technologies', items: 2, total: 658, status: 'Shipped', date: 'Aug 27, 2026' },
  { id: 'ORD-1046', customer: 'Cedar & Co.', items: 8, total: 1294, status: 'Delivered', date: 'Aug 26, 2026' },
  { id: 'ORD-1045', customer: 'Axis Digital', items: 3, total: 391, status: 'Delivered', date: 'Aug 26, 2026' },
];

export default function Home() {
  const [authenticated, setAuthenticated] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [view, setView] = useState<View>('overview');
  const [mobileNav, setMobileNav] = useState(false);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [orderData, setOrderData] = useState<Order[]>(initialOrders);
  const [databaseReady, setDatabaseReady] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All categories');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  useEffect(() => {
    setAuthenticated(localStorage.getItem('stockpilot-session') === 'active');
    void connectDatabase();
  }, []);

  async function connectDatabase() {
    let { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      const result = await supabase.auth.signInAnonymously();
      session = result.data.session;
    }
    if (!session) return;
    let { data: rows } = await supabase.from('products').select('*').order('id');
    if (!rows?.length) {
      await supabase.from('products').insert(initialProducts.map(({id,reorder,...p})=>({...p,reorder_level:reorder})));
      rows = (await supabase.from('products').select('*').order('id')).data;
    }
    if (rows) setProducts(rows.map(row=>({id:row.id,name:row.name,sku:row.sku,category:row.category,stock:row.stock,reorder:row.reorder_level,price:Number(row.price),status:row.status as Product['status']})));
    let { data: orderRows } = await supabase.from('orders').select('*').order('id');
    if (!orderRows?.length) {
      await supabase.from('orders').insert(initialOrders.map(o=>({order_number:o.id,customer_name:o.customer,item_count:o.items,total:o.total,status:o.status,created_at:new Date(o.date).toISOString()})));
      orderRows = (await supabase.from('orders').select('*').order('id')).data;
    }
    if(orderRows) setOrderData(orderRows.map(row=>({id:row.order_number,customer:row.customer_name,items:row.item_count,total:Number(row.total),status:row.status as Order['status'],date:new Date(row.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})})));
    setDatabaseReady(true);
  }

  const filtered = useMemo(() => products.filter(p => (category === 'All categories' || p.category === category) && `${p.name} ${p.sku}`.toLowerCase().includes(search.toLowerCase())), [products, search, category]);
  const inventoryValue = products.reduce((sum, p) => sum + p.stock * p.price, 0);
  const lowStock = products.filter(p => p.stock <= p.reorder);

  function login(e: FormEvent<HTMLFormElement>) { e.preventDefault(); localStorage.setItem('stockpilot-session', 'active'); setAuthenticated(true); }
  function logout() { localStorage.removeItem('stockpilot-session'); setAuthenticated(false); setView('overview'); }
  function changeView(next: View) { setView(next); setMobileNav(false); }
  function openProduct(product?: Product) { setEditing(product ?? null); setModal(true); }
  async function saveProduct(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    const value: Product = { id: editing?.id ?? Date.now(), name: String(d.get('name')), sku: String(d.get('sku')), category: String(d.get('category')), stock: Number(d.get('stock')), reorder: Number(d.get('reorder')), price: Number(d.get('price')), status: String(d.get('status')) as Product['status'] };
    const record={name:value.name,sku:value.sku,category:value.category,stock:value.stock,reorder_level:value.reorder,price:value.price,status:value.status};
    if(editing) {
      await supabase.from('products').update(record).eq('id',editing.id);
      setProducts(current => current.map(p => p.id === editing.id ? {...value,id:editing.id} : p));
    } else {
      const {data}=await supabase.from('products').insert(record).select().single();
      if(data) setProducts(current => [{...value,id:data.id}, ...current]);
    }
    setModal(false);
  }
  function adjustStock(id: number, amount: number) { setProducts(current => current.map(p => { if(p.id!==id)return p; const stock=Math.max(0,p.stock+amount); void supabase.from('products').update({stock}).eq('id',id); return {...p,stock}; })); }
  function deleteProduct(id: number) { void supabase.from('products').delete().eq('id',id); setProducts(current => current.filter(p => p.id !== id)); }

  if (!authenticated) return <Login onSubmit={login} showPassword={showPassword} setShowPassword={setShowPassword} />;

  return <main className="min-h-screen bg-[#f3f5f2] text-[#172018]">
    <Sidebar view={view} onView={changeView} open={mobileNav} onClose={() => setMobileNav(false)} onLogout={logout} />
    <div className="lg:pl-64">
      <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-[#dfe4dd] bg-white/90 px-4 backdrop-blur-xl sm:px-8">
        <div className="flex items-center gap-3"><button onClick={() => setMobileNav(true)} className="rounded-xl border border-[#dfe4dd] p-2.5 lg:hidden" aria-label="Open menu"><Menu size={20}/></button><div><p className="hidden text-[10px] font-bold uppercase tracking-[.18em] text-[#66806d] sm:block">Wednesday, August 27</p><h1 className="text-lg font-bold sm:text-xl">Good afternoon, Edison</h1></div></div>
        <div className="flex items-center gap-3"><span className={`hidden rounded-full px-3 py-1 text-xs font-semibold sm:inline ${databaseReady?'bg-[#edf4e8] text-[#5f7d3d]':'bg-[#fff0e3] text-[#b86629]'}`}>{databaseReady?'PostgreSQL connected':'Connecting…'}</span><div className="hidden text-right sm:block"><p className="text-sm font-semibold">Edison Martinez</p><p className="text-xs text-[#66806d]">Administrator</p></div><div className="grid h-10 w-10 place-items-center rounded-full bg-[#13251b] text-xs font-bold text-[#c8f45d]">EM</div></div>
      </header>
      {view === 'overview' && <Overview products={products} inventoryValue={inventoryValue} lowStock={lowStock} onAdd={() => openProduct()} onView={changeView} />}
      {view === 'products' && <Products products={filtered} search={search} setSearch={setSearch} category={category} setCategory={setCategory} onAdd={() => openProduct()} onEdit={openProduct} onAdjust={adjustStock} onDelete={deleteProduct} />}
      {view === 'orders' && <Orders orders={orderData} />}
      {view === 'settings' && <SettingsPanel />}
    </div>
    {modal && <ProductModal product={editing} onClose={() => setModal(false)} onSave={saveProduct} />}
  </main>;
}

function Login({ onSubmit, showPassword, setShowPassword }: { onSubmit: (e: FormEvent<HTMLFormElement>) => void; showPassword: boolean; setShowPassword: (v: boolean) => void }) {
  return <main className="grid min-h-screen bg-[#f3f5f2] lg:grid-cols-[1.05fr_.95fr]">
    <section className="relative hidden overflow-hidden bg-[#13251b] p-12 text-white lg:flex lg:flex-col lg:justify-between"><div className="absolute -right-24 top-24 h-80 w-80 rounded-full bg-[#c8f45d]/10 blur-3xl"/><div className="relative flex items-center gap-3 text-xl font-bold"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#c8f45d] text-[#172018]"><Boxes size={22}/></span>StockPilot</div><div className="relative max-w-xl"><span className="rounded-full border border-white/10 px-4 py-2 text-xs text-[#c8f45d]">INVENTORY, SIMPLIFIED</span><h1 className="mt-7 text-6xl font-bold leading-[1.02] tracking-[-.055em]">Know what&apos;s in stock.<br/><span className="text-white/35">Know what&apos;s next.</span></h1><p className="mt-6 max-w-md text-lg leading-8 text-white/55">One calm workspace for products, stock levels, orders, and the decisions that move your business forward.</p></div><p className="relative text-xs text-white/30">© 2026 StockPilot · Demo workspace</p></section>
    <section className="flex items-center justify-center p-5 sm:p-10"><div className="w-full max-w-md"><div className="mb-12 flex items-center gap-3 text-xl font-bold lg:hidden"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#13251b] text-[#c8f45d]"><Boxes size={22}/></span>StockPilot</div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#74913a]">Welcome back</p><h2 className="mt-3 text-4xl font-bold tracking-tight">Sign in to your workspace</h2><p className="mt-3 text-[#66806d]">Use the demo credentials below to explore StockPilot.</p><form onSubmit={onSubmit} className="mt-9 space-y-5"><label className="block text-sm font-semibold">Email address<input required type="email" defaultValue="admin@stockpilot.demo" className="mt-2 w-full rounded-xl border border-[#d7ded5] bg-white px-4 py-3.5 outline-none transition focus:border-[#74913a]"/></label><label className="block text-sm font-semibold">Password<div className="relative mt-2"><input required type={showPassword?'text':'password'} defaultValue="stockpilot" className="w-full rounded-xl border border-[#d7ded5] bg-white px-4 py-3.5 pr-12 outline-none transition focus:border-[#74913a]"/><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#66806d]" aria-label="Show password">{showPassword?<EyeOff size={19}/>:<Eye size={19}/>}</button></div></label><div className="rounded-xl border border-[#dce5d5] bg-[#eef4e9] p-3 text-xs text-[#53644f]">Demo account · your changes are saved on this device.</div><button className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#13251b] px-5 py-4 font-bold text-white transition hover:bg-[#1d3928]">Enter dashboard <ArrowUpRight size={18}/></button></form></div></section>
  </main>;
}

function Sidebar({ view, onView, open, onClose, onLogout }: { view: View; onView: (v: View) => void; open: boolean; onClose: () => void; onLogout: () => void }) {
  const items = [{ id: 'overview' as View, label: 'Overview', icon: ChartNoAxesCombined }, { id: 'products' as View, label: 'Products', icon: PackageCheck }, { id: 'orders' as View, label: 'Orders', icon: ShoppingCart }, { id: 'settings' as View, label: 'Settings', icon: Settings }];
  return <><div onClick={onClose} className={`fixed inset-0 z-30 bg-black/35 transition lg:hidden ${open?'opacity-100':'pointer-events-none opacity-0'}`}/><aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-[#13251b] p-5 text-white transition-transform lg:translate-x-0 ${open?'translate-x-0':'-translate-x-full'}`}><div className="flex items-center justify-between"><div className="flex items-center gap-3 text-lg font-bold"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#c8f45d] text-[#172018]"><Boxes size={20}/></span>StockPilot</div><button onClick={onClose} className="text-white/50 lg:hidden"><X/></button></div><p className="mt-10 px-4 text-[10px] font-bold uppercase tracking-[.2em] text-white/30">Workspace</p><nav className="mt-3 space-y-2">{items.map(({id,label,icon:Icon})=><button key={id} onClick={()=>onView(id)} className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm transition ${view===id?'bg-white/10 font-semibold text-white':'text-white/50 hover:bg-white/5 hover:text-white'}`}><Icon size={18}/>{label}</button>)}</nav><div className="mt-auto rounded-2xl bg-white/[.06] p-4"><p className="text-xs text-white/40">Demo workspace</p><p className="mt-1 text-sm font-semibold">Edison&apos;s Store</p><button onClick={onLogout} className="mt-4 flex items-center gap-2 text-xs text-white/45 hover:text-white"><LogOut size={14}/>Sign out</button></div></aside></>;
}

function Overview({ products, inventoryValue, lowStock, onAdd, onView }: { products: Product[]; inventoryValue: number; lowStock: Product[]; onAdd: () => void; onView: (v: View) => void }) {
  return <section className="mx-auto max-w-7xl p-4 sm:p-8"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm text-[#66806d]">Inventory command center</p><h2 className="mt-1 text-3xl font-bold tracking-tight">Business overview</h2></div><button onClick={onAdd} className="flex items-center justify-center gap-2 rounded-xl bg-[#13251b] px-5 py-3 text-sm font-semibold text-white"><Plus size={17}/>Add product</button></div><div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[
    { label:'Total products',value:String(products.length),note:'+12% vs. last month',icon:PackageCheck }, { label:'Inventory value',value:money(inventoryValue),note:'+8.2% this month',icon:CircleDollarSign }, { label:'Low stock',value:String(lowStock.length),note:'Needs attention',icon:AlertTriangle }, { label:'Orders today',value:'32',note:'₱4,820 revenue',icon:ShoppingCart }
  ].map(({label,value,note,icon:Icon},i)=><article key={label} className="rounded-2xl border border-[#dfe4dd] bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><p className="text-sm text-[#66806d]">{label}</p><span className={`grid h-9 w-9 place-items-center rounded-xl ${i===2?'bg-[#fff0e9] text-[#e06b38]':'bg-[#eef4e9] text-[#74913a]'}`}><Icon size={18}/></span></div><p className="mt-5 text-3xl font-bold">{value}</p><p className="mt-2 flex items-center gap-1 text-xs text-[#66806d]">{i<2&&<TrendingUp size={13} className="text-[#74913a]"/>}{note}</p></article>)}</div>
    <div className="mt-6 grid gap-6 xl:grid-cols-[1.45fr_.75fr]"><article className="rounded-2xl border border-[#dfe4dd] bg-white p-5 sm:p-6"><div className="flex items-center justify-between"><div><h3 className="font-bold">Inventory movement</h3><p className="text-sm text-[#66806d]">Stock in vs. stock out</p></div><span className="rounded-lg bg-[#f0f4ec] px-3 py-2 text-xs">Last 7 days</span></div><div className="mt-8 flex h-56 items-end gap-3 sm:gap-5">{[42,58,46,75,62,88,72].map((h,i)=><div key={i} className="flex flex-1 items-end gap-1"><span className="w-1/2 rounded-t-md bg-[#c8f45d]" style={{height:`${h}%`}}/><span className="w-1/2 rounded-t-md bg-[#244c36]" style={{height:`${h*.65}%`}}/></div>)}</div><div className="mt-4 flex gap-5 text-xs text-[#66806d]"><span><i className="mr-2 inline-block h-2 w-2 rounded-full bg-[#c8f45d]"/>Stock in</span><span><i className="mr-2 inline-block h-2 w-2 rounded-full bg-[#244c36]"/>Stock out</span></div></article><article className="rounded-2xl border border-[#dfe4dd] bg-[#13251b] p-6 text-white"><h3 className="font-bold">Stock health</h3><p className="text-sm text-white/50">Across all categories</p><div className="mx-auto mt-8 grid h-40 w-40 place-items-center rounded-full border-[18px] border-[#c8f45d]"><div className="text-center"><p className="text-3xl font-bold">86%</p><p className="text-xs text-white/50">Healthy</p></div></div><button onClick={()=>onView('products')} className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 py-3 text-sm">Review inventory <ArrowUpRight size={15}/></button></article></div>
    <div className="mt-6 rounded-2xl border border-[#dfe4dd] bg-white"><div className="flex items-center justify-between border-b border-[#e5e9e3] p-5"><div><h3 className="font-bold">Low stock alerts</h3><p className="text-sm text-[#66806d]">Products at or below reorder level</p></div><button onClick={()=>onView('products')} className="text-sm font-semibold text-[#426334]">View all</button></div><div className="divide-y divide-[#edf0ec]">{lowStock.slice(0,3).map(p=><div key={p.id} className="flex items-center gap-4 p-5"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#fff0e9] text-[#e06b38]"><AlertTriangle size={18}/></span><div className="min-w-0 flex-1"><p className="truncate font-semibold">{p.name}</p><p className="text-xs text-[#66806d]">{p.sku}</p></div><div className="text-right"><p className="font-bold text-[#d75d2a]">{p.stock} left</p><p className="text-xs text-[#66806d]">Reorder at {p.reorder}</p></div></div>)}</div></div>
  </section>;
}

function Products({ products, search, setSearch, category, setCategory, onAdd, onEdit, onAdjust, onDelete }: { products: Product[]; search: string; setSearch: (v:string)=>void; category:string; setCategory:(v:string)=>void; onAdd:()=>void; onEdit:(p:Product)=>void; onAdjust:(id:number,n:number)=>void; onDelete:(id:number)=>void }) {
  const categories = ['All categories','Peripherals','Displays','Accessories','Furniture','Components'];
  return <section className="mx-auto max-w-7xl p-4 sm:p-8"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm text-[#66806d]">Catalog & stock control</p><h2 className="mt-1 text-3xl font-bold tracking-tight">Products</h2></div><button onClick={onAdd} className="flex items-center justify-center gap-2 rounded-xl bg-[#13251b] px-5 py-3 text-sm font-semibold text-white"><Plus size={17}/>Add product</button></div><div className="mt-8 flex flex-col gap-3 rounded-2xl border border-[#dfe4dd] bg-white p-4 sm:flex-row"><label className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7b8a80]" size={18}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by product name or SKU..." className="w-full rounded-xl border border-[#dfe4dd] py-3 pl-10 pr-4 outline-none focus:border-[#74913a]"/></label><label className="relative"><Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7b8a80]" size={16}/><select value={category} onChange={e=>setCategory(e.target.value)} className="w-full appearance-none rounded-xl border border-[#dfe4dd] bg-white py-3 pl-10 pr-10 text-sm outline-none sm:w-52">{categories.map(c=><option key={c}>{c}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#7b8a80]" size={16}/></label></div><div className="mt-4 overflow-hidden rounded-2xl border border-[#dfe4dd] bg-white"><div className="hidden grid-cols-[2fr_1fr_.7fr_.8fr_130px] border-b border-[#e5e9e3] bg-[#f8f9f7] px-5 py-3 text-[11px] font-bold uppercase tracking-[.12em] text-[#728076] md:grid"><span>Product</span><span>Category</span><span>Stock</span><span>Price</span><span className="text-right">Actions</span></div><div className="divide-y divide-[#edf0ec]">{products.map(p=><div key={p.id} className="grid gap-3 p-4 md:grid-cols-[2fr_1fr_.7fr_.8fr_130px] md:items-center md:px-5"><div className="flex items-center gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#eef4e9] text-[#54743f]"><PackageCheck size={20}/></span><div className="min-w-0"><p className="truncate font-semibold">{p.name}</p><p className="text-xs text-[#7b8a80]">{p.sku} · <span className={p.status==='Active'?'text-[#64843e]':'text-[#a27a35]'}>{p.status}</span></p></div></div><p className="text-sm text-[#617069]"><span className="md:hidden">Category: </span>{p.category}</p><div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${p.stock===0?'bg-[#ffe9e5] text-[#c64732]':p.stock<=p.reorder?'bg-[#fff0e3] text-[#c56b28]':'bg-[#edf4e8] text-[#5f7d3d]'}`}>{p.stock} units</span></div><p className="font-semibold">{money(p.price)}</p><div className="flex justify-end gap-1"><button onClick={()=>onAdjust(p.id,-1)} aria-label="Decrease stock" className="rounded-lg border border-[#dfe4dd] p-2 text-[#69766d] hover:bg-[#f1f4ef]"><Minus size={15}/></button><button onClick={()=>onAdjust(p.id,1)} aria-label="Increase stock" className="rounded-lg border border-[#dfe4dd] p-2 text-[#69766d] hover:bg-[#f1f4ef]"><Plus size={15}/></button><button onClick={()=>onEdit(p)} aria-label="Edit product" className="rounded-lg border border-[#dfe4dd] p-2 text-[#69766d] hover:bg-[#f1f4ef]"><ClipboardList size={15}/></button><button onClick={()=>onDelete(p.id)} aria-label="Delete product" className="rounded-lg p-2 text-[#bd5b4b] hover:bg-[#fff0ed]"><Trash2 size={15}/></button></div></div>)}{products.length===0&&<div className="p-12 text-center text-[#7b8a80]">No products match your filters.</div>}</div></div></section>;
}

function Orders({orders}:{orders:Order[]}) {
  return <section className="mx-auto max-w-7xl p-4 sm:p-8"><div><p className="text-sm text-[#66806d]">Sales fulfillment</p><h2 className="mt-1 text-3xl font-bold tracking-tight">Orders</h2></div><div className="mt-8 grid gap-4 sm:grid-cols-3">{[['Processing','12','Ready to pack'],['Shipped','18','In transit'],['Delivered','146','This month']].map(([a,b,c])=><div key={a} className="rounded-2xl border border-[#dfe4dd] bg-white p-5"><p className="text-sm text-[#66806d]">{a}</p><p className="mt-3 text-3xl font-bold">{b}</p><p className="mt-1 text-xs text-[#7b8a80]">{c}</p></div>)}</div><div className="mt-6 overflow-hidden rounded-2xl border border-[#dfe4dd] bg-white"><div className="border-b border-[#e5e9e3] p-5"><h3 className="font-bold">Recent orders</h3><p className="text-sm text-[#66806d]">Track current sales and fulfillment</p></div><div className="divide-y divide-[#edf0ec]">{orders.map(o=><div key={o.id} className="grid gap-3 p-5 sm:grid-cols-[.8fr_1.4fr_.5fr_.7fr_.8fr] sm:items-center"><p className="font-mono text-sm font-semibold">{o.id}</p><div><p className="font-semibold">{o.customer}</p><p className="text-xs text-[#7b8a80]">{o.date}</p></div><p className="text-sm">{o.items} items</p><p className="font-semibold">{money(o.total)}</p><div><span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${o.status==='Delivered'?'bg-[#edf4e8] text-[#5f7d3d]':o.status==='Shipped'?'bg-[#e9f1fa] text-[#3f6e9b]':'bg-[#fff0e3] text-[#b86629]'}`}>{o.status}</span></div></div>)}</div></div></section>;
}

type Preferences = { currency:string; units:string; theme:string; lowStock:boolean; lowStockLevel:number; skuPrefix:string; skuAuto:boolean; emailOrders:boolean; emailLowStock:boolean; browserAlerts:boolean; twoFactor:boolean };
const defaultPreferences: Preferences = { currency:'PHP', units:'Metric', theme:'System', lowStock:true, lowStockLevel:10, skuPrefix:'SP', skuAuto:true, emailOrders:true, emailLowStock:true, browserAlerts:false, twoFactor:false };

function SettingsPanel() {
  const [prefs,setPrefs] = useState<Preferences>(defaultPreferences);
  const [saved,setSaved] = useState(false);
  const [active,setActive] = useState('security');
  useEffect(()=>{ void loadPreferences(); },[]);
  async function loadPreferences(){
    const {data}=await supabase.from('user_preferences').select('*').maybeSingle();
    if(data) setPrefs({currency:data.currency,units:data.units,theme:data.theme,lowStock:data.low_stock_enabled,lowStockLevel:data.low_stock_level,skuPrefix:data.sku_prefix,skuAuto:data.sku_auto,emailOrders:data.email_orders,emailLowStock:data.email_low_stock,browserAlerts:data.browser_alerts,twoFactor:data.two_factor});
  }
  async function save(){
    const {data:{user}}=await supabase.auth.getUser();
    if(!user)return;
    await supabase.from('user_preferences').upsert({user_id:user.id,currency:prefs.currency,units:prefs.units,theme:prefs.theme,low_stock_enabled:prefs.lowStock,low_stock_level:prefs.lowStockLevel,sku_prefix:prefs.skuPrefix,sku_auto:prefs.skuAuto,email_orders:prefs.emailOrders,email_low_stock:prefs.emailLowStock,browser_alerts:prefs.browserAlerts,two_factor:prefs.twoFactor,updated_at:new Date().toISOString()});
    setSaved(true); setTimeout(()=>setSaved(false),1800);
  }
  const sections=[['security','Account Security'],['general','General Preferences'],['inventory','Inventory Defaults'],['notifications','Notifications'],['users','User Management']];
  return <section className="mx-auto max-w-7xl p-4 sm:p-8"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm text-[#66806d]">Workspace administration</p><h2 className="mt-1 text-3xl font-bold tracking-tight">Settings</h2></div><button onClick={save} className="flex items-center justify-center gap-2 rounded-xl bg-[#13251b] px-5 py-3 text-sm font-semibold text-white"><Check size={17}/>{saved?'Saved':'Save changes'}</button></div>
    <div className="mt-8 grid gap-6 lg:grid-cols-[240px_1fr]"><nav className="h-fit rounded-2xl border border-[#dfe4dd] bg-white p-2">{sections.map(([id,label],i)=><button key={id} onClick={()=>setActive(id)} className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm ${active===id?'bg-[#13251b] font-semibold text-white':'text-[#617069] hover:bg-[#f2f5f0]'}`}><span>{label}</span>{i===4&&<span className="rounded-full bg-[#c8f45d] px-2 py-0.5 text-[9px] font-bold text-[#172018]">ADMIN</span>}</button>)}</nav>
      <div className="space-y-5">
        {active==='security'&&<SettingsCard title="Account Security" subtitle="Password, two-factor authentication, and profile"><div className="grid gap-4 sm:grid-cols-2"><Field label="Display name"><input defaultValue="Edison Martinez"/></Field><Field label="Account email"><input type="email" defaultValue="admin@stockpilot.demo"/></Field></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><Field label="New password"><input type="password" placeholder="Enter a new password"/></Field><Field label="Confirm password"><input type="password" placeholder="Repeat new password"/></Field></div><SettingRow title="Two-factor authentication" description="Require a verification code when signing in."><Toggle enabled={prefs.twoFactor} onChange={v=>setPrefs({...prefs,twoFactor:v})}/></SettingRow></SettingsCard>}
        {active==='general'&&<SettingsCard title="General Preferences" subtitle="Currency, measurement units, and appearance"><div className="grid gap-5 sm:grid-cols-3"><Field label="Currency"><select value={prefs.currency} onChange={e=>setPrefs({...prefs,currency:e.target.value})}><option value="PHP">Philippine Peso (₱)</option><option value="USD">US Dollar ($)</option><option value="EUR">Euro (€)</option></select></Field><Field label="Units"><select value={prefs.units} onChange={e=>setPrefs({...prefs,units:e.target.value})}><option>Metric</option><option>Imperial</option></select></Field><Field label="Theme"><select value={prefs.theme} onChange={e=>setPrefs({...prefs,theme:e.target.value})}><option>System</option><option>Light</option><option>Dark</option></select></Field></div></SettingsCard>}
        {active==='inventory'&&<SettingsCard title="Inventory Defaults" subtitle="Low-stock alerts and SKU generation rules"><SettingRow title="Low-stock alerts" description="Flag products when quantity reaches the reorder threshold."><Toggle enabled={prefs.lowStock} onChange={v=>setPrefs({...prefs,lowStock:v})}/></SettingRow><div className="grid gap-5 pt-5 sm:grid-cols-2"><Field label="Default low-stock level"><input type="number" min="0" value={prefs.lowStockLevel} onChange={e=>setPrefs({...prefs,lowStockLevel:Number(e.target.value)})}/></Field><Field label="SKU prefix"><input value={prefs.skuPrefix} maxLength={8} onChange={e=>setPrefs({...prefs,skuPrefix:e.target.value.toUpperCase()})}/></Field></div><SettingRow title="Automatic SKU generation" description={`Create IDs like ${prefs.skuPrefix || 'SP'}-0001 for new products.`}><Toggle enabled={prefs.skuAuto} onChange={v=>setPrefs({...prefs,skuAuto:v})}/></SettingRow></SettingsCard>}
        {active==='notifications'&&<SettingsCard title="Notifications" subtitle="Choose which email and in-app alerts you receive"><SettingRow title="New order emails" description="Email administrators whenever a new order is placed."><Toggle enabled={prefs.emailOrders} onChange={v=>setPrefs({...prefs,emailOrders:v})}/></SettingRow><SettingRow title="Low-stock emails" description="Send a daily summary of items needing attention."><Toggle enabled={prefs.emailLowStock} onChange={v=>setPrefs({...prefs,emailLowStock:v})}/></SettingRow><SettingRow title="Browser alerts" description="Show real-time alerts while StockPilot is open."><Toggle enabled={prefs.browserAlerts} onChange={v=>setPrefs({...prefs,browserAlerts:v})}/></SettingRow></SettingsCard>}
        {active==='users'&&<SettingsCard title="User Management" subtitle="Administrator-only roles and audit history"><div className="mb-5 rounded-xl border border-[#dce5d5] bg-[#eef4e9] p-4 text-sm text-[#53644f]"><b>Admin only.</b> Only administrators can invite users, change roles, or review audit logs.</div><div className="overflow-hidden rounded-xl border border-[#dfe4dd]"><div className="grid grid-cols-[1fr_100px_90px] bg-[#f7f9f6] px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#718077]"><span>User</span><span>Role</span><span>Status</span></div>{[['Edison Martinez','Admin'],['Mira Santos','Manager'],['Noah Cruz','Viewer']].map(([name,role],i)=><div key={name} className="grid grid-cols-[1fr_100px_90px] items-center border-t border-[#edf0ec] px-4 py-4 text-sm"><div><p className="font-semibold">{name}</p><p className="text-xs text-[#7b8a80]">{i===0?'admin@stockpilot.demo':name.toLowerCase().replace(' ','.')+'@demo.com'}</p></div><span>{role}</span><span className="text-[#63833d]">Active</span></div>)}</div><h4 className="mt-7 font-bold">Recent audit log</h4><div className="mt-3 space-y-3 text-sm">{['Edison updated inventory defaults','Mira adjusted stock for KB-MECH-01','Edison changed Noah’s role to Viewer'].map((x,i)=><div key={x} className="flex justify-between gap-4 rounded-xl bg-[#f7f9f6] p-3"><span>{x}</span><span className="shrink-0 text-xs text-[#7b8a80]">{i+1}h ago</span></div>)}</div></SettingsCard>}
      </div>
    </div>
  </section>;
}

function SettingsCard({title,subtitle,children}:{title:string;subtitle:string;children:React.ReactNode}){return <article className="rounded-2xl border border-[#dfe4dd] bg-white p-5 shadow-sm sm:p-7"><div className="border-b border-[#edf0ec] pb-5"><h3 className="text-lg font-bold">{title}</h3><p className="mt-1 text-sm text-[#66806d]">{subtitle}</p></div><div className="pt-5">{children}</div></article>}
function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="block text-sm font-semibold">{label}<span className="mt-2 block [&_input]:w-full [&_input]:rounded-xl [&_input]:border [&_input]:border-[#d7ded5] [&_input]:px-4 [&_input]:py-3 [&_select]:w-full [&_select]:rounded-xl [&_select]:border [&_select]:border-[#d7ded5] [&_select]:bg-white [&_select]:px-4 [&_select]:py-3">{children}</span></label>}
function SettingRow({title,description,children}:{title:string;description:string;children:React.ReactNode}){return <div className="flex items-center justify-between gap-5 border-b border-[#edf0ec] py-5 last:border-0"><div><p className="font-semibold">{title}</p><p className="mt-1 text-sm text-[#66806d]">{description}</p></div>{children}</div>}
function Toggle({enabled,onChange}:{enabled:boolean;onChange:(v:boolean)=>void}){return <button type="button" role="switch" aria-checked={enabled} onClick={()=>onChange(!enabled)} className={`relative h-7 w-12 shrink-0 rounded-full transition ${enabled?'bg-[#74913a]':'bg-[#cbd2cd]'}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${enabled?'left-6':'left-1'}`}/></button>}

function ProductModal({ product, onClose, onSave }: { product: Product | null; onClose:()=>void; onSave:(e:FormEvent<HTMLFormElement>)=>void }) {
  return <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[#0d1912]/55 p-4 backdrop-blur-sm"><form onSubmit={onSave} className="my-8 w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl sm:p-8"><div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-[.15em] text-[#74913a]">Product record</p><h2 className="mt-2 text-2xl font-bold">{product?'Edit product':'Add new product'}</h2></div><button type="button" onClick={onClose} className="rounded-xl bg-[#f1f4ef] p-2"><X size={19}/></button></div><div className="mt-7 grid gap-5 sm:grid-cols-2"><label className="sm:col-span-2">Product name<input required name="name" defaultValue={product?.name} placeholder="e.g. Wireless Keyboard"/></label><label>SKU<input required name="sku" defaultValue={product?.sku} placeholder="SKU-001"/></label><label>Category<select name="category" defaultValue={product?.category??'Peripherals'}><option>Peripherals</option><option>Displays</option><option>Accessories</option><option>Furniture</option><option>Components</option></select></label><label>Stock quantity<input required min="0" type="number" name="stock" defaultValue={product?.stock??0}/></label><label>Reorder level<input required min="0" type="number" name="reorder" defaultValue={product?.reorder??5}/></label><label>Unit price<input required min="0" step="0.01" type="number" name="price" defaultValue={product?.price??0}/></label><label>Status<select name="status" defaultValue={product?.status??'Active'}><option>Active</option><option>Draft</option></select></label></div><div className="mt-8 flex justify-end gap-3"><button type="button" onClick={onClose} className="rounded-xl border border-[#dfe4dd] px-5 py-3 text-sm font-semibold">Cancel</button><button className="flex items-center gap-2 rounded-xl bg-[#13251b] px-5 py-3 text-sm font-semibold text-white"><Check size={17}/>{product?'Save changes':'Add product'}</button></div></form></div>;
}

function money(value:number) { return new Intl.NumberFormat('en-PH',{style:'currency',currency:'PHP',maximumFractionDigits:0}).format(value); }

