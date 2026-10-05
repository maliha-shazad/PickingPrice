'use client';
import { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, RefreshCcw, Flag, ArrowLeft, Search, Package } from 'lucide-react';
import { Actions, Item, useLoad, Load, date, money } from './ui';

const contextLabel = (about: Item | null, type: string) => { const k = String(about?.kind || type); return k === 'listing' ? 'Product' : k === 'request' ? 'Buyer request' : k === 'offer' ? 'Offer' : 'Chat'; };

export function Messages({ actions }: { actions: Actions }) {
    const [page, setPage] = useState(1);
    const [current, setCurrent] = useState('');
    const [searchQ, setSearchQ] = useState('');
    const state = useLoad('conversations?page=' + page + '&size=20', actions.revision);
    const convos: Item[] = state.data?.items || [];
    const total = state.data?.total || 0;

    const filtered = searchQ.trim()
        ? convos.filter((c: Item) =>
            (c.other_name || '').toLowerCase().includes(searchQ.toLowerCase()) ||
            (c.title || '').toLowerCase().includes(searchQ.toLowerCase()))
        : convos;

    return (
        <section className="msg-page">
            <div className="msg-layout">
                {/* Sidebar — conversation list */}
                <aside className={`msg-sidebar${current ? ' msg-sidebar-hidden-mobile' : ''}`}>
                    <div className="msg-sidebar-header">
                        <h2 className="msg-sidebar-title"><MessageCircle size={18} /> Messages</h2>
                        <span className="msg-sidebar-count">{total}</span>
                    </div>

                    <div className="msg-search-wrap">
                        <Search size={14} className="msg-search-icon" />
                        <input
                            type="text"
                            className="msg-search-input"
                            placeholder="Search conversations..."
                            value={searchQ}
                            onChange={e => setSearchQ(e.target.value)}
                        />
                    </div>

                    <div className="msg-conv-list">
                        <Load state={state}>
                            {filtered.length === 0 && (
                                <div className="msg-empty-sidebar">
                                    <MessageCircle size={32} style={{ opacity: 0.2 }} />
                                    <p>No conversations yet</p>
                                    <span>Contact a seller from a listing to start chatting.</span>
                                </div>
                            )}
                            {filtered.map((c: Item) => (
                                <button
                                    key={c.id}
                                    className={`msg-conv-item${current === c.id ? ' active' : ''}`}
                                    onClick={() => setCurrent(c.id)}
                                >
                                    <div className="msg-conv-avatar">
                                        {(c.context as Item | null)?.image
                                            ? <img src={String((c.context as Item).image)} alt="" />
                                            : String(c.other_name || 'U').charAt(0).toUpperCase()}
                                    </div>
                                    <div className="msg-conv-info">
                                        <div className="msg-conv-name-row">
                                            <strong className="msg-conv-name">{c.other_name || 'User'}</strong>
                                            <span className="msg-conv-time">{date(c.updated)}</span>
                                        </div>
                                        <p className="msg-conv-preview"><span className="msg-conv-kind">{contextLabel(c.context as Item | null, String(c.context_type || ''))}</span>{String(c.title || 'Conversation')}</p>
                                    </div>
                                </button>
                            ))}
                        </Load>

                        {total > 20 && (
                            <div className="msg-load-more">
                                <button onClick={() => setPage(p => p + 1)}>Load more</button>
                            </div>
                        )}
                    </div>
                </aside>

                {/* Chat area */}
                <div className={`msg-chat-area${current ? ' msg-chat-visible-mobile' : ''}`}>
                    {current ? (
                        <ChatPanel
                            key={current}
                            actions={actions}
                            id={current}
                            onBack={() => setCurrent('')}
                        />
                    ) : (
                        <div className="msg-empty-chat">
                            <MessageCircle size={48} style={{ opacity: 0.15 }} />
                            <h3>Select a conversation</h3>
                            <p>Choose from your existing conversations or start a new one from a product listing.</p>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}

function ChatPanel({ actions, id, onBack }: { actions: Actions; id: string; onBack: () => void }) {
    const [page, setPage] = useState(1);
    const [body, setBody] = useState('');
    const [busy, setBusy] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const state = useLoad('messages/' + encodeURIComponent(id) + '?page=' + page + '&size=50', actions.revision);
    const messages: Item[] = state.data?.items || [];
    const conv = state.data?.conversation;

    useEffect(() => {
        // Scroll the message list itself, not the page: the page jumping down hid the chat's header.
        const list = messagesEndRef.current?.closest('.msg-messages-wrap');
        if (list) list.scrollTo({ top: list.scrollHeight, behavior: 'smooth' });
    }, [messages.length]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!body.trim()) return;
        setBusy(true);
        const r = await actions.perform('messages/' + encodeURIComponent(id), 'POST', { body: body.trim() });
        setBusy(false);
        if (r) {
            setBody('');
            setPage(1);
        }
    };

    const otherName = String(conv?.other_name || 'Member');
    const about = (conv?.context || null) as Item | null;
    const kind = contextLabel(about, String(conv?.context_type || ''));

    return (
        <div className="msg-chat-panel">
            {/* Chat header */}
            <div className="msg-chat-header">
                <button className="msg-back-btn" onClick={onBack}>
                    <ArrowLeft size={18} />
                </button>
                <div className="msg-chat-header-avatar">
                    {conv?.other_avatar ? <img src={String(conv.other_avatar)} alt="" /> : otherName.charAt(0).toUpperCase()}
                </div>
                <div className="msg-chat-header-info">
                    <strong>{otherName}</strong>
                    <span>{conv ? 'Chat about this ' + kind.toLowerCase() : ''}</span>
                </div>
                <button className="msg-refresh-btn" onClick={state.retry} title="Refresh">
                    <RefreshCcw size={16} />
                </button>
            </div>

            {/* What this chat is about: shown to both people */}
            {conv && (
                <div className="msg-context" data-kind={String(about?.kind || conv.context_type || '')}>
                    <div className="msg-context-thumb">{about?.image ? <img src={String(about.image)} alt="" /> : <Package size={18} />}</div>
                    <div className="msg-context-info">
                        <span className="msg-context-kind">{kind}</span>
                        <strong>{String(about?.title || conv.title || 'Conversation')}</strong>
                        {about && <small>{about.kind === 'request' ? 'Budget ' : about.kind === 'offer' ? 'Offer ' : ''}{money(Number(about.price))}{about.condition ? ' · ' + String(about.condition) : ''}{about.location ? ' · ' + String(about.location) : ''}</small>}
                    </div>
                    {about && about.available
                        ? <button type="button" className="msg-context-view" onClick={() => actions.open(about.kind === 'listing' ? 'listing' : 'request', { id: about.id })}>View</button>
                        : <span className="msg-context-gone">No longer available</span>}
                </div>
            )}

            {/* Messages */}
            <div className="msg-messages-wrap">
                <Load state={state}>
                    {messages.length === 0 && (
                        <div className="msg-no-messages">
                            <p>No messages yet. Say hello!</p>
                        </div>
                    )}
                    <div className="msg-messages-list">
                        {[...messages].reverse().map((m: Item) => (
                            <div
                                key={m.id}
                                className={`msg-bubble-wrap${m.owner === actions.user?.id ? ' mine' : ''}`}
                            >
                                <div className="msg-bubble">
                                    <div className="msg-bubble-header">
                                        <strong>{m.sender}</strong>
                                        <small>{new Date(m.created).toLocaleString('en-PK', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}</small>
                                    </div>
                                    <p className="msg-bubble-body">{m.body}</p>
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>
                </Load>
            </div>

            {/* Composer */}
            <form className="msg-composer" onSubmit={handleSend}>
                <input
                    type="text"
                    className="msg-composer-input"
                    placeholder="Type a message..."
                    value={body}
                    onChange={e => setBody(e.target.value)}
                    maxLength={2000}
                    required
                />
                <button type="submit" className="msg-send-btn" disabled={busy || !body.trim()}>
                    <Send size={16} />
                </button>
            </form>
        </div>
    );
}

export function Conversation({ actions, id }: { actions: Actions; id: string }) {
    return <ChatPanel actions={actions} id={id} onBack={() => {}} />;
}

export function Notifications({ actions }: { actions: Actions }) {
    const [page, setPage] = useState(1);
    const state = useLoad('notifications?page=' + page, actions.revision);

    const follow = (n: Item) => {
        actions.perform('notifications/' + n.id, 'PATCH', {});
        if (n.link_type === 'listing') actions.open('listing', { id: n.link_id });
        else if (n.link_type === 'request') actions.open('request', { id: n.link_id });
        else if (n.link_type === 'conversation') actions.open('conversation', { id: n.link_id });
        else if (n.link_type === 'profile') actions.open('profile', { id: n.link_id });
        else if (n.link_type === 'services') actions.go('Services');
    };

    return (
        <section>
            <div className="section-head">
                <h1>Notifications</h1>
                <button className="btn" onClick={() => actions.perform('notifications/all', 'PATCH', {})}>Mark all as read</button>
            </div>
            <Load state={state}>
                {state.data?.items?.map((n: Item) => (
                    <article className={'notification ' + (!n.read ? 'unread' : '')} key={n.id}>
                        <button onClick={() => follow(n)}>
                            <strong>{n.title}</strong>
                            <p>{n.body}</p>
                            <small>{date(n.created)}</small>
                        </button>
                        {!n.read && <button className="text-link" onClick={() => actions.perform('notifications/' + n.id, 'PATCH', {})}>Mark read</button>}
                    </article>
                ))}
                {state.data?.items?.length === 0 && (
                    <div className="empty">
                        <h3>You&apos;re all caught up</h3>
                        <p>No new notifications.</p>
                    </div>
                )}
            </Load>
        </section>
    );
}
