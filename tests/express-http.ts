import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import type {Pool} from 'pg';
import {createServer} from 'node:http';
import type {AddressInfo} from 'node:net';
import {createApp} from '../server/app';
import {PgDatabase} from '../server/database';
import {migrate} from '../server/migrate';
const pg=new PGlite();
const adapter={query:async(sql:string,args:unknown[]=[])=>{const result=await pg.query(sql,args);return {rows:result.rows,rowCount:result.affectedRows}},connect:async()=>({...adapter,release(){}})};
const pool=adapter as unknown as Pool;
await migrate(pool);
// A stand-in for the email service: it records what the app would have sent.
type Sent={auth:string;mail:{from:string;to:string[];subject:string;text:string;html:string}};
const outbox:Sent[]=[];
const mailServer=createServer((req,res)=>{let raw='';req.on('data',d=>raw+=d);req.on('end',()=>{outbox.push({auth:String(req.headers.authorization),mail:JSON.parse(raw)});res.setHeader('Content-Type','application/json');res.end('{"id":"test"}')})}).listen(0,'127.0.0.1');
await new Promise<void>(r=>mailServer.once('listening',r));
const config={resendKey:'re_test_key',emailFrom:'Picking Price <notify@example.test>',emailEndpoint:'http://127.0.0.1:'+(mailServer.address() as AddressInfo).port+'/emails',origin:'http://127.0.0.1',uploadsDir:await mkdtemp(join(tmpdir(),'picking-http-')),publicDir:resolve('server/public'),googleClientId:'test-client',googleClientSecret:'test-secret',googleSiteVerification:'test-verify_Code-123"><x',adminSetupCode:'test-setup-code-0123456789'};
const server=createApp(new PgDatabase(pool),config).listen(0,'127.0.0.1');
await new Promise<void>(r=>server.once('listening',r));
const address=server.address();if(!address||typeof address==='string')throw Error('Server address missing');
config.origin='http://127.0.0.1:'+address.port;
let checks=0;
const equal=(a:unknown,b:unknown)=>{assert.deepEqual(a,b);checks++};
const send=(path:string,body:unknown,cookie='',origin=config.origin)=>fetch(config.origin+path,{method:'POST',headers:{Origin:origin,Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify(body)});
try{
 const signup={email:'http@example.test',name:'HTTP Member',password:'safe-http-password-123',role:'both'};
 let r=await send('/api/auth/signup',signup);equal(r.status,200);const cookie=r.headers.get('set-cookie')!.split(';')[0];
 r=await fetch(config.origin+'/api/market/bootstrap',{headers:{Cookie:cookie}});equal(r.status,200);
 r=await send('/api/auth/login',{email:signup.email,password:'incorrect-password-123'});equal(r.status,401);
 r=await send('/api/auth/signup',{...signup,email:'other@example.test'},'','https://wrong.example');equal(r.status,403);
 r=await fetch(config.origin+'/api/market/listings',{method:'POST',headers:{Origin:config.origin,'Content-Type':'application/json',Cookie:cookie},body:'{'});equal(r.status,400);
 r=await send('/api/market/listings',null,cookie);equal(r.status,400);
 const listing={title:'HTTP listing',description:'A product created through real HTTP.',category:'Books',price:200,quantity:1,condition:'Good',location:'Peshawar',images:['https://example.test/photo.jpg']};
 r=await send('/api/market/listings',listing,cookie);equal(r.status,200);const created=await r.json() as {id:string};
 r=await fetch(config.origin+'/api/market/listings/'+created.id);equal(r.status,200);equal((await r.json() as {delivery:string[]}).delivery,[]);
 // Delivery and pickup options are saved with the listing and returned as a list.
 const patch=(body:unknown)=>fetch(config.origin+'/api/market/listings/'+created.id,{method:'PATCH',headers:{Origin:config.origin,'Content-Type':'application/json',Cookie:cookie},body:JSON.stringify(body)});
 r=await patch({...listing,delivery:['Drone drop']});equal(r.status,400);
 r=await patch({...listing,delivery:['In-Store Pickup','Nationwide Delivery','In-Store Pickup']});equal(r.status,200);
 r=await fetch(config.origin+'/api/market/listings/'+created.id);equal((await r.json() as {delivery:string[]}).delivery,['In-Store Pickup','Nationwide Delivery']);
 r=await fetch(config.origin+'/api/market/listings');equal(((await r.json()) as {items:{id:string;delivery:string[]}[]}).items.find(i=>i.id===created.id)!.delivery,['In-Store Pickup','Nationwide Delivery']);
 r=await fetch(config.origin+'/api/market/admin/users',{headers:{Cookie:cookie}});equal(r.status,403);
 // Request drafts (Post a Request > Save Draft for Later): saved per member, updated in place, deleted on request.
 const read=(path:string,c='')=>fetch(config.origin+path,{headers:{Cookie:c}});
 const del=(path:string,c=cookie)=>fetch(config.origin+path,{method:'DELETE',headers:{Origin:config.origin,Cookie:c}});
 r=await send('/api/market/drafts',{data:{}},cookie);equal(r.status,400);
 r=await send('/api/market/drafts',{data:{title:'HTTP draft',budget:'1500',quantity:2,domain:'Books',images:['/api/files/not-mine']}},cookie);equal(r.status,400);
 r=await send('/api/market/drafts',{data:{title:'HTTP draft',budget:'1,500 Rs',quantity:2,domain:'Books'}},cookie);equal(r.status,200);const draft=await r.json() as {id:string};
 r=await read('/api/market/drafts',cookie);const drafts=await r.json() as {total:number;items:{id:string;title:string;data:{budget:string;quantity:number;negotiable:boolean}}[]};equal(drafts.total,1);equal(drafts.items[0].title,'HTTP draft');equal(drafts.items[0].data.budget,'1500');equal(drafts.items[0].data.quantity,2);equal(drafts.items[0].data.negotiable,true);
 r=await send('/api/market/drafts',{id:draft.id,data:{title:'HTTP draft, edited',notes:'Any colour.'}},cookie);equal(r.status,200);equal((await r.json() as {id:string}).id,draft.id);
 r=await read('/api/market/drafts',cookie);equal(((await r.json()) as {items:{title:string}[]}).items.map(i=>i.title),['HTTP draft, edited']);
 r=await read('/api/market/drafts');equal(r.status,401);
 r=await send('/api/market/drafts',{id:'no-such-draft',data:{title:'x'}},cookie);equal(r.status,404);
 r=await del('/api/market/drafts/'+draft.id);equal(r.status,200);r=await read('/api/market/drafts',cookie);equal(((await r.json()) as {total:number}).total,0);
 // A draft also keeps where the item is needed and until when the request should stay open.
 r=await send('/api/market/drafts',{data:{title:'Dated draft',location:'  Peshawar  ',expiry:'2027-01-15'}},cookie);equal(r.status,200);const dated=await r.json() as {id:string};
 r=await read('/api/market/drafts',cookie);const datedData=((await r.json()) as {items:{data:{location:string;expiry:string}}[]}).items[0].data;equal(datedData.location,'Peshawar');equal(datedData.expiry,'2027-01-15');
 r=await send('/api/market/drafts',{id:dated.id,data:{title:'Dated draft',expiry:'next week'}},cookie);equal(r.status,200);r=await read('/api/market/drafts',cookie);equal(((await r.json()) as {items:{data:{expiry:string}}[]}).items[0].data.expiry,'');
 r=await del('/api/market/drafts/'+dated.id);equal(r.status,200);
 // Search: keyword over title, description, category and brand; location matches inside the text; at most 60 rows a page.
 type Found={total:number;size:number;items:{id:string}[]};const find=async(query:string)=>(await (await fetch(config.origin+'/api/market/listings?'+query)).json()) as Found;
 equal((await find('q=http&sort=relevance')).items.some(i=>i.id===created.id),true);equal((await find('q=no-such-product-xyz')).total,0);
 equal((await find('location=pesh')).items.some(i=>i.id===created.id),true);equal((await find('location=PESHAWAR')).items.some(i=>i.id===created.id),true);equal((await find('location=lahore')).items.some(i=>i.id===created.id),false);
 equal((await find('q=http&category=Books&condition=Good&min=100&max=300&location=peshawar')).total,1);equal((await find('q=http&min=300')).total,0);equal((await find('size=100')).size,60);
 // Every condition in the SRS can be saved and filtered on, Fair included.
 r=await patch({...listing,condition:'Fair',brand:'Oxford',delivery:['In-Store Pickup','Nationwide Delivery']});equal(r.status,200);equal((await find('condition=Fair')).items.some(i=>i.id===created.id),true);equal((await find('condition=Good')).items.some(i=>i.id===created.id),false);
 equal((await find('q=oxford')).items.some(i=>i.id===created.id),true);
 r=await patch({...listing,condition:'Worn out'});equal(r.status,400);r=await patch({...listing,delivery:['In-Store Pickup','Nationwide Delivery']});equal(r.status,200);
 // Deal switches (Allow Offers, Open to exchange): saved with the listing, off unless the seller turns them on.
 type Deal={id:string;negotiable:boolean;exchange:boolean};const deal=async()=>(await (await fetch(config.origin+'/api/market/listings/'+created.id)).json()) as Deal;
 equal([(await deal()).negotiable,(await deal()).exchange],[false,false]);
 r=await patch({...listing,negotiable:true,exchange:true,delivery:['In-Store Pickup','Nationwide Delivery']});equal(r.status,200);equal([(await deal()).negotiable,(await deal()).exchange],[true,true]);
 r=await fetch(config.origin+'/api/market/listings');const dealt=((await r.json()) as {items:Deal[]}).items.find(i=>i.id===created.id)!;equal([dealt.negotiable,dealt.exchange],[true,true]);
 r=await patch({...listing,negotiable:'yes'});equal(r.status,400);
 r=await patch({...listing,negotiable:true,delivery:['In-Store Pickup','Nationwide Delivery']});equal(r.status,200);equal([(await deal()).negotiable,(await deal()).exchange],[true,false]);
 // Footer > Report a Problem: a report about the site itself, with nothing to look up.
 r=await send('/api/market/reports',{targetType:'general',reason:'The page stopped loading on my phone.'});equal(r.status,401);
 r=await send('/api/market/reports',{targetType:'general',reason:'short'},cookie);equal(r.status,400);
 r=await send('/api/market/reports',{targetType:'something',targetId:'x',reason:'The page stopped loading on my phone.'},cookie);equal(r.status,400);
 r=await send('/api/market/reports',{targetType:'general',reason:'The page stopped loading on my phone.'},cookie);equal(r.status,200);
 r=await send('/api/market/reports',{targetType:'listing',targetId:created.id,reason:'This listing looks like a duplicate.'},cookie);equal(r.status,200);
 // Notification emails: each new notification is also emailed to its owner, once.
 const waitFor=async(test:()=>boolean)=>{for(let i=0;i<80&&!test();i++)await new Promise(r=>setTimeout(r,50));return test()};
 const mailsTo=(to:string,subject:string)=>outbox.filter(m=>m.mail.to[0]===to&&m.mail.subject===subject);
 r=await send('/api/auth/signup',{email:'mailbuyer@example.test',name:'Mail Buyer',password:'safe-http-password-123',role:'buyer'});equal(r.status,200);const mailBuyer=r.headers.get('set-cookie')!.split(';')[0];
 r=await send('/api/market/conversations',{contextType:'listing',contextId:created.id},mailBuyer);equal(r.status,200);const mailChat=await r.json() as {id:string};
 r=await send('/api/market/messages/'+mailChat.id,{body:'Is this book <still> available?'},mailBuyer);equal(r.status,200);
 equal(await waitFor(()=>mailsTo(signup.email,'New message | Picking Price').length===1),true);
 const letter=mailsTo(signup.email,'New message | Picking Price')[0];equal(letter.auth,'Bearer re_test_key');equal(letter.mail.from,'Picking Price <notify@example.test>');
 assert(letter.mail.text.includes('Hello HTTP Member')&&letter.mail.text.includes('Mail Buyer: Is this book <still> available?')&&letter.mail.text.includes('/#messages'));checks++;
 assert(letter.mail.html.includes('Is this book &lt;still&gt; available?')&&!letter.mail.html.includes('<still>'));checks++;
 // A second message straight away does not send a second email about the same chat.
 r=await send('/api/market/messages/'+mailChat.id,{body:'I can collect it today.'},mailBuyer);equal(r.status,200);
 r=await send('/api/market/profiles/'+(await (await read('/api/market/bootstrap',cookie)).json() as {user:{id:string}}).user.id+'/reviews',{rating:5,body:'Quick replies and an honest description.'},mailBuyer);equal(r.status,200);
 equal(await waitFor(()=>mailsTo(signup.email,'New review | Picking Price').length===1),true);equal(mailsTo(signup.email,'New message | Picking Price').length,1);
 // Nothing is emailed twice, and the buyer who caused the notifications gets none of them.
 r=await read('/api/market/notifications',cookie);equal(r.status,200);await new Promise(r=>setTimeout(r,300));equal(mailsTo(signup.email,'New review | Picking Price').length,1);equal(outbox.filter(m=>m.mail.to[0]==='mailbuyer@example.test').length,0);
 // The counts behind the header badges are real numbers on PostgreSQL too (it returns COUNT as text).
 r=await read('/api/market/bootstrap',cookie);const boot=await r.json() as {unread:unknown;openRequests:unknown};equal(typeof boot.unread,'number');equal(typeof boot.openRequests,'number');
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jB1kAAAAASUVORK5CYII=','base64');
 const upload=(bytes:Buffer,c=cookie)=>fetch(config.origin+'/api/files',{method:'POST',headers:{Origin:config.origin,Cookie:c,'Content-Type':'image/png'},body:new Uint8Array(bytes).buffer});
 r=await upload(png,'');equal(r.status,401);r=await upload(Buffer.from('<svg onload="alert(1)"></svg>'));equal(r.status,400);
 r=await upload(png);equal(r.status,200);const image=await r.json() as {url:string};r=await fetch(config.origin+image.url);equal(Buffer.from(await r.arrayBuffer()),png);
 r=await fetch(config.origin+'/api/auth/google',{redirect:'manual'});equal(r.status,302);const url=new URL(r.headers.get('location')!);equal(url.hostname,'accounts.google.com');equal(url.searchParams.get('code_challenge_method'),'S256');
 r=await fetch(config.origin+'/api/auth/google/callback?code=bad&state=wrong',{redirect:'manual'});equal(r.status,302);assert(r.headers.get('location')!.includes('invalid_state'));checks++;
 // Admin panel: one administrator, separate from member accounts and sessions.
 const get=(path:string,c='')=>fetch(config.origin+path,{headers:{Cookie:c}});
 const boss='boss@example.test',first='admin-password-123',second='admin-password-789';
 r=await get('/api/admin/session');equal(await r.json(),{configured:false,setupAvailable:true,signedIn:false,email:''});
 r=await send('/api/admin/setup',{code:'wrong-setup-code-0000000000',email:boss,password:first});equal(r.status,403);
 r=await send('/api/admin/setup',{code:config.adminSetupCode,email:boss,password:'short'});equal(r.status,400);
 r=await send('/api/admin/setup',{code:config.adminSetupCode,email:boss,password:first});equal(r.status,200);const admin=r.headers.get('set-cookie')!.split(';')[0];
 r=await send('/api/admin/setup',{code:config.adminSetupCode,email:'second@example.test',password:second});equal(r.status,409);
 r=await get('/api/admin/session',admin);equal(await r.json(),{configured:true,setupAvailable:false,signedIn:true,email:boss});
 r=await get('/api/admin/market/admin/stats',admin);equal(r.status,200);
 r=await get('/api/admin/market/admin/stats');equal(r.status,401);
 r=await get('/api/admin/market/admin/stats',cookie);equal(r.status,401);
 r=await get('/api/market/admin/stats',admin);equal(r.status,401);
 await pg.query("UPDATE accounts SET role='admin' WHERE email=$1",[signup.email]);
 r=await get('/api/market/admin/users',cookie);equal(r.status,403);
 r=await get('/api/admin/market/listings/'+created.id,admin);equal(r.status,200);
 r=await send('/api/admin/market/listings',listing,admin);equal(r.status,404);
 r=await get('/api/admin/market/admin/users',admin);equal((await r.json() as {items:{id:string}[]}).items.some(u=>u.id==='admin'),false);
 // Categories: add, refuse a duplicate name, delete an unused one, refuse to delete one a product still uses.
 const cats=async()=>((await (await get('/api/admin/market/admin/settings',admin)).json()) as {categories:{id:string;name:string}[]}).categories;
 r=await send('/api/admin/market/admin/categories',{name:'HTTP Gadgets',subcategories:['Drones'],active:true},admin);equal(r.status,200);
 r=await send('/api/admin/market/admin/categories',{name:'http gadgets',subcategories:[],active:true},admin);equal(r.status,409);
 const gadget=(await cats()).find(c=>c.name==='HTTP Gadgets')!;
 r=await fetch(config.origin+'/api/admin/market/admin/categories/'+gadget.id,{method:'DELETE',headers:{Origin:config.origin,Cookie:cookie}});equal(r.status,401);
 r=await fetch(config.origin+'/api/admin/market/admin/categories/'+gadget.id,{method:'DELETE',headers:{Origin:config.origin,Cookie:admin}});equal(r.status,200);equal((await cats()).some(c=>c.name==='HTTP Gadgets'),false);
 const books=(await cats()).find(c=>c.name==='Books')!;
 r=await fetch(config.origin+'/api/admin/market/admin/categories/'+books.id,{method:'DELETE',headers:{Origin:config.origin,Cookie:admin}});equal(r.status,409);assert(/still used by/.test(((await r.json()) as {error:string}).error));checks++;equal((await cats()).some(c=>c.name==='Books'),true);
 r=await fetch(config.origin+'/api/admin/market/admin/categories/no-such-category',{method:'DELETE',headers:{Origin:config.origin,Cookie:admin}});equal(r.status,404);
 r=await send('/api/admin/login',{email:boss,password:'incorrect-password-123'});equal(r.status,401);
 r=await send('/api/admin/login',{email:signup.email,password:signup.password});equal(r.status,401);
 r=await send('/api/admin/password',{current:'incorrect-password-123',next:second},admin);equal(r.status,403);
 r=await send('/api/admin/login',{email:boss,password:first});equal(r.status,200);const elsewhere=r.headers.get('set-cookie')!.split(';')[0];
 r=await send('/api/admin/password',{current:first,next:second},admin);equal(r.status,200);
 r=await get('/api/admin/market/admin/stats',elsewhere);equal(r.status,401);
 r=await get('/api/admin/market/admin/stats',admin);equal(r.status,200);
 r=await send('/api/admin/logout',{},admin);equal(r.status,200);r=await get('/api/admin/market/admin/stats',admin);equal(r.status,401);
 r=await send('/api/admin/login',{email:boss,password:first});equal(r.status,401);
 r=await send('/api/admin/login',{email:boss,password:second});equal(r.status,200);const panel=r.headers.get('set-cookie')!.split(';')[0];
 // Password reset needs a single-use code issued by the administrator; an email address alone resets nothing.
 const member=((await (await get('/api/market/bootstrap',cookie)).json()) as {user:{id:string;email:string}}).user;equal(member.email,signup.email);
 const renewed='renewed-password-456';
 r=await send('/api/auth/reset',{email:signup.email,password:renewed});equal(r.status,400);
 r=await send('/api/market/admin/reset-code',{id:member.id},cookie);equal(r.status,403);
 r=await send('/api/admin/market/admin/reset-code',{id:'no-such-member'},panel);equal(r.status,409);
 r=await send('/api/admin/market/admin/reset-code',{id:member.id},panel);equal(r.status,200);const stale=(await r.json() as {code:string}).code;
 r=await send('/api/admin/market/admin/reset-code',{id:member.id},panel);equal(r.status,200);const issued=await r.json() as {code:string;email:string};equal(issued.email,signup.email);assert.match(issued.code,/^[A-Z2-9]{5}-[A-Z2-9]{5}$/);checks++;
 r=await send('/api/auth/reset',{email:signup.email,code:stale,password:renewed});equal(r.status,400);
 r=await send('/api/auth/reset',{email:'other@example.test',code:issued.code,password:renewed});equal(r.status,400);
 r=await send('/api/auth/reset',{email:signup.email,code:issued.code.toLowerCase().replace('-',' '),password:renewed});equal(r.status,200);const fresh=r.headers.get('set-cookie')!.split(';')[0];
 r=await get('/api/market/me',cookie);equal(r.status,401);r=await get('/api/market/me',fresh);equal(r.status,200);
 r=await send('/api/auth/reset',{email:signup.email,code:issued.code,password:'another-password-789'});equal(r.status,400);
 r=await send('/api/auth/login',{email:signup.email,password:signup.password});equal(r.status,401);
 r=await send('/api/auth/login',{email:signup.email,password:renewed});equal(r.status,200);
 r=await get('/admin');equal(r.status,200);r=await get('/login');equal(r.status,200);
 r=await send('/api/auth/logout',{},cookie);equal(r.status,200);r=await fetch(config.origin+'/api/market/me',{headers:{Cookie:cookie}});equal(r.status,401);
 r=await fetch(config.origin);equal(r.status,200);const home=await r.text();assert(home.includes('Picking Price'));checks++;
 assert(home.includes('<meta name="google-site-verification" content="test-verify_Code-123x"/></head>'));checks++;
 r=await get('/privacy');equal(r.status,200);const privacy=await r.text();assert(privacy.includes('<title>Privacy Policy — Picking Price</title>')&&privacy.includes('Information from your Google account')&&privacy.includes('We do not sell your personal information')&&privacy.includes('google-site-verification'));checks++;
 r=await get('/terms/');equal(r.status,200);const terms=await r.text();assert(terms.includes('<h1>Terms of Service</h1>')&&terms.includes('governed by the laws of Pakistan')&&!terms.includes('<div id="root"></div>'));checks++;
 console.log(checks+' Express HTTP assertions passed with embedded PostgreSQL.');
}finally{await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));mailServer.close();await pg.close();}
