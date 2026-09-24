import type { MetadataRoute } from 'next';
import { API_ORIGIN } from '@/lib/api';
import { SITE_URL } from '@/lib/seo';
import { locales } from '@/i18n/config';

async function json(path:string){
  try { const r=await fetch(`${API_ORIGIN}/api/v1${path}`,{next:{revalidate:300}}); return r.ok ? (await r.json()).data : []; } catch { return []; }
}
export default async function sitemap():Promise<MetadataRoute.Sitemap>{
 const now=new Date();
 const rows:MetadataRoute.Sitemap=[];
 for(const locale of locales){
   rows.push({url:`${SITE_URL}/${locale}`,lastModified:now,changeFrequency:'daily',priority:1});
   rows.push({url:`${SITE_URL}/${locale}/search`,lastModified:now,changeFrequency:'daily',priority:.8});
   const categories=await json(`/categories?locale=${locale}`);
   const offers=await json(`/offers?status=PUBLISHED&locale=${locale}`);
   for(const c of categories.filter((x:any)=>x.isActive)) rows.push({url:`${SITE_URL}/${locale}/categories/${c.slug}`,lastModified:now,changeFrequency:'weekly',priority:.7});
   for(const o of offers) rows.push({url:`${SITE_URL}/${locale}/offers/${o.slug}`,lastModified:new Date(o.updatedAt||now),changeFrequency:'weekly',priority:.8});
 }
 return rows;
}
