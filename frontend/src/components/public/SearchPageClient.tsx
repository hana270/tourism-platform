'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useLocale } from '@/i18n/translate';
import { Filter, Search, SlidersHorizontal, X } from 'lucide-react';
import { PublicHeader } from '@/components/public/PublicHeader';
import { OfferCard } from '@/components/public/OfferCard';
import { BookingModal } from '@/components/public/BookingModal';
import { OffersApi } from '@/lib/offers.api';
import { CategoriesApi } from '@/lib/categories.api';
import { ZonesApi } from '@/lib/zones.api';
import { Offer, Zone } from '@/types/offer';
import { Category } from '@/types/category';

export default function SearchPageClient() {
  const locale = useLocale();
  const query = useSearchParams();
  const router = useRouter();
  const [offers,setOffers]=useState<Offer[]>([]);
  const [categories,setCategories]=useState<Category[]>([]);
  const [zones,setZones]=useState<Zone[]>([]);
  const [loading,setLoading]=useState(true);
  const [booking,setBooking]=useState<Offer|null>(null);
  const [category,setCategory]=useState(query.get('category')||'');
  const [zone,setZone]=useState(query.get('zone')||'');
  const [start,setStart]=useState(query.get('start')||'');
  const [end,setEnd]=useState(query.get('end')||'');
  const [guests,setGuests]=useState(Number(query.get('guests')||2));
  const [maxPrice,setMaxPrice]=useState(query.get('max')||'');
  const [text,setText]=useState(query.get('q')||'');

  const load = () => {
    setLoading(true);
    OffersApi.list({locale,status:'PUBLISHED',categoryId:category||undefined,zoneId:zone||undefined,startDate:start||undefined,endDate:end||undefined,guests:guests||undefined,maxPrice:maxPrice?Number(maxPrice):undefined})
      .then((items) => { const q = text.trim().toLowerCase(); setOffers(q ? items.filter(o => [o.name, o.zone?.name, o.category?.name].filter(Boolean).some(v => String(v).toLowerCase().includes(q))) : items); }).catch(()=>setOffers([])).finally(()=>setLoading(false));
  };
  useEffect(()=>{ Promise.all([CategoriesApi.list(locale).then(v=>setCategories(v.filter(c=>c.isActive))),ZonesApi.list(locale).then(setZones)]).catch(()=>undefined); },[locale]);
  // Initial load for the selected locale; searches are refreshed explicitly on submit.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(()=>{ load(); },[locale]);

  function submit(e:React.FormEvent){ e.preventDefault(); const p=new URLSearchParams(); if(text.trim())p.set('q',text.trim()); if(category)p.set('category',category);if(zone)p.set('zone',zone);if(start)p.set('start',start);if(end)p.set('end',end);if(guests)p.set('guests',String(guests));if(maxPrice)p.set('max',maxPrice);router.replace(`/${locale}/search?${p.toString()}`,{scroll:false});load(); }
  const selectedCategory=useMemo(()=>categories.find(c=>c.id===category),[categories,category]);

  return <main className="public-shell min-h-screen">
    <div className="min-h-[360px] bg-slate-950">
      <div className="relative mx-auto max-w-[1400px]"><PublicHeader/>
        <div className="px-4 pb-12 pt-36 sm:px-8">
          <p className="text-[11px] font-bold uppercase tracking-[.2em] text-white/40">Explorer la Tunisie</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-white sm:text-5xl">Trouvez votre prochaine expérience</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-white/60">Les offres sont filtrées automatiquement selon les disponibilités gérées par l’administrateur.</p>
          <form onSubmit={submit} className="mt-8 rounded-3xl bg-white p-3 shadow-2xl">
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-6">
              <input value={text} onChange={e=>setText(e.target.value)} placeholder="Rechercher un lieu, hôtel ou activité" className="h-12 rounded-xl bg-slate-50 px-3 text-sm font-semibold outline-none lg:col-span-2"/>
              <select value={category} onChange={e=>setCategory(e.target.value)} className="h-12 rounded-xl bg-slate-50 px-3 text-sm font-semibold outline-none"><option value="">Tous les services</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
              <select value={zone} onChange={e=>setZone(e.target.value)} className="h-12 rounded-xl bg-slate-50 px-3 text-sm font-semibold outline-none"><option value="">Toutes les zones</option>{zones.map(z=><option key={z.id} value={z.id}>{z.name}</option>)}</select>
              <input type="date" value={start} onChange={e=>setStart(e.target.value)} className="h-12 rounded-xl bg-slate-50 px-3 text-sm font-semibold outline-none"/>
              <input type="date" value={end} onChange={e=>setEnd(e.target.value)} className="h-12 rounded-xl bg-slate-50 px-3 text-sm font-semibold outline-none"/>
              <input type="number" min="1" value={guests} onChange={e=>setGuests(Number(e.target.value)||1)} placeholder="Voyageurs" className="h-12 rounded-xl bg-slate-50 px-3 text-sm font-semibold outline-none"/>
              <button className="flex h-12 items-center justify-center gap-2 rounded-xl bg-slate-950 text-sm font-bold text-white transition hover:bg-slate-800"><Search size={17}/> Rechercher</button>
            </div>
            <div className="mt-2 flex items-center gap-2 px-1 text-[11px] text-slate-400"><Filter size={13}/> Budget maximum <input value={maxPrice} onChange={e=>setMaxPrice(e.target.value)} type="number" min="0" placeholder="TND" className="w-24 rounded-lg bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700 outline-none"/>{selectedCategory&&<span className="ml-auto">{selectedCategory.name}</span>}</div>
          </form>
        </div>
      </div>
    </div>
    <section className="public-container public-section">
      <div className="mb-8 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-slate-400">{offers.length} résultat{offers.length>1?'s':''}</p><h2 className="mt-1 text-2xl font-black text-slate-950">{start&&end?'Disponibles pour vos dates':'Toutes les offres publiées'}</h2></div><div className="hidden items-center gap-2 text-xs text-slate-400 sm:flex"><SlidersHorizontal size={14}/> Disponibilité automatique</div></div>
      {loading?<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{[1,2,3,4,5,6].map(i=><div key={i} className="h-[430px] animate-pulse rounded-3xl bg-slate-100"/>)}</div>:
      offers.length?<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{offers.map(o=><OfferCard key={o.id} offer={o} locale={locale} onReserve={setBooking}/>)}</div>:
      <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100"><X size={20}/></div><h3 className="mt-4 text-lg font-bold">Aucune offre trouvée</h3><p className="mt-2 text-sm text-slate-500">Essayez une autre destination, une autre période ou élargissez vos critères.</p><button type="button" onClick={()=>{setCategory('');setZone('');setStart('');setEnd('');setMaxPrice('');setText('');load();}} className="mt-5 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white">Réinitialiser</button></div>}
    </section>
    <BookingModal offer={booking} startDate={start} endDate={end} guests={guests} onClose={()=>setBooking(null)}/>
  </main>;
}
