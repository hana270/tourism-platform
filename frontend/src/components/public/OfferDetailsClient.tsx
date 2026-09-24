'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale } from '@/i18n/translate';
import { ArrowLeft, CheckCircle2, ExternalLink, MapPin, MessageCircle, Star, Users, Tag } from 'lucide-react';
import { PublicHeader } from '@/components/public/PublicHeader';
import { BookingModal } from '@/components/public/BookingModal';
import { OffersApi } from '@/lib/offers.api';
import { Offer } from '@/types/offer';
import { imageUrl } from '@/lib/api';

function priceRows(o: Offer) {
  return [
    ['Logement seul', o.simplePrice],
    ['Demi-pension', o.halfBoardPrice],
    ['Pension complète', o.fullBoardPrice],
    ['All Inclusive Soft', o.allInclusivePrice],
  ].filter(([,v])=>v!=null) as [string,string|number][];
}

export default function OfferDetailsClient({ slug }: { slug: string }) {
  const locale=useLocale();
  const [offer,setOffer]=useState<Offer|null>(null);
  const [loading,setLoading]=useState(true);
  const [booking,setBooking]=useState(false);
  const [start,setStart]=useState('');
  const [end,setEnd]=useState('');
  const [guests,setGuests]=useState(2);

  useEffect(()=>{ OffersApi.getBySlug(slug,locale).then(setOffer).catch(()=>setOffer(null)).finally(()=>setLoading(false)); },[slug,locale]);

  if(loading) return <main className="min-h-screen bg-slate-50"><div className="h-20 bg-slate-950"/><div className="mx-auto max-w-6xl animate-pulse p-5"><div className="h-[460px] rounded-3xl bg-slate-200"/></div></main>;
  if(!offer) return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6"><div className="text-center"><h1 className="text-2xl font-black">Offre introuvable</h1><Link href={`/${locale}`} className="mt-4 inline-flex rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white">Retour à l&apos;accueil</Link></div></main>;

  const photos=offer.photos.length?offer.photos:[];
  const prices=priceRows(offer);
  const now = Date.now();
  const promotion = offer.promotions?.find((p) => new Date(p.startDate).getTime() <= now && new Date(p.endDate).getTime() >= now) ?? null;
  const discount = promotion && Number(promotion.oldPrice) > 0 ? Math.round((1 - Number(promotion.newPrice) / Number(promotion.oldPrice)) * 100) : 0;
  const jsonLd = {
    '@context':'https://schema.org',
    '@type':'Product',
    name:offer.name,
    description:offer.description || undefined,
    image:offer.photos.map(p=>imageUrl(p.url)),
    offers: {
      '@type':'Offer',
      priceCurrency:'TND',
      price: offer.isHotel ? Number(prices[0]?.[1] || 0) : Number(offer.price),
      availability: offer.isHotel ? 'https://schema.org/LimitedAvailability' : 'https://schema.org/InStock',
      url: typeof window !== 'undefined' ? window.location.href : undefined,
    },
  };

  return (
    <main className="public-shell">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <div className="relative min-h-[150px] bg-slate-950"><PublicHeader/><div className="h-[150px]"/></div>
      <div className="public-container -mt-10 relative z-10 pb-20">
        <div className="mb-5"><Link href={`/${locale}/search`} className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-950"><ArrowLeft size={14}/> Retour aux offres</Link></div>
        <div className="overflow-hidden rounded-[30px] bg-white shadow-xl">
          <div className="grid lg:grid-cols-[1.45fr_.75fr]">
            <div className="grid gap-1 bg-slate-100 sm:grid-cols-2">
              {photos.slice(0,5).map((p,i)=><div key={p.id||p.url} className={`${i===0?'sm:col-span-2 aspect-[16/8]':'aspect-[4/3]'} overflow-hidden bg-slate-100`}><img src={imageUrl(p.url)} alt={p.altText||offer.name} className="h-full w-full object-cover transition duration-700 hover:scale-[1.025]"/></div>)}
            </div>
            <div className="p-6 sm:p-8">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.18em] text-slate-400">{offer.category?.name}{offer.isHotel&&offer.stars?<><span>·</span><span className="flex items-center gap-1 text-amber-600"><Star size={12} fill="currentColor"/>{offer.stars} étoiles</span></>:null}</div>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">{offer.name}</h1>
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500"><span className="inline-flex items-center gap-1"><MapPin size={14}/>{offer.zone?.name}{offer.address?` · ${offer.address}`:''}</span>{!offer.isHotel&&offer.capacity&&<span className="inline-flex items-center gap-1"><Users size={14}/>Jusqu&apos;à {offer.capacity} personnes</span>}</div>
              {promotion && <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-emerald-700"><Tag size={14}/> Offre spéciale {discount > 0 ? `−${discount}%` : ''}</div><div className="mt-2 flex items-end gap-3"><span className="text-sm text-emerald-700/60 line-through">{Number(promotion.oldPrice).toFixed(0)} TND</span><strong className="text-2xl font-black text-emerald-900">{Number(promotion.newPrice).toFixed(0)} TND</strong></div><p className="mt-1 text-[11px] text-emerald-700">Promotion valable jusqu’au {new Date(promotion.endDate).toLocaleDateString(locale === 'fr' ? 'fr-TN' : 'en-TN')}.</p></div>}
              <p className="mt-6 whitespace-pre-line text-sm leading-7 text-slate-600">{offer.description}</p>
              {!!offer.customFields?.length && <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-5"><h2 className="text-sm font-black text-slate-950">Informations pratiques</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">{offer.customFields.map(field => <div key={field.id ?? field.fieldName} className="rounded-xl bg-slate-50 p-4"><p className="text-sm font-extrabold text-slate-950">{field.fieldName}</p><p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-600">{field.value}</p></div>)}</div></section>}

              {offer.isHotel ? <div className="mt-7 rounded-2xl bg-slate-50 p-5"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tarifs hôteliers</p><div className="mt-3 grid gap-2">{prices.map(([label,value])=><div key={label} className="flex items-center justify-between border-b border-slate-200 py-2 last:border-0"><span className="text-sm text-slate-600">{label}</span><strong className="text-sm text-slate-950">{Number(value).toFixed(0)} TND</strong></div>)}</div><p className="mt-3 text-[11px] text-amber-700">Disponibilité sur demande — confirmation par l&apos;administrateur.</p></div>:
              <div className="mt-7 rounded-2xl bg-slate-950 p-5 text-white"><p className="text-[10px] font-bold uppercase tracking-wider text-white/50">Tarif</p><div className="mt-1 text-3xl font-black">{Number(offer.price).toFixed(0)} <span className="text-sm font-medium text-white/50">TND</span></div><p className="mt-1 text-[11px] text-white/50">Disponibilité gérée automatiquement.</p></div>}

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <label><span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Arrivée</span><input type="date" value={start} onChange={e=>setStart(e.target.value)} className="h-12 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-slate-900"/></label>
                <label><span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Départ</span><input type="date" value={end} onChange={e=>setEnd(e.target.value)} className="h-12 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-slate-900"/></label>
              </div>
              <label className="mt-3 block"><span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Voyageurs</span><input type="number" min={1} value={guests} onChange={e=>setGuests(Number(e.target.value)||1)} className="h-12 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-slate-900"/></label>

              <button type="button" onClick={()=>setBooking(true)} disabled={!start||!end} className="mt-5 flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-5 py-4 text-sm font-extrabold text-white shadow-lg shadow-emerald-500/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45"><MessageCircle size={18}/> Réserver via WhatsApp</button>
              {offer.googleMapsUrl && <a href={offer.googleMapsUrl} target="_blank" rel="noreferrer" className="mt-3 flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 transition hover:bg-slate-50"><ExternalLink size={14}/> Voir la localisation</a>}
              <div className="mt-5 flex gap-2 rounded-xl bg-slate-50 p-3 text-[11px] leading-5 text-slate-500"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600"/> Votre demande est transmise à l&apos;administrateur. La confirmation finale est effectuée après vérification.</div>
            </div>
          </div>
        </div>
      </div>
      {booking&&<BookingModal offer={offer} startDate={start} endDate={end} guests={guests} onClose={()=>setBooking(false)}/>}
    </main>
  );
}