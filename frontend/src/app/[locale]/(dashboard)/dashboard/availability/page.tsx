'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, LockKeyhole, RefreshCw } from 'lucide-react';
import Swal from 'sweetalert2';
import { useLocale, useTranslations } from '@/i18n/translate';
import { OperationsApi, AvailabilityBlock } from '@/lib/operations.api';
import { OffersApi } from '@/lib/offers.api';
import { Offer } from '@/types/offer';

const pad=(n:number)=>String(n).padStart(2,'0');
const key=(d:Date)=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
function daysInMonth(year:number, month:number){return new Date(year,month+1,0).getDate();}
function isInside(date:string,start:string,end:string){return date>=start && date<end;}

export default function AvailabilityPage(){
 const t=useTranslations('availability'); const locale=useLocale(); const [rows,setRows]=useState<AvailabilityBlock[]>([]); const [offers,setOffers]=useState<Offer[]>([]); const [loading,setLoading]=useState(true); const [offerId,setOfferId]=useState('');
 const [cursor,setCursor]=useState(()=>new Date());
 const load=useCallback(async()=>{setLoading(true);try{const [blocks,loaded]=await Promise.all([OperationsApi.blocks(),OffersApi.list(locale)]);setRows(blocks);setOffers(loaded);}catch{await Swal.fire({icon:'error',title:t('loadError')});}finally{setLoading(false);}},[locale,t]);
 useEffect(()=>{void load()},[load]);
 const filtered=useMemo(()=>rows.filter(r=>!offerId||r.offerId===offerId),[rows,offerId]);
 const cells=useMemo(()=>{const y=cursor.getFullYear(),m=cursor.getMonth();const first=new Date(y,m,1);const offset=(first.getDay()+6)%7;const total=daysInMonth(y,m);return Array.from({length:Math.ceil((offset+total)/7)*7},(_,i)=>i<offset?null:new Date(y,m,i-offset+1));},[cursor]);
 const byDate=(d:Date)=>filtered.filter(r=>isInside(key(d),r.startDate.slice(0,10),r.endDate.slice(0,10)));
 return <div className="page-transition space-y-6">
  <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><div className="flex items-center gap-2"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><CalendarDays size={20}/></span><div><h1 className="font-display text-2xl font-semibold text-ink">{t('title')}</h1><p className="mt-1 text-sm text-ink-soft">Calendrier de contrôle des périodes automatiquement bloquées.</p></div></div></div><button className="btn-secondary" onClick={()=>void load()} disabled={loading}><RefreshCw size={15} className={loading?'animate-spin':''}/>Actualiser</button></div>
  <div className="grid gap-4 lg:grid-cols-[1.5fr_.7fr]"><div className="card p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-display text-lg font-semibold text-ink">Disponibilité globale</h2><p className="mt-1 text-xs text-ink-faint">Une journée peut contenir plusieurs offres bloquées.</p></div><div className="flex items-center gap-2"><button className="btn-icon" onClick={()=>setCursor(new Date(cursor.getFullYear(),cursor.getMonth()-1,1))}><ChevronLeft size={16}/></button><strong className="min-w-36 text-center capitalize text-sm text-ink">{cursor.toLocaleDateString(locale,{month:'long',year:'numeric'})}</strong><button className="btn-icon" onClick={()=>setCursor(new Date(cursor.getFullYear(),cursor.getMonth()+1,1))}><ChevronRight size={16}/></button></div></div>
   <div className="mt-5 grid grid-cols-7 overflow-hidden rounded-2xl border border-border"><div className="contents">{['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'].map(d=><div key={d} className="border-b border-border bg-surface-alt px-2 py-2 text-center text-[10px] font-bold uppercase text-ink-faint">{d}</div>)}</div>{cells.map((d,i)=>d?<div key={key(d)} className={`min-h-28 border-b border-r border-border p-2 ${byDate(d).length?'bg-emerald-50/40':'bg-surface'}`}><div className="flex items-center justify-between"><span className={`text-xs font-bold ${key(d)===key(new Date())?'flex h-6 w-6 items-center justify-center rounded-full bg-ink text-white':''}`}>{d.getDate()}</span>{byDate(d).length>0&&<span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-extrabold text-emerald-700">{byDate(d).length}</span>}</div><div className="mt-2 space-y-1">{byDate(d).slice(0,3).map(r=><div key={r.id} className="truncate rounded-md bg-white px-1.5 py-1 text-[9px] font-semibold text-ink shadow-sm" title={r.offer?.name}>{r.offer?.name||'Offre'}</div>)}{byDate(d).length>3&&<div className="text-[9px] font-bold text-ink-faint">+{byDate(d).length-3} autre(s)</div>}</div></div>:<div key={`empty-${i}`} className="min-h-28 border-b border-r border-border bg-surface-alt/50"/>)}</div>
  </div>
  <aside className="card p-5"><label className="label">Filtrer par offre</label><select className="input" value={offerId} onChange={e=>setOfferId(e.target.value)}><option value="">Toutes les offres</option>{offers.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select><div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50 p-4"><div className="flex gap-3"><LockKeyhole size={18} className="mt-0.5 text-emerald-700"/><div><h3 className="text-sm font-bold text-emerald-900">Blocage automatique</h3><p className="mt-1 text-xs leading-5 text-emerald-800">Une date est bloquée uniquement lorsque la réservation est <strong>confirmée</strong> et <strong>payée</strong>. Si l’un de ces statuts est retiré, le blocage est supprimé.</p></div></div></div><div className="mt-4 rounded-2xl bg-surface-alt p-4"><p className="text-xs font-bold text-ink">{filtered.length} période(s) bloquée(s)</p><p className="mt-1 text-[11px] leading-5 text-ink-faint">Ce calendrier est volontairement en lecture seule pour éviter les incohérences avec les réservations.</p></div></aside></div>
 </div>;
}
