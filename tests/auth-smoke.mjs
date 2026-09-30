import {createRequire} from 'node:module';
import {readFile,readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
const require=createRequire(import.meta.url);
const wranglerRequire=createRequire(require.resolve('wrangler/package.json'));
const {Miniflare}=wranglerRequire('miniflare');
const files=(await readdir('dist/server',{recursive:true})).filter(f=>f.endsWith('.js')||f.endsWith('.mjs'));files.sort((a,b)=>a==='index.js'?-1:b==='index.js'?1:a.localeCompare(b));
const mf=new Miniflare({modules:files.map(f=>({type:'ESModule',path:resolve('dist/server',f)})),modulesRoot:resolve('dist/server'),compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],r2Buckets:['BUCKET'],cf:false});
const origin='https://picking-price.ahsanjaved-it.chatgpt.site';
const cookieFrom=r=>r.headers.getSetCookie().find(s=>s.startsWith('__Host-pp_session=')).split(';')[0];
async function call(path,data,cookie='',customOrigin=origin){return mf.dispatchFetch(origin+path,{method:data===undefined?'GET':'POST',headers:{Origin:customOrigin,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},...(data===undefined?{}:{body:JSON.stringify(data)})});}
const ok=(message)=>console.log('PASS '+message);
try{
 const db=await mf.getD1Database('DB');
 for(const file of (await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort()){
  const sql=await readFile('drizzle/'+file,'utf8');for(const statement of sql.split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean))await db.prepare(statement).run();
 }
 const email='test-'+randomBytes(5).toString('hex')+'@example.test',password='safe-test-password-'+randomBytes(12).toString('hex');
 const data={name:'Test Buyer',email,password,role:'buyer'};
 let r=await call('/api/auth/options');assert.deepEqual(await r.json(),{google:false,email:true,recovery:false,workspace:true});ok('auth options expose configured capabilities');
 r=await call('/api/auth/signup',data);assert.equal(r.status,200,await r.clone().text());const cookie=cookieFrom(r);ok('email registration');
 assert(r.headers.get('Set-Cookie').includes('HttpOnly'));assert(r.headers.get('Set-Cookie').includes('Secure'));ok('secure cookie attributes');
 r=await call('/api/market',undefined,cookie);assert.equal(r.status,200,await r.clone().text());assert.equal((await r.json()).user.name,'Test Buyer');ok('session identity');
 r=await call('/api/auth/signup',data);assert.equal(r.status,409);ok('duplicate registration rejected');
 r=await call('/api/auth/login',{email,password:'incorrect-password-long'});assert.equal(r.status,401);ok('incorrect password rejected');
 r=await call('/api/auth/login',{email,password});assert.equal(r.status,200,await r.clone().text());const cookie2=cookieFrom(r);ok('password login');
 r=await call('/api/market',undefined,cookie2);assert.equal((await r.json()).user.id,(await db.prepare('SELECT id FROM accounts WHERE email=?').bind(email).first()).id);ok('authenticated marketplace bootstrap');
 r=await call('/api/auth/signup',{...data,email:'other-'+email,name:'Another Buyer'});assert.equal(r.status,200);const otherCookie=cookieFrom(r);
 r=await call('/api/market',undefined,otherCookie);assert.equal(r.status,200);assert.notEqual((await r.json()).user.id,(await db.prepare('SELECT id FROM accounts WHERE email=?').bind(email).first()).id);ok('separate account isolation');
 r=await call('/api/auth/signup',data,'','https://bad.example');assert.equal(r.status,403);ok('cross-origin request rejected');
 // Uploaded content is validated and round-trips through R2, not just SQL.
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jB1kAAAAASUVORK5CYII=','base64');
 const upload=(body,c=cookie2)=>mf.dispatchFetch(origin+'/api/files',{method:'POST',headers:{Origin:origin,Cookie:c,'Content-Type':'image/png'},body});
 r=await upload(png,'');assert.equal(r.status,401);ok('anonymous upload rejected');
 r=await upload(Buffer.from('<svg onload="alert(1)"></svg>'));assert.equal(r.status,400);ok('active-content upload rejected');
 r=await upload(Buffer.alloc(5*1024*1024+1));assert.equal(r.status,413);ok('oversized photo rejected');
 r=await upload(png);assert.equal(r.status,200,await r.clone().text());const media=await r.json();
 r=await call(media.url);assert.equal(r.status,200);assert.equal(r.headers.get('content-type'),'image/png');assert.equal(r.headers.get('x-content-type-options'),'nosniff');assert.deepEqual(Buffer.from(await r.arrayBuffer()),png);ok('R2 photo persistence and retrieval');
 r=await call('/api/market/listings',null,cookie2);assert.equal(r.status,400);ok('null JSON form rejected');
 r=await mf.dispatchFetch(origin+'/api/market/listings',{method:'POST',headers:{Origin:origin,Cookie:cookie2,'Content-Type':'application/json'},body:'{'});assert.equal(r.status,400);ok('malformed JSON rejected');
 const accountId=(await db.prepare('SELECT id FROM accounts WHERE email=?').bind(email).first()).id;
 await db.prepare('UPDATE profiles SET suspended=1 WHERE id=?').bind(accountId).run();
 r=await call('/api/auth/login',{email,password});assert.equal(r.status,403);ok('suspended account cannot sign in');
 await db.prepare('UPDATE profiles SET suspended=0 WHERE id=?').bind(accountId).run();
 const google=await mf.dispatchFetch(origin+'/api/auth/google',{redirect:'manual'});assert.equal(google.status,303);assert(google.headers.get('location').includes('google_not_configured'));ok('unconfigured Google returns safe error');
 r=await call('/api/auth/logout',{},cookie2);assert.equal(r.status,200);ok('logout');
 r=await call('/api/market',undefined,cookie2);assert.equal((await r.json()).user,null);ok('revoked session rejected');
 r=await call('/api/auth/signup',{name:'Test',email:'bad',password});assert.equal(r.status,400);ok('invalid input rejected');
 for(let i=0;i<9;i++)r=await call('/api/auth/login',{email,password:'wrong-password-long'});assert.equal(r.status,429);ok('attempt limit enforced');
 const account=await db.prepare('SELECT password_hash FROM accounts WHERE email=?').bind(email).first();assert(account.password_hash.startsWith('scrypt$'));assert(!account.password_hash.includes(password));ok('only hashed passwords stored');
}finally{await mf.dispose();}
