'use client';
import { useState } from 'react';
import { Actions, Item, useLoad, Load, Pager, Empty, date } from './ui';
export function Messages({ actions, selected }: {
    actions: Actions;
    selected?: string;
}) { const [page, setPage] = useState(1), [current, setCurrent] = useState(selected || ''); const state = useLoad('conversations?page=' + page + '&size=12', actions.revision); return <section className="messages-page"><h1>Conversations</h1><p>Discuss details, condition, payment and collection directly.</p><div className="messages-layout"><aside><Load state={state}>{state.data?.items.map((c: Item) => <button className={'conversation-link ' + (current === c.id ? 'selected' : '')} key={c.id} onClick={() => setCurrent(c.id)}><strong>{c.other_name}</strong><span>{c.title}</span><small>{date(c.updated)}</small></button>)}{state.data?.items.length === 0 && <Empty title="No conversations yet" text="Contact a seller from a listing or respond to a request."/>}<Pager page={page} total={state.data?.total || 0} onChange={setPage}/></Load></aside><div>{current ? <Conversation key={current} actions={actions} id={current}/> : <Empty title="Choose a conversation"/>}</div></div></section>; }
export function Conversation({ actions, id }: {
    actions: Actions;
    id: string;
}) { const [page, setPage] = useState(1), [body, setBody] = useState(''), [busy, setBusy] = useState(false); const state = useLoad('messages/' + encodeURIComponent(id) + '?page=' + page + '&size=30', actions.revision); return <div className="conversation"><Load state={state}>{state.data && <><h3>{state.data.conversation.title}</h3><button className="text-link" onClick={state.retry}>Refresh messages</button><div className="message-list">{[...state.data.items].reverse().map((m: Item) => <div className={'message ' + (m.owner === actions.user?.id ? 'mine' : '')} key={m.id}><strong>{m.sender}</strong><p>{m.body}</p><small>{new Date(m.created).toLocaleString()}</small><button className="text-link" onClick={() => actions.open('report', { type: 'message', id: m.id })}>Report</button></div>)}</div><Pager page={page} total={state.data.total} size={30} onChange={setPage}/></>}</Load><form className="message-composer" onSubmit={async (e) => { e.preventDefault(); setBusy(true); const r = await actions.perform('messages/' + encodeURIComponent(id), 'POST', { body }); setBusy(false); if (r) {
    setBody('');
    setPage(1);
} }}><textarea aria-label="Message" required maxLength={2000} value={body} onChange={e => setBody(e.target.value)} placeholder="Write a message…"/><button className="btn dark" disabled={busy}>{busy ? 'Sending…' : 'Send'}</button></form></div>; }
export function Notifications({ actions }: {
    actions: Actions;
}) { const [page, setPage] = useState(1); const state = useLoad('notifications?page=' + page, actions.revision); const follow = (n: Item) => { actions.perform('notifications/' + n.id, 'PATCH', {}); if (n.link_type === 'listing')
    actions.open('listing', { id: n.link_id });
else if (n.link_type === 'request')
    actions.open('request', { id: n.link_id });
else if (n.link_type === 'conversation')
    actions.open('conversation', { id: n.link_id });
else if (n.link_type === 'profile')
    actions.open('profile', { id: n.link_id });
else if (n.link_type === 'services')
    actions.go('Services'); }; return <section><div className="section-head"><h1>Notifications</h1><button className="btn" onClick={() => actions.perform('notifications/all', 'PATCH', {})}>Mark all as read</button></div><Load state={state}>{state.data?.items.map((n: Item) => <article className={'notification ' + (!n.read ? 'unread' : '')} key={n.id}><button onClick={() => follow(n)}><strong>{n.title}</strong><p>{n.body}</p><small>{date(n.created)}</small></button>{!n.read && <button className="text-link" onClick={() => actions.perform('notifications/' + n.id, 'PATCH', {})}>Mark read</button>}</article>)}{state.data?.items.length === 0 && <Empty title="You’re all caught up"/>}<Pager page={page} total={state.data?.total || 0} onChange={setPage}/></Load></section>; }
