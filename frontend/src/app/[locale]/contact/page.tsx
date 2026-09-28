"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { useLocale } from "@/i18n/translate";
import { SiteSettingsApi, ContactSettings } from "@/lib/site-settings.api";
import { PublicHeader } from "@/components/public/PublicHeader";

const empty: ContactSettings = { whatsappNumero: "", telephone: "", email: "", adresse: "", facebook: "", instagram: "" };

export default function ContactPage() {
  const locale = useLocale();
  const [contact, setContact] = useState(empty);
  useEffect(() => { void SiteSettingsApi.contact().then(setContact).catch(() => undefined); }, []);
  const whatsapp = contact.whatsappNumero ? `https://wa.me/${contact.whatsappNumero.replace(/\D/g, "")}` : "#";
  return (
    <main className="public-shell min-h-screen bg-[var(--canvas)]">
      <PublicHeader />
      <div className="public-container pt-32 pb-20">
        <Link href={`/${locale}`} className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-deep)]"><ArrowLeft size={16} /> Retour à l’accueil</Link>
        <div className="grid gap-8 lg:grid-cols-[1fr_.8fr] lg:items-start">
          <div><p className="text-xs font-bold uppercase tracking-[.2em] text-[var(--accent-deep)]">Contact</p><h1 className="mt-3 max-w-2xl font-display text-5xl leading-tight text-[var(--ink)]">Parlons de votre prochaine escapade.</h1><p className="mt-5 max-w-xl text-base leading-7 text-[var(--ink-soft)]">Une question sur une offre, une disponibilité ou un séjour sur mesure ? Notre équipe vous répond directement et vous accompagne jusqu’à la confirmation.</p><a href={whatsapp} target="_blank" rel="noreferrer" className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-[#25D366] px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition hover:-translate-y-0.5"><MessageCircle size={18} /> Écrire sur WhatsApp</a></div>
          <div className="card grid gap-3 p-5 sm:p-7">
            <ContactItem icon={MessageCircle} label="WhatsApp" value={contact.whatsappNumero || "Numéro non renseigné"} href={whatsapp} />
            <ContactItem icon={Phone} label="Téléphone" value={contact.telephone || "Numéro non renseigné"} href={contact.telephone ? `tel:${contact.telephone}` : undefined} />
            <ContactItem icon={Mail} label="E-mail" value={contact.email || "Adresse non renseignée"} href={contact.email ? `mailto:${contact.email}` : undefined} />
            <ContactItem icon={MapPin} label="Adresse" value={contact.adresse || "Adresse non renseignée"} />
          </div>
        </div>
        <div className="mt-16 rounded-[28px] border border-[var(--line)] bg-white p-7 sm:p-10"><h2 className="font-display text-2xl text-[var(--ink)]">Comment réserver ?</h2><div className="mt-6 grid gap-5 sm:grid-cols-3">{['Choisissez une offre', 'Remplissez vos coordonnées', 'Confirmez dans WhatsApp'].map((step, index) => <div key={step} className="flex gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent-tint)] text-sm font-bold text-[var(--accent-deep)]">{index + 1}</span><p className="pt-1 text-sm font-semibold text-[var(--ink)]">{step}</p></div>)}</div></div>
      </div>
    </main>
  );
}

function ContactItem({ icon: Icon, label, value, href }: { icon: typeof Mail; label: string; value: string; href?: string }) {
  const content = <><span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent-tint)] text-[var(--accent-deep)]"><Icon size={17} /></span><span><span className="block text-xs text-[var(--ink-soft)]">{label}</span><span className="mt-0.5 block break-words text-sm font-semibold text-[var(--ink)]">{value}</span></span></>;
  return href && href !== "#" ? <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel={href.startsWith("http") ? "noreferrer" : undefined} className="flex items-center gap-3 rounded-2xl p-3 transition hover:bg-[var(--canvas)]">{content}</a> : <div className="flex items-center gap-3 rounded-2xl p-3">{content}</div>;
}
