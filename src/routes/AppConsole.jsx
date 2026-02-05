import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, uploadFile, chat } from "../ui/api.js";
import { clearSession, getTenant, getToken, getUser, isAdmin } from "../lib/auth.js";

// Icons (inline SVG for zero dependencies)
const IconPlus = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const IconSend = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const IconPaperclip = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M21.44 11.05l-8.49 8.49a5 5 0 0 1-7.07-7.07l9.19-9.19a3.5 3.5 0 0 1 4.95 4.95l-9.19 9.19a2 2 0 0 1-2.83-2.83l8.49-8.49" />
  </svg>
);

const IconEdit = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
  </svg>
);

const IconLogout = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const IconSettings = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const IconMessage = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
  </svg>
);

function formatDateTime(ts) {
  if (!ts) return "";
  try {
    const d = new Date(ts * 1000);
    return d.toLocaleString("pt-BR", { hour12: false });
  } catch {
    return "";
  }
}

export default function AppConsole() {
  const nav = useNavigate();
  const [tenant, setTenant] = useState(getTenant() || "public");
  const [token, setToken] = useState(getToken());
  const [user, setUser] = useState(getUser());
  const [health, setHealth] = useState("checking");

  const [threads, setThreads] = useState([]);
  const [threadId, setThreadId] = useState("");
  const [messages, setMessages] = useState([]);
  const [agents, setAgents] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const [uploadStatus, setUploadStatus] = useState("");
  const [uploadProgress, setUploadProgress] = useState(false);
  const fileInputRef = useRef(null);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Speech (opcional)
  const [speechSupported] = useState(!!(window.SpeechRecognition || window.webkitSpeechRecognition));
  const speechRef = useRef(null);
  const [listening, setListening] = useState(false);

  useEffect(() => {
    const t = getToken();
    const u = getUser();
    setToken(t);
    setUser(u);
    if (!t) nav("/auth");
  }, []);

  useEffect(() => {
    async function checkHealth() {
      try {
        const res = await apiFetch("/api/health", { token, org: tenant });
        if (res) setHealth("ok");
      } catch {
        setHealth("down");
      }
    }
    checkHealth();
  }, [token, tenant]);

  function scrollToBottom() {
    try {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    } catch {}
  }

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load threads
  async function loadThreads() {
    try {
      const { data } = await apiFetch("/api/threads", { token, org: tenant });
      setThreads(data || []);
      if (!threadId && data?.[0]?.id) setThreadId(data[0].id);
    } catch (e) {
      console.error("loadThreads error:", e);
      // Se for 401, força re-login
      if ((e?.message || "").toLowerCase().includes("401")) {
        clearSession();
        nav("/auth");
      }
    }
  }

  // Rename thread (evita ReferenceError)
  async function renameThread(tid) {
    const t = threads.find((x) => x.id === tid);
    const current = t?.title || "Nova conversa";
    const next = prompt("Renomear conversa:", current);
    if (!next) return;
    try {
      await apiFetch(`/api/threads/${encodeURIComponent(tid)}`, {
        method: "PATCH",
        token,
        org: tenant,
        body: { title: next },
      });
      await loadThreads();
    } catch (e) {
      console.error("renameThread error:", e);
      alert(e?.message || "Falha ao renomear");
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
    } catch (e) {
      console.error("loadAgents error:", e);
    }
  }

  useEffect(() => {
    if (!token) return;
    loadThreads();
    loadAgents();
  }, [token, tenant]);

  useEffect(() => {
    if (!threadId) return;
    loadMessages(threadId);
  }, [threadId]);

  // Create new thread
  async function createThread() {
    try {
      const { data } = await apiFetch("/api/threads", {
        method: "POST",
        token,
        org: tenant,
        body: { title: "Nova conversa" },
      });
      if (data?.id) {
        await loadThreads();
        setThreadId(data.id);
      }
    } catch (e) {
      console.error("createThread error:", e);
      alert(e?.message || "Falha ao criar conversa");
    }
  }

  // Upload file (agent upload endpoint)
  async function doUpload(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    e.target.value = "";
    try {
      setUploadProgress(true);
      setUploadStatus("Enviando arquivo...");
      await uploadFile(f, { token, org: tenant, agentId: null, intent: "chat" });
      setUploadStatus("Arquivo enviado ✅");
      setTimeout(() => setUploadStatus(""), 1200);
    } catch (err) {
      console.error("upload error", err);
      setUploadStatus("Falha no upload.");
      setTimeout(() => setUploadStatus(""), 2000);
    } finally {
      setUploadProgress(false);
    }
  }

  function ensureSpeech() {
    if (!speechSupported) return null;
    if (speechRef.current) return speechRef.current;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return null;
    const rec = new SR();
    rec.lang = "pt-BR";
    rec.interimResults = true;
    rec.continuous = false;
    speechRef.current = rec;
    return rec;
  }

  function toggleMic() {
    const rec = ensureSpeech();
    if (!rec) return;
    if (listening) {
      try {
        rec.stop();
      } catch {}
      setListening(false);
      return;
    }
    let finalText = "";
    rec.onresult = (evt) => {
      let interim = "";
      for (let i = evt.resultIndex; i < evt.results.length; i++) {
        const transcript = evt.results[i][0].transcript;
        if (evt.results[i].isFinal) finalText += transcript;
        else interim += transcript;
      }
      setText((prev) => (finalText || interim || prev).trim());
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    setListening(true);
    try {
      rec.start();
    } catch {
      setListening(false);
    }
  }

  async function sendMessage() {
    const msg = (text || "").trim();
    if (!msg || sending) return;
    setSending(true);

    try {
      const userMsg = {
        id: `tmp-${Date.now()}`,
        role: "user",
        content: msg,
        created_at: Math.floor(Date.now() / 1000),
      };
      setMessages((prev) => [...prev, userMsg]);
      setText("");

      const resp = await chat({
        token,
        org: tenant,
        thread_id: threadId,
        message: msg,
        agent_id: null,
      });

      // resp.data or resp
      const data = resp?.data || resp;
      // Recarrega mensagens para garantir consistência
      await loadMessages(threadId);

      if (data?.thread_id && data.thread_id !== threadId) {
        setThreadId(data.thread_id);
        await loadThreads();
      }
    } catch (e) {
      console.error("sendMessage error:", e);
      alert(e?.message || "Falha ao enviar mensagem");
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function doLogout() {
    clearSession();
    nav("/auth");
  }

  const styles = {
    layout: {
      display: "flex",
      height: "100vh",
      background: "radial-gradient(1200px 700px at 30% -10%, rgba(124,92,255,0.25), transparent 60%), linear-gradient(180deg, #05060a, #03030a)",
      color: "#fff",
      fontFamily: "system-ui",
    },
    sidebar: {
      width: "320px",
      borderRight: "1px solid rgba(255,255,255,0.08)",
      display: "flex",
      flexDirection: "column",
      padding: "16px",
      gap: "12px",
    },
    brand: { fontSize: "18px", fontWeight: 800, letterSpacing: "-0.02em" },
    badge: {
      display: "inline-flex",
      alignItems: "center",
      gap: "8px",
      padding: "6px 10px",
      borderRadius: "999px",
      fontSize: "12px",
      border: "1px solid rgba(255,255,255,0.1)",
      background: "rgba(255,255,255,0.04)",
      color: "rgba(255,255,255,0.8)",
    },
    topRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" },
    newThreadBtn: {
      display: "inline-flex",
      alignItems: "center",
      gap: "8px",
      padding: "10px 12px",
      borderRadius: "14px",
      border: "1px solid rgba(255,255,255,0.1)",
      background: "rgba(255,255,255,0.05)",
      color: "#fff",
      cursor: "pointer",
    },
    threads: { flex: 1, overflowY: "auto", padding: "0 8px" },
    emptyThreads: { padding: "20px", textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: "13px" },
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
    threadItemActive: { background: "rgba(255,255,255,0.1)", color: "#fff" },
    threadTitle: { flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
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
      gap: "10px",
    },
    userInfo: { display: "flex", alignItems: "center", gap: "10px" },
    userAvatar: {
      width: "36px",
      height: "36px",
      borderRadius: "50%",
      background: "linear-gradient(135deg, #7c5cff 0%, #35d0ff 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: 800,
    },
    userDetails: { display: "flex", flexDirection: "column" },
    userName: { fontSize: "13px", fontWeight: 700 },
    userEmail: { fontSize: "12px", color: "rgba(255,255,255,0.55)" },
    userActions: { display: "flex", alignItems: "center", gap: "8px" },
    iconBtn: {
      width: "36px",
      height: "36px",
      borderRadius: "12px",
      border: "1px solid rgba(255,255,255,0.1)",
      background: "rgba(255,255,255,0.05)",
      color: "#fff",
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
    },

    main: { flex: 1, display: "flex", flexDirection: "column" },
    topbar: {
      padding: "16px 18px",
      borderBottom: "1px solid rgba(255,255,255,0.08)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "10px",
    },
    topbarLeft: { display: "flex", alignItems: "center", gap: "10px" },
    title: { fontSize: "16px", fontWeight: 900 },
    health: { fontSize: "12px", color: "rgba(255,255,255,0.6)" },
    chatArea: { flex: 1, overflowY: "auto", padding: "16px 18px" },
    messageRow: { display: "flex", marginBottom: "12px" },
    messageBubble: {
      maxWidth: "820px",
      padding: "12px 12px",
      borderRadius: "16px",
      border: "1px solid rgba(255,255,255,0.1)",
      background: "rgba(255,255,255,0.04)",
    },
    userBubble: { background: "rgba(124,92,255,0.12)", border: "1px solid rgba(124,92,255,0.25)" },
    assistantBubble: { background: "rgba(255,255,255,0.04)" },
    messageContent: { whiteSpace: "pre-wrap", lineHeight: 1.45, fontSize: "14px" },
    messageTime: { marginTop: "8px", fontSize: "11px", color: "rgba(255,255,255,0.55)" },

    uploadStatus: {
      padding: "10px 18px",
      fontSize: "13px",
      color: "rgba(255,255,255,0.85)",
      borderTop: "1px solid rgba(255,255,255,0.08)",
      background: "rgba(255,255,255,0.03)",
    },

    composerContainer: { padding: "14px 18px", borderTop: "1px solid rgba(255,255,255,0.08)" },
    composer: {
      display: "flex",
      alignItems: "flex-end",
      gap: "10px",
      padding: "10px",
      borderRadius: "18px",
      border: "1px solid rgba(255,255,255,0.12)",
      background: "rgba(255,255,255,0.04)",
    },
    attachBtn: {
      width: "42px",
      height: "42px",
      borderRadius: "14px",
      border: "1px solid rgba(255,255,255,0.1)",
      background: "rgba(255,255,255,0.05)",
      color: "#fff",
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      opacity: uploadProgress ? 0.6 : 1,
    },
    textarea: {
      flex: 1,
      minHeight: "42px",
      maxHeight: "180px",
      resize: "none",
      background: "transparent",
      border: "none",
      outline: "none",
      color: "#fff",
      fontSize: "14px",
      lineHeight: 1.4,
      padding: "10px 8px",
    },
    micBtn: {
      width: "42px",
      height: "42px",
      borderRadius: "14px",
      border: "1px solid rgba(255,255,255,0.1)",
      background: listening ? "rgba(53,208,255,0.15)" : "rgba(255,255,255,0.05)",
      color: "#fff",
      cursor: speechSupported ? "pointer" : "not-allowed",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      opacity: speechSupported ? 1 : 0.6,
    },
    sendBtn: {
      width: "42px",
      height: "42px",
      borderRadius: "14px",
      border: "1px solid rgba(255,255,255,0.1)",
      background: "rgba(255,255,255,0.05)",
      color: "#fff",
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      opacity: sending ? 0.6 : 1,
    },
  };

  return (
    <div style={styles.layout}>
      {/* Sidebar */}
      <div style={styles.sidebar}>
        <div style={styles.topRow}>
          <div>
            <div style={styles.brand}>Orkio</div>
            <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span style={styles.badge}>org: {tenant}</span>
              <span style={styles.badge}>{health === "ok" ? "ready" : health}</span>
            </div>
          </div>

          <button style={styles.newThreadBtn} onClick={createThread} title="Nova conversa">
            <IconPlus /> Novo
          </button>
        </div>

        <div style={styles.threads}>
          {threads.length === 0 ? (
            <div style={styles.emptyThreads}>Nenhuma conversa ainda.</div>
          ) : (
            threads.map((t) => (
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
                  onClick={(e) => {
                    e.stopPropagation();
                    renameThread(t.id);
                  }}
                  title="Renomear conversa"
                >
                  <IconEdit />
                </button>
              </button>
            ))
          )}
        </div>

        <div style={styles.userSection}>
          <div style={styles.userInfo}>
            <div style={styles.userAvatar}>{(user?.name || user?.email || "U").charAt(0).toUpperCase()}</div>
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
            <button style={styles.iconBtn} onClick={doLogout} title="Sair">
              <IconLogout />
            </button>
          </div>
        </div>
      </div>

      {/* Main */}
      <div style={styles.main}>
        <div style={styles.topbar}>
          <div style={styles.topbarLeft}>
            <div style={styles.title}>{threads.find((t) => t.id === threadId)?.title || "Conversa"}</div>
            <div style={styles.health}>@Team / @Orkio / @Chris / @Orion</div>
          </div>
        </div>

        {/* Messages */}
        <div style={styles.chatArea}>
          {messages.length === 0 ? (
            <div style={{ color: "rgba(255,255,255,0.55)", fontSize: "14px", padding: "8px" }}>
              Nenhuma mensagem ainda. Você pode chamar múltiplos agentes com <b>@Team</b>.
            </div>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                style={{
                  ...styles.messageRow,
                  justifyContent: m.role === "user" ? "flex-end" : "flex-start",
                }}
              >
                <div style={{ ...styles.messageBubble, ...(m.role === "user" ? styles.userBubble : styles.assistantBubble) }}>
                  {/* Texto puro (sem renderRichText) para evitar crash */}
                  <div style={styles.messageContent}>{m.content}</div>

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

        {/* Upload status */}
        {uploadStatus ? <div style={styles.uploadStatus}>{uploadStatus}</div> : null}

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

            <button style={styles.micBtn} onClick={toggleMic} disabled={!speechSupported} title="Ditado por voz">
              🎙️
            </button>

            <button style={styles.sendBtn} onClick={sendMessage} disabled={sending} title="Enviar">
              <IconSend />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

