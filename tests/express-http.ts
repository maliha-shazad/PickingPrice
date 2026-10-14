import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import type {Pool} from 'pg';
import {createServer} from 'node:http';
import type {AddressInfo} from 'node:net';
import {createApp} from '../server/app';
import {sendMail} from '../lib/market/email';
import {PgDatabase} from '../server/database';
import {migrate} from '../server/migrate';
const pg=new PGlite();
const adapter={query:async(sql:string,args:unknown[]=[])=>{const result=await pg.query(sql,args);return {rows:result.rows,rowCount:result.affectedRows}},connect:async()=>({...adapter,release(){}})};
const pool=adapter as unknown as Pool;
await migrate(pool);
// A stand-in for the outside services: Resend, and Google's token, profile, Gmail and revoke addresses. It records what the app would have sent.
type Sent={auth:string;mail:{from:string;to:string[];name?:string;subject:string;text:string;html:string}};
const outbox:Sent[]=[],tokenCalls:Record<string,string>[]=[],revoked:string[]=[];
const google={issued:0,expired:false,withdrawn:''};
const sendScope='https://www.googleapis.com/auth/gmail.send';
// Reads a Gmail "raw" message back into its parts, undoing the header and body encodings.
const words=(v:string)=>v.replace(/(\?=)\s+(=\?UTF-8\?B\?)/g,'$1$2').replace(/=\?UTF-8\?B\?([^?]*)\?=/g,(_,b:string)=>Buffer.from(b,'base64').toString('utf8'));
function letterOf(raw:string):Sent['mail']{
 const all=Buffer.from(raw,'base64url').toString('utf8'),cut=all.indexOf('\r\n\r\n'),head=all.slice(0,cut).replace(/\r\n /g,' ');
 const field=(name:string)=>words((head.split('\r\n').find(l=>l.startsWith(name+': '))||'').slice(name.length+2));
 const boundary=/boundary="([^"]+)"/.exec(head)![1];
 const parts=all.slice(cut+4).split('--'+boundary).slice(1,3).map(p=>Buffer.from(p.slice(p.indexOf('\r\n\r\n')+4).replace(/\s/g,''),'base64').toString('utf8'));
 const to=field('To');
 return {from:field('From'),to:[/<([^>]+)>/.exec(to)![1]],name:to.slice(0,to.indexOf('<')).trim(),subject:field('Subject'),text:parts[0],html:parts[1]};
}
const mailServer=createServer((req,res)=>{let raw='';req.on('data',d=>raw+=d);req.on('end',()=>{
 const reply=(status:number,body:unknown)=>{res.statusCode=status;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(body))};
 const auth=String(req.headers.authorization||'');
 if(req.url==='/token'){const f=Object.fromEntries(new URLSearchParams(raw));tokenCalls.push(f);
  if(f.grant_type==='refresh_token')return google.expired?reply(400,{error:'invalid_grant'}):reply(200,{access_token:'access-'+(++google.issued),expires_in:3600});
  return reply(200,{access_token:'access-'+(++google.issued),refresh_token:'refresh-'+google.issued,expires_in:3600,scope:'openid https://www.googleapis.com/auth/userinfo.email'+(f.code==='no-send'?'':' '+sendScope)});}
 if(req.url==='/profile')return reply(200,{email:'PickingPrice@gmail.test',email_verified:true});
 if(req.url==='/revoke'){revoked.push(new URLSearchParams(raw).get('token')||'');return reply(200,{});}
 if(req.url==='/send'){if(auth==='Bearer '+google.withdrawn)return reply(401,{error:'invalid_credentials'});const mail=letterOf(JSON.parse(raw).raw);outbox.push({auth:'gmail '+auth,mail});return reply(mail.subject==='refuse me'?400:200,{id:'test'});}
 const b=JSON.parse(raw);outbox.push({auth,mail:b});reply(b.subject==='refuse me'?400:201,{id:'test'});
})}).listen(0,'127.0.0.1');
await new Promise<void>(r=>mailServer.once('listening',r));
const outside='http://127.0.0.1:'+(mailServer.address() as AddressInfo).port;
const config={gmailClientId:'mail-client',gmailClientSecret:'mail-secret',gmailEndpoints:{auth:outside+'/consent',token:outside+'/token',profile:outside+'/profile',send:outside+'/send',revoke:outside+'/revoke'},resendKey:'re_test_key',emailFrom:'Picking Price <notify@example.test>',emailEndpoint:outside+'/emails',origin:'http://127.0.0.1',uploadsDir:await mkdtemp(join(tmpdir(),'picking-http-')),publicDir:resolve('server/public'),googleClientId:'test-client',googleClientSecret:'test-secret',googleSiteVerification:'test-verify_Code-123"><x, second_Code-456',adminSetupCode:'test-setup-code-0123456789'};
const db=new PgDatabase(pool);
const server=createApp(db,config).listen(0,'127.0.0.1');
await new Promise<void>(r=>server.once('listening',r));
const address=server.address();if(!address||typeof address==='string')throw Error('Server address missing');
config.origin='http://127.0.0.1:'+address.port;
let checks=0;
const equal=(a:unknown,b:unknown)=>{assert.deepEqual(a,b);checks++};
const send=(path:string,body:unknown,cookie='',origin=config.origin)=>fetch(config.origin+path,{method:'POST',headers:{Origin:origin,Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify(body)});
try{
 const signup={email:'http@example.test',name:'HTTP Member',phone:'0300 1234567',password:'safe-http-password-123',role:'both',accepted:true};
 let r=await send('/api/auth/signup',signup);equal(r.status,200);const cookie=r.headers.get('set-cookie')!.split(';')[0];
 r=await fetch(config.origin+'/api/market/bootstrap',{headers:{Cookie:cookie}});equal(r.status,200);
 // The mobile number is required at sign-up and lands in the profile in one format.
 r=await send('/api/auth/signup',{...signup,email:'nophone@example.test',phone:''});equal(r.status,400);
 r=await send('/api/auth/signup',{...signup,email:'badphone@example.test',phone:'12345'});equal(r.status,400);
 // ...and the Privacy Policy and Terms of Service must be accepted.
 r=await send('/api/auth/signup',{...signup,email:'noaccept@example.test',accepted:false});equal(r.status,400);
 r=await fetch(config.origin+'/api/market/me',{headers:{Cookie:cookie}});equal(((await r.json()) as {profile:{phone:string}}).profile.phone,'+923001234567');
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
 // The header's city: looked for inside the location, on its own or together with an area.
 equal((await find('city=Peshawar')).items.some(i=>i.id===created.id),true);equal((await find('city=lahore')).items.some(i=>i.id===created.id),false);equal((await find('city=all')).items.some(i=>i.id===created.id),true);equal((await find('city=peshawar&location=pesh&q=http')).total,1);equal((await find('city=peshawar&location=gulberg')).total,0);
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
 r=await send('/api/auth/signup',{email:'mailbuyer@example.test',name:'Mail Buyer',phone:'3011234567',password:'safe-http-password-123',role:'buyer',accepted:true});equal(r.status,200);const mailBuyer=r.headers.get('set-cookie')!.split(';')[0];
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
 r=await read('/api/market/notifications',cookie);equal(r.status,200);await new Promise(r=>setTimeout(r,300));equal(mailsTo(signup.email,'New review | Picking Price').length,1);equal(outbox.filter(m=>m.mail.to[0]==='mailbuyer@example.test'&&m.mail.subject!=='Welcome to Picking Price').length,0);
 // A new account gets one welcome email, laid out from the left like every other email.
 equal(await waitFor(()=>mailsTo('mailbuyer@example.test','Welcome to Picking Price').length===1),true);const welcome=mailsTo('mailbuyer@example.test','Welcome to Picking Price')[0];
 assert(welcome.mail.text.includes('Hello Mail Buyer')&&welcome.mail.text.includes(config.origin)&&welcome.mail.html.includes('text-align:left')&&!welcome.mail.html.includes('margin:0 auto'));checks++;
 // Read receipts: your message is unread until the other member opens the chat.
 type Msg={body:string;read:boolean};const chat=async(c:string)=>((await (await read('/api/market/messages/'+mailChat.id,c)).json()) as {items:Msg[]}).items;
 equal((await chat(mailBuyer)).map(m=>m.read),[false,false]);
 const bell=async()=>((await (await read('/api/market/bootstrap',cookie)).json()) as {unread:number}).unread;const unreadBefore=await bell();assert(unreadBefore>=3);checks++;
 equal((await chat(cookie)).map(m=>m.read),[false,false]);   // the seller opens the chat; the buyer's messages are not the seller's to tick
 // Opening the chat clears its two "New message" notifications from the bell; the review notification stays.
 equal(await bell(),unreadBefore-2);equal(((await (await read('/api/market/messages/'+mailChat.id,cookie)).json()) as {cleared:number}).cleared,0);
 equal((await chat(mailBuyer)).map(m=>m.read),[true,true]);
 await new Promise(r=>setTimeout(r,15));r=await send('/api/market/messages/'+mailChat.id,{body:'One more question.'},mailBuyer);equal(r.status,200);
 const later=await chat(mailBuyer);equal(later.find(m=>m.body==='One more question.')!.read,false);equal(later.find(m=>m.body==='I can collect it today.')!.read,true);
 await new Promise(r=>setTimeout(r,15));r=await send('/api/market/messages/'+mailChat.id,{body:'Yes, still available.'},cookie);equal(r.status,200);
 equal((await chat(cookie)).find(m=>m.body==='Yes, still available.')!.read,false);await chat(mailBuyer);equal((await chat(cookie)).find(m=>m.body==='Yes, still available.')!.read,true);
 r=await read('/api/market/messages/'+mailChat.id);equal(r.status,401);
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
 // Email from the site's own Gmail account: the administrator connects it once in the panel. Until then Resend carries the emails.
 type MailState={service:string;available:boolean;connected:boolean;email:string;problem:string;returnAddress:string};
 const mailState=async()=>(await (await get('/api/admin/mail',panel)).json()) as MailState;
 r=await get('/api/admin/mail');equal(r.status,401);r=await get('/api/admin/mail',cookie);equal(r.status,401);r=await send('/api/admin/mail/connect',{});equal(r.status,401);r=await send('/api/admin/mail/test',{},cookie);equal(r.status,401);
 const lastTest=()=>outbox.filter(m=>m.mail.subject==='Picking Price test email').at(-1)!;
 let ms=await mailState();equal([ms.service,ms.available,ms.connected,ms.email],['resend',true,false,'']);equal(ms.returnAddress,config.origin+'/api/admin/mail/callback');
 const connect=async()=>{const started=await send('/api/admin/mail/connect',{},panel);equal(started.status,200);return {jar:started.headers.get('set-cookie')!.split(';')[0],consent:new URL((await started.json() as {url:string}).url)}};
 const back=(query:string,jar:string)=>fetch(config.origin+'/api/admin/mail/callback?'+query,{redirect:'manual',headers:{Cookie:jar}});
 let link=await connect(),state=link.consent.searchParams.get('state')!;
 equal(link.consent.origin+link.consent.pathname,config.gmailEndpoints.auth);equal(link.consent.searchParams.get('client_id'),'mail-client');equal(link.consent.searchParams.get('scope'),'openid email '+sendScope);
 equal([link.consent.searchParams.get('access_type'),link.consent.searchParams.get('prompt'),link.consent.searchParams.get('code_challenge_method')],['offline','consent','S256']);equal(link.consent.searchParams.get('redirect_uri'),config.origin+'/api/admin/mail/callback');
 // Google's answer is accepted only in the browser that started, only once, and only with the permission to send.
 r=await back('code=good&state='+state,'');equal(r.status,302);equal(r.headers.get('location'),'/admin?mail=invalid_state');
 r=await back('code=good&state=made-up',link.jar);equal(r.headers.get('location'),'/admin?mail=invalid_state');
 r=await back('code=no-send&state='+state,link.jar);equal(r.headers.get('location'),'/admin?mail=no_permission');equal((await mailState()).connected,false);
 r=await back('code=good&state='+state,link.jar);equal(r.headers.get('location'),'/admin?mail=cancelled');
 link=await connect();state=link.consent.searchParams.get('state')!;r=await back('error=access_denied&state='+state,link.jar);equal(r.headers.get('location'),'/admin?mail=cancelled');
 link=await connect();state=link.consent.searchParams.get('state')!;r=await back('code=good&state='+state,link.jar);equal(r.headers.get('location'),'/admin?mail=connected');
 const exchange=tokenCalls.at(-1)!;equal([exchange.grant_type,exchange.client_id,exchange.client_secret,exchange.code,exchange.redirect_uri],['authorization_code','mail-client','mail-secret','good',config.origin+'/api/admin/mail/callback']);assert(exchange.code_verifier.length>40);checks++;
 ms=await mailState();equal([ms.service,ms.connected,ms.email,ms.problem],['gmail',true,'pickingprice@gmail.test','']);assert(!JSON.stringify(ms).includes('refresh-'));checks++;
 // The test button sends through Gmail, from the connected address, to the administrator unless another address is given.
 r=await send('/api/admin/mail/test',{to:'not an address'},panel);equal(r.status,400);
 r=await send('/api/admin/mail/test',{},panel);equal(r.status,200);equal(await r.json(),{ok:true,to:boss});
 const trial=lastTest();equal(trial.auth,'gmail Bearer access-'+google.issued);equal(trial.mail.from,'Picking Price <pickingprice@gmail.test>');equal(trial.mail.to,[boss]);equal(trial.mail.subject,'Picking Price test email');
 assert(trial.mail.text.includes('This is a test email from Picking Price.')&&trial.mail.html.includes('This is a test email from Picking Price.'));checks++;
 r=await send('/api/admin/mail/test',{to:'Elsewhere@Example.test'},panel);equal(r.status,200);equal(lastTest().mail.to,['elsewhere@example.test']);
 // Password reset needs a single-use code; an email address alone resets nothing. First the administrator's code.
 const member=((await (await get('/api/market/bootstrap',cookie)).json()) as {user:{id:string;email:string}}).user;equal(member.email,signup.email);
 const renewed='renewed-password-456';
 r=await send('/api/auth/reset',{email:signup.email,password:renewed});equal(r.status,400);
 r=await send('/api/market/admin/reset-code',{id:member.id},cookie);equal(r.status,403);
 r=await send('/api/admin/market/admin/reset-code',{id:'no-such-member'},panel);equal(r.status,409);
 r=await send('/api/admin/market/admin/reset-code',{id:member.id},panel);equal(r.status,200);const stale=(await r.json() as {code:string}).code;
 r=await send('/api/admin/market/admin/reset-code',{id:member.id},panel);equal(r.status,200);const issued=await r.json() as {code:string;email:string};equal(issued.email,signup.email);assert.match(issued.code,/^[A-Z2-9]{5}-[A-Z2-9]{5}$/);checks++;
 r=await send('/api/auth/reset',{email:signup.email,code:stale,password:renewed});equal(r.status,400);
 r=await send('/api/auth/reset',{email:'other@example.test',code:issued.code,password:renewed});equal(r.status,400);
 r=await send('/api/auth/reset',{email:signup.email,code:issued.code.toLowerCase().replace('-',' '),password:renewed});equal(r.status,200);equal(r.headers.get('set-cookie'),null);   // the member signs in afterwards
 r=await get('/api/market/me',cookie);equal(r.status,401);
 r=await send('/api/auth/reset',{email:signup.email,code:issued.code,password:'another-password-789'});equal(r.status,400);
 r=await send('/api/auth/login',{email:signup.email,password:signup.password});equal(r.status,401);
 r=await send('/api/auth/login',{email:signup.email,password:renewed});equal(r.status,200);r=await get('/api/market/me',r.headers.get('set-cookie')!.split(';')[0]);equal(r.status,200);
 // Forgot password by email: a 6-digit code goes to the account's own address, is checked, then sets the new password.
 const resetMails=()=>outbox.filter(m=>m.mail.to[0]==='mailbuyer@example.test'&&/reset code/.test(m.mail.subject));
 r=await send('/api/auth/forgot',{email:'0300 1234567'});equal(r.status,400);assert(/phone number/.test(((await r.json()) as {error:string}).error));checks++;
 r=await send('/api/auth/forgot',{email:'nobody-here@example.test'});equal(r.status,200);equal(outbox.filter(m=>m.mail.to[0]==='nobody-here@example.test').length,0);
 r=await send('/api/auth/forgot',{email:' MailBuyer@Example.test '});equal(r.status,200);equal(resetMails().length,1);
 const resetMail=resetMails()[0],emailed=resetMail.mail.subject.slice(0,6);assert.match(emailed,/^[0-9]{6}$/);checks++;equal(resetMail.auth,'gmail Bearer access-'+google.issued);equal(resetMail.mail.from,'Picking Price <pickingprice@gmail.test>');equal(resetMail.mail.name,'Mail Buyer');
 assert(resetMail.mail.text.includes('Hello Mail Buyer')&&resetMail.mail.text.includes(emailed)&&resetMail.mail.text.includes('15 minutes')&&resetMail.mail.html.includes(emailed));checks++;
 const wrong=emailed==='000000'?'000001':'000000';
 r=await send('/api/auth/reset/verify',{email:'mailbuyer@example.test',code:wrong});equal(r.status,400);
 r=await send('/api/auth/reset/verify',{email:'mailbuyer@example.test',code:emailed});equal(r.status,200);
 r=await send('/api/auth/reset',{email:'mailbuyer@example.test',code:emailed,password:'Fresh-password-2026'});equal(r.status,200);equal(r.headers.get('set-cookie'),null);
 r=await send('/api/auth/reset/verify',{email:'mailbuyer@example.test',code:emailed});equal(r.status,400);   // used up
 // The owner is told the password changed.
 equal(await waitFor(()=>mailsTo('mailbuyer@example.test','Your Picking Price password was changed').length===1),true);const changed=mailsTo('mailbuyer@example.test','Your Picking Price password was changed')[0];
 assert(changed.mail.text.includes('Hello Mail Buyer')&&changed.mail.text.includes(config.origin+'/login')&&changed.mail.html.includes('text-align:left'));checks++;
 r=await get('/api/market/me',mailBuyer);equal(r.status,401);                                                 // signed out everywhere
 r=await send('/api/auth/login',{email:'mailbuyer@example.test',password:'safe-http-password-123'});equal(r.status,401);
 r=await send('/api/auth/login',{email:'mailbuyer@example.test',password:'Fresh-password-2026'});equal(r.status,200);
 // An access token that Google withdraws early is replaced without losing the email.
 const refreshes=()=>tokenCalls.filter(t=>t.grant_type==='refresh_token');equal(refreshes().length,0);
 google.withdrawn='access-'+google.issued;r=await send('/api/admin/mail/test',{},panel);equal(r.status,200);equal(lastTest().auth,'gmail Bearer access-'+google.issued);
 equal(refreshes().length,1);equal([refreshes()[0].client_id,refreshes()[0].client_secret],['mail-client','mail-secret']);assert(/^refresh-\d+$/.test(refreshes()[0].refresh_token));checks++;
 // When Google stops accepting the connection the panel says so, and Resend carries the emails until it is connected again.
 google.withdrawn='access-'+google.issued;google.expired=true;r=await send('/api/admin/mail/test',{},panel);equal(r.status,502);
 ms=await mailState();equal([ms.service,ms.connected,ms.problem],['resend',true,'expired']);
 r=await send('/api/auth/signup',{email:'fallback@example.test',name:'Fall Back',phone:'+923021234567',password:'safe-http-password-123',role:'buyer',accepted:true});equal(r.status,200);
 r=await send('/api/auth/forgot',{email:'fallback@example.test'});equal(r.status,200);const viaOther=outbox.filter(m=>m.mail.to[0]==='fallback@example.test'&&/reset code/.test(m.mail.subject));equal(viaOther.length,1);equal(viaOther[0].auth,'Bearer re_test_key');equal(viaOther[0].mail.from,'Picking Price <notify@example.test>');
 google.expired=false;link=await connect();r=await back('code=good&state='+link.consent.searchParams.get('state'),link.jar);equal(r.headers.get('location'),'/admin?mail=connected');ms=await mailState();equal([ms.service,ms.problem],['gmail','']);
 // Headers are encoded, so any language arrives intact and an address cannot smuggle in a second recipient.
 const viaGmail={gmail:{clientId:'mail-client',clientSecret:'mail-secret',endpoints:config.gmailEndpoints},from:'Picking Price <notify@example.test>',site:config.origin};
 const longSubject='نیا پیغام: '+'قیمت کم ہو سکتی ہے؟ '.repeat(6)+'| Picking Price';
 equal(await sendMail(db,viaGmail,{to:'urdu@example.test',name:'محمد شہریار',subject:longSubject,text:'سلام\nline two',html:'<p>سلام</p>'}),true);
 const urdu=outbox.find(m=>m.mail.to[0]==='urdu@example.test')!;equal(urdu.mail.subject,longSubject);equal(urdu.mail.name,'محمد شہریار');equal(urdu.mail.text,'سلام\nline two');equal(urdu.mail.html,'<p>سلام</p>');
 equal(await sendMail(db,viaGmail,{to:'one@example.test,two@example.test',subject:'x',text:'x',html:'x'}),false);equal(await sendMail(db,viaGmail,{to:'one@example.test>\r\nBcc: two@example.test',subject:'x',text:'x',html:'x'}),false);equal(outbox.some(m=>/one@|two@/.test(m.mail.to.join())),false);
 equal(await sendMail(db,viaGmail,{to:'urdu@example.test',subject:'refuse me',text:'x',html:'x'}),false);
 // Disconnecting forgets the account, tells Google, and is written to the activity log with the connections.
 const held=tokenCalls.filter(t=>t.grant_type==='authorization_code').length;
 r=await send('/api/admin/mail/disconnect',{});equal(r.status,401);r=await send('/api/admin/mail/disconnect',{},panel);equal(r.status,200);equal(revoked,['refresh-'+google.issued]);assert(held>=3);checks++;
 ms=await mailState();equal([ms.service,ms.connected,ms.email],['resend',false,'']);
 r=await get('/api/admin/market/admin/audit',panel);const audit=JSON.stringify(await r.json());assert(audit.includes('admin:mail-connect')&&audit.includes('admin:mail-disconnect')&&audit.includes('pickingprice@gmail.test'));checks++;
 // Resend uses its own request shape; a refusal is reported as not sent.
 const viaResend={resendKey:'re_direct_key',from:'Picking Price <notify@example.test>',site:config.origin,endpoint:config.emailEndpoint};
 equal(await sendMail(db,viaResend,{to:'direct@example.test',subject:'Direct check',text:'plain',html:'<p>rich</p>'}),true);const direct=outbox.find(m=>m.mail.to[0]==='direct@example.test')!;equal(direct.auth,'Bearer re_direct_key');equal(direct.mail.from,'Picking Price <notify@example.test>');equal(direct.mail.text,'plain');
 equal(await sendMail(db,viaResend,{to:'direct@example.test',subject:'refuse me',text:'x',html:'x'}),false);
 // With no Gmail account connected and no other service, Forgot Password says email is not set up instead of pretending.
 const bare=createApp(db,{...config,resendKey:undefined}).listen(0,'127.0.0.1');await new Promise<void>(done=>bare.once('listening',done));
 try{r=await fetch('http://127.0.0.1:'+(bare.address() as AddressInfo).port+'/api/auth/forgot',{method:'POST',headers:{Origin:config.origin,'Content-Type':'application/json'},body:JSON.stringify({email:'fallback@example.test'})});equal(r.status,503);assert(/not set up/.test(((await r.json()) as {error:string}).error));checks++;}
 finally{await new Promise<void>(done=>bare.close(()=>done()));}
 r=await get('/admin');equal(r.status,200);r=await get('/login');equal(r.status,200);
 r=await send('/api/auth/logout',{},cookie);equal(r.status,200);r=await fetch(config.origin+'/api/market/me',{headers:{Cookie:cookie}});equal(r.status,401);
 r=await fetch(config.origin);equal(r.status,200);const home=await r.text();assert(home.includes('Picking Price'));checks++;
 assert(home.includes('<meta name="google-site-verification" content="test-verify_Code-123x"/><meta name="google-site-verification" content="second_Code-456"/></head>'));checks++;
 r=await get('/privacy');equal(r.status,200);const privacy=await r.text();assert(privacy.includes('<title>Privacy Policy — Picking Price</title>')&&privacy.includes('Information from your Google account')&&privacy.includes('We do not sell your personal information')&&privacy.includes('google-site-verification'));checks++;
 r=await get('/terms/');equal(r.status,200);const terms=await r.text();assert(terms.includes('<h1>Terms of Service</h1>')&&terms.includes('governed by the laws of Pakistan')&&!terms.includes('<div id="root"></div>'));checks++;
 console.log(checks+' Express HTTP assertions passed with embedded PostgreSQL.');
}finally{await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));mailServer.close();await pg.close();}
