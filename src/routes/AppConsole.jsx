import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, uploadFile, chat } from "../ui/api.js";
import { clearSession, getTenant, getToken, getUser, isAdmin } from "../lib/auth.js";

// Icons (inline SVG for zero dependencies)
const IconPlus = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const IconSend = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);
const IconPaperclip = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
  </svg>
);
const IconLogout = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);
const IconSearch = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);
const IconSettings = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);
const IconMessage = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

export default function AppConsole() {
  const nav = useNavigate();
  const token = getToken();
  const user = getUser();
  const [tenant] = useState(getTenant());
  const [health, setHealth] = useState("...");
  
  // Threads & Messages
  const [threads, setThreads] = useState([]);
  const [threadId, setThreadId] = useState("");
  const [messages, setMessages] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Composer
  const [text, setText] = useState("");
  const [agents, setAgents] = useState([]);
  const [agentId, setAgentId] = useState(() => localStorage.getItem('orkio_agent_id') || '');
  const [listening, setListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recogRef = useRef(null);
  const baseTextRef = useRef("");
  const interimTextRef = useRef("");

  const [sending, setSending] = useState(false);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  
  // Upload
  const [uploadStatus, setUploadStatus] = useState("");
  const [uploadProgress, setUploadProgress] = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    if (!token) nav("/auth");
  }, [token, nav]);

  // Load health
  useEffect(() => {
    async function checkHealth() {
      try {
        const res = await fetch((window.__ORKIO_ENV__?.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || "") + "/api/health");
        const j = await res.json();
        setHealth(j?.status === "ok" ? "ok" : "down");
      } catch {
        setHealth("down");
      }
    }
    checkHealth();
  }, []);

  // Load threads
  async function loadThreads() {
    try {
      const { data } = await apiFetch("/api/threads", { token, org: tenant });
      setThreads(data || []);
      if (!threadId && data?.[0]?.id) setThreadId(data[0].id);
    } catch (e) {
      console.error("loadThreads error:", e);
    }
  }

  // Load messages
  async function loadMessages(tid) {
    if (!tid) return;
    try {
      const { data } = await apiFetch(`/api/messages?thread_id=${encodeURIComponent(tid)}`, { token, org: tenant });
      setMessages(data || []);
    } catch (e) {
      console.error("loadMessages error:", e);
    }
  }

  // Load agents
  async function loadAgents() {
    try {
      const { data } = await apiFetch("/api/agents", { token, org: tenant });
      setAgents(data || []);
      // If no agent selected, try to find default
      if (!agentId && data?.length) {
        const defaultAgent = data.find(a => a.is_default);
        if (defaultAgent) {
          setAgentId(defaultAgent.id);
          localStorage.setItem('orkio_agent_id', defaultAgent.id);
        }
      }
    } catch (e) {
      console.error("loadAgents error:", e);
    }
  }

  useEffect(() => { loadThreads(); loadAgents(); }, [tenant]);
  useEffect(() => { if (threadId) loadMessages(threadId); }, [threadId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + "px";
    }
  }, [text]);

  // Create new thread
  async function createThread() {
    try {
      const { data } = await apiFetch("/api/threads", { method: "POST", token, org: tenant, body: { title: "Nova conversa" } });
      setThreads([data, ...threads]);
      setThreadId(data.id);
      setMessages([]);
    } catch (e) {
      console.error("createThread error:", e);
    }
  }

  // Send message
  async function send() {
    const msg = text.trim();
    if (!msg || sending) return;
    
    setSending(true);
    setText("");
    
    // Optimistic update - show user message immediately
    const tempUserMsg = { id: "temp-user-" + Date.now(), role: "user", content: msg, created_at: Date.now() / 1000 };
    setMessages(prev => [...prev, tempUserMsg]);
    
    try {
      const { data } = await chat({ thread_id: threadId || null, agent_id: agentId || null, message: msg, top_k: 6, token, org: tenant });
      setThreadId(data.thread_id);
      await loadMessages(data.thread_id);
      await loadThreads(); // Refresh thread list in case new thread was created
    } catch (e) {
      // Show error as assistant message
      setMessages(prev => [...prev, { id: "error-" + Date.now(), role: "assistant", content: `❌ Erro: ${e.message}`, created_at: Date.now() / 1000 }]);
    } finally {
      setSending(false);
    }
  }

  // Handle keyboard shortcuts
  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

    function pickUploadIntent() {
    // Simple, safe MVP: explicit user choice (no implicit KB pollution)
    const choice = window.prompt(
      "Destino do documento:\n1 = Apenas neste chat (temporário)\n2 = Base do agente (persistente)\n3 = Institucional (global)\n\nDigite 1, 2 ou 3:",
      "1"
    );
    const c = String(choice || "1").trim();
    if (c === "2") return "agent";
    if (c === "3") return "institutional";
    return "chat";
  }

