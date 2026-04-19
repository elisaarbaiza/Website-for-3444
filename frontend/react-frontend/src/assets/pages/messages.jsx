import { Link } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useSearchParams } from "react-router-dom";
import "../css/chat.css";

const API_BASE = "http://localhost:5000";

function timeLabel(timestamp) {
  return new Date(Number(timestamp)).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function Messages() {
  const [searchParams] = useSearchParams();
  const requestedSellerId = searchParams.get("sellerId");
  const [currentUser, setCurrentUser] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [messages, setMessages] = useState([]);
  const [activeContactId, setActiveContactId] = useState("");
  const [activeConversationId, setActiveConversationId] = useState("");
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const activeConversationIdRef = useRef("");

  const filteredContacts = useMemo(() => {
    const lowered = search.toLowerCase().trim();
    if (!lowered) return contacts;
    return contacts.filter((contact) => contact.name.toLowerCase().includes(lowered) || contact.role.includes(lowered));
  }, [contacts, search]);

  const activeContact = contacts.find((contact) => contact.id === activeContactId) || null;
  const activeMessages = messages;
  const socket = useMemo(
    () =>
      io(API_BASE, {
        withCredentials: true,
        autoConnect: false,
      }),
    []
  );

  useEffect(() => {
    const bootstrap = async () => {
      try {
        setLoading(true);
        const meRes = await fetch(`${API_BASE}/api/me`, { credentials: "include" });
        if (!meRes.ok) throw new Error("Please log in first to use chat.");
        const me = await meRes.json();
        setCurrentUser(me);

        const contactsRes = await fetch(`${API_BASE}/api/chat/contacts`, { credentials: "include" });
        if (!contactsRes.ok) throw new Error("Failed to load contacts.");
        let loadedContacts = await contactsRes.json();

        if (requestedSellerId) {
          const openRes = await fetch(`${API_BASE}/api/chat/open/${requestedSellerId}`, {
            method: "POST",
            credentials: "include",
          });
          if (openRes.ok) {
            const opened = await openRes.json();
            const hasContact = loadedContacts.some((contact) => Number(contact.id) === Number(opened.contact.id));
            if (!hasContact) {
              loadedContacts = [...loadedContacts, opened.contact];
            }
            setActiveContactId(opened.contact.id);
          }
        }

        setContacts(loadedContacts);
        if (!requestedSellerId && loadedContacts[0]) setActiveContactId(loadedContacts[0].id);
      } catch (err) {
        setError(err.message || "Failed to initialize chat.");
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, [requestedSellerId]);

  useEffect(() => {
    if (!activeContactId || !currentUser) return;

    const loadConversation = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/chat/conversations/${activeContactId}`, {
          credentials: "include",
        });
        if (!response.ok) throw new Error("Failed to load conversation.");
        const data = await response.json();
        setMessages(data.messages || []);
        setActiveConversationId(data.conversationId || "");
        activeConversationIdRef.current = data.conversationId || "";
      } catch (err) {
        setError(err.message || "Failed to load conversation.");
      }
    };

    loadConversation();
  }, [activeContactId, currentUser]);

  useEffect(() => {
    if (!currentUser) return;

    socket.on("connect", () => {
      if (activeContactId) {
        socket.emit("join conversation", { otherUserId: activeContactId });
      }
    });
    socket.connect();
    socket.on("chat error", (payload) => {
      setError(payload?.message || "Chat socket error.");
    });
    socket.on("chat message", ({ conversationId, message }) => {
      if (conversationId !== activeConversationIdRef.current) return;
      setMessages((prev) => [...prev, message]);
    });

    return () => {
      socket.off("connect");
      socket.off("chat error");
      socket.off("chat message");
      socket.disconnect();
    };
  }, [socket, currentUser, activeContactId]);

  useEffect(() => {
    if (!activeContactId || !socket.connected) return;
    socket.emit("join conversation", { otherUserId: activeContactId });
  }, [activeContactId, socket]);

  const sendMessage = () => {
    if (!activeContact || !draft.trim() || !socket.connected) return;

    socket.emit("chat message", {
      otherUserId: activeContact.id,
      text: draft.trim(),
    });
    setDraft("");
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  const sortedFilteredContacts = useMemo(() => {
    return [...filteredContacts].sort((a, b) => {
      const aTs = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const bTs = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return bTs - aTs;
    });
  }, [filteredContacts]);

  if (loading) {
    return (
      <div className="chat-page">
        <div className="chat-wrapper chat-loading">Loading chat...</div>
      </div>
    );
  }

  if (error && !currentUser) {
    return (
      <div className="chat-page">
        <div className="chat-wrapper chat-loading">
          <div>
            <p>{error}</p>
            <Link to="/login" className="btn btn-primary">
              Go to login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-page">
      <div className="chat-wrapper">
        <aside className="chat-sidebar">
          <div className="chat-sidebar-top">
            <h2>Messages</h2>
            <p className="chat-current-user">
              {currentUser?.username || currentUser?.email || "You"}
            </p>
            <input
              type="text"
              className="chat-search"
              placeholder="Search buyers/sellers..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className="chat-contacts">
            {sortedFilteredContacts.length === 0 ? (
              <p className="chat-empty p-3 mb-0">No conversations yet. Open a product and click Contact Seller.</p>
            ) : (
              sortedFilteredContacts.map((contact) => (
                <button
                  key={contact.id}
                  type="button"
                  className={`chat-contact ${activeContactId === contact.id ? "active" : ""}`}
                  onClick={() => setActiveContactId(contact.id)}
                >
                  <div className="chat-contact-name-row">
                    <span className="chat-contact-name">{contact.name}</span>
                    <span className={`chat-role ${contact.role || "buyer"}`}>{contact.role || "buyer"}</span>
                  </div>
                  <span className="chat-preview">{contact.lastMessage || "No messages yet"}</span>
                </button>
              ))
            )}
          </div>
        </aside>

        <section className="chat-main">
          <header className="chat-main-header">
            <div>
              <h3>{activeContact?.name || "No contact selected"}</h3>
              {activeContact && <p>Chatting with a {activeContact.role || "buyer"}</p>}
            </div>
            <Link to="/" className="btn btn-sm btn-primary">
              Back Home
            </Link>
          </header>

          <div className="chat-messages">
            {activeMessages.length === 0 ? (
              <p className="chat-empty">Start the conversation with {activeContact?.name || "a contact"}.</p>
            ) : (
              activeMessages.map((message) => (
                <div
                  key={message.id}
                  className={`chat-bubble ${message.senderId === currentUser?.id ? "outgoing" : "incoming"}`}
                >
                  <p>{message.text}</p>
                  <span>{timeLabel(message.createdAt)}</span>
                </div>
              ))
            )}
          </div>

          <div className="chat-input-row">
            <textarea
              rows="2"
              placeholder="Type a message..."
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button type="button" className="btn btn-primary" onClick={sendMessage} disabled={!draft.trim()}>
              Send
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Messages;
