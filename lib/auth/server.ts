import { env } from 'cloudflare:workers';
import { cookies } from 'next/headers';
import { createHash, randomBytes } from 'node:crypto';
import { getChatGPTUser } from '@/app/chatgpt-auth';
export const sessionCookie = '__Host-pp_session';
export const origin = 'https://picking-price.ahsanjaved-it.chatgpt.site';
export type AccountUser = {userId:string; displayName:string; email:string; provider:'email'|'google'|'workspace'; role:string};
export const bindings = () => env as unknown as { DB:D1Database; GOOGLE_CLIENT_ID?:string; GOOGLE_CLIENT_SECRET?:string; OWNER_EMAIL?:string; RESEND_API_KEY?:string; EMAIL_FROM?:string };
export const database = () => bindings().DB;
export const digest = (value:string) => createHash('sha256').update(value).digest('hex');
export const randomToken = () => randomBytes(32).toString('base64url');
export const secureCookie = (name:string, value:string, maxAge:number) => `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
export const googleReady = () => !!(bindings().GOOGLE_CLIENT_ID && bindings().GOOGLE_CLIENT_SECRET);
export async function getMarketUser():Promise<AccountUser|null> {
  const jar = await cookies();
  const token = jar.get(sessionCookie)?.value;
  if(token){
    const row = await database().prepare('SELECT a.id,a.email,a.name,a.google_sub,a.role FROM sessions s JOIN accounts a ON a.id=s.account_id WHERE s.token_hash=? AND s.expires>?').bind(digest(token),new Date().toISOString()).first<{id:string;email:string;name:string;google_sub:string|null;role:string}>();
    // Marketplace sign-ins never carry administrator rights; those exist only in the separate /admin panel.
    if(row)return {userId:row.id,displayName:row.name,email:row.email,provider:row.google_sub?'google':'email',role:row.role==='admin'?'both':row.role};
    return null;
  }
  // Explicit application sign-out suppresses the underlying workspace identity.
  if(jar.get('__Host-pp_signed_out')?.value === '1')return null;
  const workspace = await getChatGPTUser();
  return workspace ? {...workspace,provider:'workspace',role:'both'} : null;
}
export async function sessionResponse(accountId:string, redirect=false) {
  const profile = await database().prepare('SELECT suspended FROM profiles WHERE id=?').bind(accountId).first<{suspended:number}>();
  if(profile?.suspended)throw new AuthError('Your account is suspended.',403);
  const token=randomToken();
  await database().prepare('INSERT INTO sessions (token_hash,account_id,expires) VALUES (?,?,?)').bind(digest(token),accountId,new Date(Date.now()+7*86400000).toISOString()).run();
  const headers = new Headers({'Cache-Control':'no-store'});
  headers.append('Set-Cookie',secureCookie(sessionCookie,token,7*86400));
  headers.append('Set-Cookie',secureCookie('__Host-pp_signed_out','',0));
  if(redirect){headers.set('Location',origin+'/?welcome=1');return new Response(null,{status:303,headers});}
  headers.set('Content-Type','application/json');return new Response(JSON.stringify({ok:true}),{headers});
}
export function checkOrigin(req:Request) {
  if(req.headers.get('origin')!==new URL(req.url).origin)throw new AuthError('This request could not be verified. Refresh and try again.',403);
}
export class AuthError extends Error { constructor(message:string,public status=400){super(message);} }
export function authError(e:unknown) {
  if(e instanceof AuthError)return Response.json({error:e.message},{status:e.status,headers:{'Cache-Control':'no-store'}});
  console.error('Account operation failed',e instanceof Error?e.name:'Unknown error');
  return Response.json({error:'Account services are temporarily unavailable. Please try again.'},{status:503,headers:{'Cache-Control':'no-store'}});
}
export async function jsonBody(req:Request):Promise<Record<string,unknown>> {
  const body=await req.text();if(body.length>5000)throw new AuthError('The form is too long.');
  try{const v=JSON.parse(body);if(!v||typeof v!=='object'||Array.isArray(v))throw Error();return v;}catch{throw new AuthError('Invalid form.');}
}
export function parseCredentials(body:Record<string,unknown>) {
  const email=typeof body.email==='string'?body.email.trim().toLowerCase():'';
  const password=typeof body.password==='string'?body.password:'';
  if(email.length>254||(!/^\S+@\S+\.\S+$/.test(email) && !/^\+?\d{7,15}$/.test(email.replace(/[\s-]/g,''))))throw new AuthError('Enter a valid email address or phone number.');
  if(password.length<8||password.length>128)throw new AuthError('Use a password between 8 and 128 characters.');
  return {email,password};
}
export async function throttle(req:Request,email:string) {
  const until = new Date(Date.now()+15*60000).toISOString();
  const now = new Date().toISOString();
  const ip=req.headers.get('cf-connecting-ip')||'private-site';
  const keys=[digest('ip:'+ip),digest('email:'+email)];
  const statements=keys.map(key=>database().prepare("INSERT INTO auth_attempts (key,count,expires) VALUES (?,'1',?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN auth_attempts.expires<? THEN '1' ELSE CAST(auth_attempts.count AS INTEGER)+1 END, expires=CASE WHEN auth_attempts.expires<? THEN excluded.expires ELSE auth_attempts.expires END RETURNING count").bind(key,until,now,now));
  const results=await database().batch(statements);
  if(results.some((r: {results?: {count: string}[]}, i: number) => Number(r.results?.[0]?.count) > (i === 0 ? 30 : 8))) throw new AuthError('Too many attempts. Please try again in 15 minutes.', 429);
}