// Upload file
  async function doUpload(ev) {
    const f = ev.target.files?.[0];
    if (!f) return;
    
    setUploadProgress(true);
    setUploadStatus("Enviando...");
    
    try {
      const intent = pickUploadIntent();
      const { data } = await uploadFile(f, { token, org: tenant, agentId, threadId: threadId || null, intent });
      setUploadStatus(`✅ ${data.filename} (${data.extracted_chars} chars) → ${intent}`);
      setTimeout(() => setUploadStatus(""), 5000);
    } catch (e) {
      setUploadStatus(`❌ ${e.message}`);
    } finally {
      setUploadProgress(false);
      ev.target.value = "";
    }
  }

  // Logout
  function logout() {
    clearSession();
    nav("/auth");
  }

  // Filter threads by search
  const filteredThreads = threads.filter(t => 
    !searchQuery || t.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Format timestamp
  function formatDateTime(ts) {
    const d = new Date(ts * 1000);
    // Always show date + time for clear auditability
    const date = d.toLocaleDateString("pt-BR");
    const time = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    return `${date} ${time}`;
  }

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setSpeechSupported(false); return; }
    setSpeechSupported(true);
    const rec = new SR();
    rec.lang = "pt-BR";
    rec.interimResults = true;
    rec.continuous = false;

    rec.onresult = (event) => {
      let finalText = "";
      let interimText = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        const chunk = (res[0]?.transcript || "").trim();
        if (!chunk) continue;
        if (res.isFinal) finalText += (finalText ? " " : "") + chunk;
        else interimText += (interimText ? " " : "") + chunk;
      }

      if (finalText) {
        baseTextRef.current = (baseTextRef.current ? baseTextRef.current + " " : "") + finalText;
        interimTextRef.current = "";
        setText(baseTextRef.current.trim());
      } else {
        interimTextRef.current = interimText;
        setText((baseTextRef.current + " " + interimText).trim());
      }
    };

    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);

    recogRef.current = rec;
  }, []);

  const toggleMic = () => {
    const rec = recogRef.current;
    if (!rec) return;
    if (listening) {
      try { rec.stop(); } catch {}
      setListening(false);
      return;
    }
    try {
      baseTextRef.current = text || "";
      interimTextRef.current = "";
      setListening(true);
      rec.start();
    } catch {
      setListening(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        {/* Header */}
        <div style={styles.sidebarHeader}>
          <div style={styles.logoRow}>
            <img src="/orkio-logo.png" alt="Orkio" style={styles.logo} />
            <div style={styles.healthBadge}>
              <span style={{ ...styles.healthDot, background: health === "ok" ? "#10b981" : "#ef4444" }} />
              {health === "ok" ? "Online" : "Offline"}
            </div>
          </div>
        </div>

        {/* New Chat Button */}
        <button style={styles.newChatBtn} onClick={createThread}>
          <IconPlus /> Nova conversa
        </button>

        {/* Agent Selector */}
        {agents.length > 0 && (
          <div style={styles.agentSelector}>
            <label style={styles.agentLabel}>Agente:</label>
            <select
              value={agentId}
              onChange={(e) => {
                setAgentId(e.target.value);
                localStorage.setItem('orkio_agent_id', e.target.value);
              }}
              style={styles.agentSelect}
            >
              <option value="">Default</option>
              {agents.map(a => (
                <option key={a.id} value={a.id}>
                  {a.name}{a.is_default ? ' ⭐' : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Search */}
        <div style={styles.searchContainer}>
          <IconSearch />
          <input
            type="text"
            placeholder="Buscar conversas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        {/* Threads List */}
        <div style={styles.threadsList}>
          {filteredThreads.length === 0 ? (
            <div style={styles.emptyThreads}>Nenhuma conversa ainda</div>
          ) : (
            filteredThreads.map(t => (
              <button
                key={t.id}
                onClick={() => setThreadId(t.id)}
                style={{
                  ...styles.threadItem,
                  ...(t.id === threadId ? styles.threadItemActive : {}),
                }}
              >
                <IconMessage />
                <span style={styles.threadTitle}>{t.title}</span>
                <button
                  style={styles.threadEditBtn}
                  onClick={(e) => { e.stopPropagation(); renameThread(t.id); }}
                  title="Renomear conversa"
                >
                  <IconEdit />
                </button>
              </button>
            ))
          )}
        </div>

        {/* User Section */}
        <div style={styles.userSection}>
          <div style={styles.userInfo}>
            <div style={styles.userAvatar}>
              {(user?.name || user?.email || "U").charAt(0).toUpperCase()}
            </div>
            <div style={styles.userDetails}>
              <div style={styles.userName}>{user?.name || "Usuário"}</div>
              <div style={styles.userEmail}>{user?.email || ""}</div>
            </div>
          </div>
          <div style={styles.userActions}>
            {isAdmin(user) && (
              <button style={styles.iconBtn} onClick={() => nav("/admin")} title="Admin Console">
                <IconSettings />
              </button>
            )}
            <button style={styles.iconBtn} onClick={logout} title="Sair">
              <IconLogout />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main style={styles.main}>
        {/* Messages */}
        <div style={styles.messagesContainer}>
          {messages.length === 0 ? (
            <div style={styles.emptyChat}>
              <h2 style={styles.emptyChatTitle}>Como posso ajudar?</h2>
              <p style={styles.emptyChatSubtitle}>
                Faça upload de documentos (PDF, DOCX) e pergunte sobre o conteúdo.
              </p>
            </div>
          ) : (
            messages.map(m => (
              <div
                key={m.id}
                style={{
                  ...styles.messageRow,
                  justifyContent: m.role === "user" ? "flex-end" : "flex-start",
                }}
              >
                <div
                  style={{
                    ...styles.messageBubble,
                    ...(m.role === "user" ? styles.userBubble : styles.assistantBubble),
                  }}
                >
                  {m.role === "assistant" ? (
                    <div style={styles.messageContent}>{renderRichText(m.content)}</div>
                  ) : (
                    <div style={styles.messageContent}>{m.content}</div>
                  )}
                  {m.role !== "user" && (m.agent_name || m.agent_id) ? (
                    <div style={{ ...styles.messageTime, opacity: 0.9 }}>{`Agente: ${m.agent_name || m.agent_id}`}</div>
                  ) : null}
                  <div style={styles.messageTime}>{formatDateTime(m.created_at)}</div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Upload Status */}
        {uploadStatus && (
          <div style={styles.uploadStatus}>{uploadStatus}</div>
        )}

        {/* Composer */}
        <div style={styles.composerContainer}>
          <div style={styles.composer}>
            <input
              type="file"
              ref={fileInputRef}
              onChange={doUpload}
              accept=".pdf,.docx,.doc,.txt,.md"
              style={{ display: "none" }}
            />
            <button
              style={styles.attachBtn}
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadProgress}
              title="Anexar arquivo (PDF, DOCX, TXT)"
            >
              <IconPaperclip />
            </button>
            
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite sua mensagem..."
              style={styles.textarea}
              rows={1}
              disabled={sending}
            />
            
            <button
                  className="ml-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={toggleMic}
                  disabled={!speechSupported}
                  title={!speechSupported ? "Navegador não suporta voz→texto" : "Voz para texto"}
                  aria-label="Microfone"
                >
                  {!speechSupported ? "🚫" : (listening ? "🎙️" : "🎤")}
                </button>

                <button
              style={{
                ...styles.sendBtn,
                opacity: (!text.trim() || sending) ? 0.5 : 1,
              }}
              onClick={send}
              disabled={!text.trim() || sending}
            >
              <IconSend />
            </button>
          </div>
          <div style={styles.composerHint}>
            <kbd style={styles.kbd}>Shift</kbd> + <kbd style={styles.kbd}>Enter</kbd> para nova linha
          </div>
        </div>
      </main>
    </div>
  );
}

// Styles
const styles = {
  container: {
    display: "flex",
    height: "100vh",
    background: "#0a0a0f",
    color: "#e5e5e5",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  
  // Sidebar
  sidebar: {
    width: "280px",
    borderRight: "1px solid rgba(255,255,255,0.08)",
    display: "flex",
    flexDirection: "column",
    background: "#0f0f14",
  },
  sidebarHeader: {
    padding: "16px",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
  },
  logoRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  logo: {
    height: "44px",
    width: "auto",
    display: "block",
  },
  logoText: {
    fontSize: "16px",
    fontWeight: "700",
    letterSpacing: "0.5px",
  },
  healthBadge: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "11px",
    color: "rgba(255,255,255,0.5)",
    marginTop: "2px",
  },
  healthDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
  },
  
  newChatBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    margin: "16px",
    padding: "12px",
    background: "linear-gradient(135deg, #7c5cff 0%, #35d0ff 100%)",
    color: "#000",
    border: "none",
    borderRadius: "12px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "opacity 0.2s",
  },
  
  agentSelector: {
    margin: "0 16px 12px",
    padding: "10px 12px",
    background: "rgba(255,255,255,0.05)",
    borderRadius: "10px",
  },
  agentLabel: {
    display: "block",
    fontSize: "11px",
    color: "rgba(255,255,255,0.5)",
    marginBottom: "6px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  agentSelect: {
    width: "100%",
    padding: "8px 10px",
    background: "rgba(0,0,0,0.3)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "8px",
    color: "#e5e5e5",
    fontSize: "13px",
    cursor: "pointer",
    outline: "none",
  },
  
  searchContainer: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    margin: "0 16px 16px",
    padding: "10px 12px",
    background: "rgba(255,255,255,0.05)",
    borderRadius: "10px",
    color: "rgba(255,255,255,0.4)",
  },
  searchInput: {
    flex: 1,
    background: "transparent",
    border: "none",
    outline: "none",
    color: "#e5e5e5",
    fontSize: "13px",
  },
  
  threadsList: {
    flex: 1,
    overflowY: "auto",
    padding: "0 8px",
  },
  emptyThreads: {
    padding: "20px",
    textAlign: "center",
    color: "rgba(255,255,255,0.3)",
    fontSize: "13px",
  },
  threadItem: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    width: "100%",
    padding: "12px",
    background: "transparent",
    border: "none",
    borderRadius: "10px",
    color: "rgba(255,255,255,0.7)",
    fontSize: "13px",
    cursor: "pointer",
    textAlign: "left",
    marginBottom: "4px",
    transition: "background 0.2s",
  },
  threadItemActive: {
    background: "rgba(255,255,255,0.1)",
    color: "#fff",
  },
  threadTitle: {
    flex: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  threadEditBtn: {
    border: "none",
    background: "transparent",
    color: "rgba(255,255,255,0.55)",
    padding: "4px",
    borderRadius: "8px",
    cursor: "pointer",
  },

  
  userSection: {
    padding: "16px",
    borderTop: "1px solid rgba(255,255,255,0.08)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  userInfo: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  userAvatar: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #7c5cff 0%, #35d0ff 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "14px",
    fontWeight: "600",
    color: "#000",
  },
  userDetails: {
    overflow: "hidden",
  },
  userName: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#fff",
  },
  userEmail: {
    fontSize: "11px",
    color: "rgba(255,255,255,0.4)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    maxWidth: "120px",
  },
  userActions: {
    display: "flex",
    gap: "4px",
  },
  iconBtn: {
    padding: "8px",
    background: "transparent",
    border: "none",
    borderRadius: "8px",
    color: "rgba(255,255,255,0.5)",
    cursor: "pointer",
    transition: "background 0.2s, color 0.2s",
  },
  
  // Main
  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    background: "#0a0a0f",
  },
  
  messagesContainer: {
    flex: 1,
    overflowY: "auto",
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  emptyChat: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: "40px",
  },
  emptyChatLogo: {
    width: "64px",
    height: "64px",
    borderRadius: "16px",
    marginBottom: "24px",
    opacity: 0.8,
  },
  emptyChatTitle: {
    fontSize: "24px",
    fontWeight: "600",
    color: "#fff",
    margin: "0 0 8px",
  },
  emptyChatSubtitle: {
    fontSize: "14px",
    color: "rgba(255,255,255,0.5)",
    maxWidth: "400px",
    lineHeight: "1.6",
  },
  
  messageRow: {
    display: "flex",
    width: "100%",
  },
  messageBubble: {
    maxWidth: "70%",
    padding: "14px 18px",
    borderRadius: "18px",
    position: "relative",
  },
  userBubble: {
    background: "linear-gradient(135deg, #7c5cff 0%, #6b4fd4 100%)",
    color: "#fff",
    borderBottomRightRadius: "4px",
  },
  assistantBubble: {
    background: "rgba(255,255,255,0.08)",
    color: "#e5e5e5",
    borderBottomLeftRadius: "4px",
  },
  messageContent: {
    fontSize: "14px",
    lineHeight: "1.6",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  richH1: { fontSize: "18px", fontWeight: 800, marginBottom: "6px" },
  richH2: { fontSize: "16px", fontWeight: 800, marginBottom: "6px" },
  richH3: { fontSize: "14px", fontWeight: 800, marginBottom: "6px" },
  richP: { lineHeight: 1.5, marginBottom: "6px" },
  richHr: { border: "none", borderTop: "1px solid rgba(255,255,255,0.12)", margin: "10px 0" },
  richList: { paddingLeft: "18px", margin: "6px 0 10px 0" },
  richListItem: { margin: "3px 0", lineHeight: 1.45 },

  messageTime: {
    fontSize: "10px",
    color: "rgba(255,255,255,0.4)",
    marginTop: "6px",
    textAlign: "right",
  },
  
  uploadStatus: {
    padding: "10px 24px",
    fontSize: "13px",
    color: "rgba(255,255,255,0.7)",
    background: "rgba(255,255,255,0.05)",
    borderTop: "1px solid rgba(255,255,255,0.08)",
  },
  
  // Composer
  composerContainer: {
    padding: "16px 24px 24px",
    borderTop: "1px solid rgba(255,255,255,0.08)",
  },
  composer: {
    display: "flex",
    alignItems: "flex-end",
    gap: "12px",
    padding: "12px 16px",
    background: "rgba(255,255,255,0.05)",
    borderRadius: "16px",
    border: "1px solid rgba(255,255,255,0.1)",
  },
  attachBtn: {
    padding: "10px",
    background: "transparent",
    border: "none",
    borderRadius: "10px",
    color: "rgba(255,255,255,0.5)",
    cursor: "pointer",
    transition: "background 0.2s, color 0.2s",
  },
  textarea: {
    flex: 1,
    background: "transparent",
    border: "none",
    outline: "none",
    color: "#e5e5e5",
    fontSize: "14px",
    lineHeight: "1.5",
    resize: "none",
    maxHeight: "200px",
    padding: "6px 0",
  },
  sendBtn: {
    padding: "10px",
    background: "linear-gradient(135deg, #7c5cff 0%, #35d0ff 100%)",
    border: "none",
    borderRadius: "10px",
    color: "#000",
    cursor: "pointer",
    transition: "opacity 0.2s",
  },
  composerHint: {
    marginTop: "8px",
    fontSize: "11px",
    color: "rgba(255,255,255,0.3)",
    textAlign: "center",
  },
  kbd: {
    display: "inline-block",
    padding: "2px 6px",
    background: "rgba(255,255,255,0.1)",
    borderRadius: "4px",
    fontSize: "10px",
  },
};