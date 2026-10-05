'use client';
import { useEffect, useState, ReactNode } from 'react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Pagination, PaginationContent, PaginationItem } from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { Image as ImageIcon } from 'lucide-react';
export type Item = Record<string, unknown>;
export type Actions = {
    open: (type: string, item?: Item) => void;
    go: (view: string) => void;
    perform: (path: string, method?: string, body?: Record<string, unknown>) => Promise<Item | null>;
    user: Item | null;
    location: string;
    revision: number;
    categories: Item[];
    refresh: () => void;
    searchQuery: string;
    setSearchQuery: (q: string) => void;
    searchCategory: string;
    setSearchCategory: (c: string) => void;
    /** Set by the admin panel: records are shown without member actions (contact, offer, report, review). */
    readOnly?: boolean;
};
let apiBase = '/api/market/';
/** The admin panel points the shared screens at its own, separately authenticated API. */
export const setApiBase = (base: string) => { apiBase = base; };
export const money = (n: number) => 'Rs. ' + Number(n).toLocaleString('en-PK');
export const date = (s: string) => s ? new Date(s).toLocaleDateString('en-PK') : '';
export async function api(path: string, method = 'GET', body?: Record<string, unknown>) { const r = await fetch(apiBase + path, { method, headers: body ? { 'Content-Type': 'application/json' } : undefined, ...(body ? { body: JSON.stringify(body) } : {}) }); const d: {error?: string} & Record<string, unknown> = await r.json(); if (!r.ok)
    throw Object.assign(new Error(d.error || 'Unable to complete this action.'), { status: r.status }); return d; }
export function useLoad(path: string | null, revision = 0) {
    const [retry,setRetry]=useState(0);
    const key=JSON.stringify([path,revision,retry]);
    const [result,setResult]=useState<{key:string;path:string|null;data:Item|null;error:string}>({key:'',path:null,data:null,error:''});
    useEffect(()=>{if(!path)return;let live=true;api(path).then(data=>{if(live)setResult({key,path,data,error:''})}).catch((e:unknown)=>{if(live)setResult({key,path,data:null,error:e instanceof Error?e.message:'Unable to load this section.'})});return()=>{live=false}},[path,key]);
    return {data:path&&result.path===path?result.data:null,error:result.key===key?result.error:'',loading:!!path&&result.key!==key,retry:()=>setRetry(v=>v+1)};
}
export function Load({ state, children }: {
    state: ReturnType<typeof useLoad>;
    children: ReactNode;
}) { if (state.loading)
    return <div className="loading" role="status" aria-label="Loading"><Skeleton className="h-12 w-full"/><Skeleton className="h-36 w-full"/></div>; if (state.error)
    return <div className="error" role="alert">{state.error} <button onClick={state.retry}>Retry</button></div>; return <>{children}</>; }
export function Choice({ value, onChange, options, label }: {
    value: string;
    onChange: (v: string) => void;
    options: (string | {
        value: string;
        label: string;
    })[];
    label: string;
}) { return <Select value={value} onValueChange={onChange}><SelectTrigger aria-label={label}><SelectValue placeholder={label}/></SelectTrigger><SelectContent>{options.map(o => { const v = typeof o === 'string' ? o : o.value, t = typeof o === 'string' ? o : o.label; return <SelectItem key={v} value={v}>{t}</SelectItem>; })}</SelectContent></Select>; }
export function Pager({ page, total, size = 12, onChange }: {
    page: number;
    total: number;
    size?: number;
    onChange: (p: number) => void;
}) { const pages = Math.ceil(total / size); if (pages <= 1)
    return null; return <Pagination className="pager"><PaginationContent><PaginationItem><button className="btn" disabled={page <= 1} onClick={() => onChange(page - 1)}>Previous</button></PaginationItem><PaginationItem><span aria-live="polite">Page {page} of {pages}</span></PaginationItem><PaginationItem><button className="btn" disabled={page >= pages} onClick={() => onChange(page + 1)}>Next</button></PaginationItem></PaginationContent></Pagination>; }
export function Empty({ title, text, children }: {
    title: string;
    text?: string;
    children?: ReactNode;
}) { return <div className="empty"><h3>{title}</h3>{text && <p>{text}</p>}{children}</div>; }
export function Photo({ src, alt, className = '' }: {
    src?: string;
    alt: string;
    className?: string;
}) { const [failedSource, setFailedSource] = useState<string>(); return src && failedSource!==src ? <img className={className} src={src} alt={alt} loading="lazy" onError={() => setFailedSource(src)}/> : <div role="img" aria-label={alt||'No photo'} className={'photo-placeholder ' + className}><ImageIcon /><span>No photo</span></div>; }
export function Status({ children }: {
    children: ReactNode;
}) { return <span className="status">{children}</span>; }
