
function generateUUID() {
  if (window.crypto && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // fallback (RFC4122 v4)
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
}

// ------------------------------------------------
// MESSAGE STATES
// ------------------------------------------------
const MESSAGE_STATE = {
  PENDING: "pending",
  SENT: "sent",
  SEEN: "seen",
};

window.appSocket.on("messages-seen", ({ roomId, seenBy }) => {
  if (roomId !== window.roomId) return;
  if (seenBy === window.myUserId) return;

  document
    .querySelectorAll(".message.me")
    .forEach(msg => {
      updateMessageState(msg.dataset.id, MESSAGE_STATE.SEEN);
    });
});

function updateMessageState(messageId, newState) {
  const message = document.querySelector(
    `.message[data-id="${messageId}"]`
  );
  if (!message) return;

  // only sent messages have state
  if (!message.classList.contains("me")) return;

  const stateEl = message.querySelector(".state");
  if (!stateEl) return;

  if (newState === MESSAGE_STATE.PENDING) {
    stateEl.textContent = "⏳";
  } else if (newState === MESSAGE_STATE.SENT) {
    stateEl.textContent = "✓";
  } else if (newState === MESSAGE_STATE.SEEN) {
    stateEl.textContent = "✓✓";
  }
}


document.addEventListener("DOMContentLoaded", async () => {

  // ------------------------------------------------
  // HARD GATE
  // ------------------------------------------------
  if (!window.messagingReady) {
    console.error("messagingReady promise not found");
    return;
  }

  await window.messagingReady;

  const myUserId = window.myUserId;
  const roomId = window.roomId;

  if (!roomId || !myUserId) {
    console.error("roomId or myUserId missing");
    return;
  }

  // ------------------------------------------------
  // LOAD MESSAGE HISTORY
  // ------------------------------------------------
  async function loadMessages() {
    const res = await fetch(`/messages/${roomId}`);
    if (!res.ok) {
      console.error("Failed to load messages");
      return;
    }

    const encryptedMessages = await res.json();

    for (const msg of encryptedMessages) {
      try {
        const text = await window.decryptMessage(
          msg.ciphertext,
          msg.nonce,
          window.sharedSecret
        );

        renderMessage({
          id: msg._id,
          text,
          sender: msg.sender === myUserId ? "me" : "them",
          state: msg.readAt ? MESSAGE_STATE.SEEN : MESSAGE_STATE.SENT,
          timestamp: msg.createdAt,
        });

      } catch (err) {
        console.error(" Failed to decrypt message", err);
      }
    }
  }

  await loadMessages();

 

  // ------------------------------------------------
  // SAFETY CHECKS
  // ------------------------------------------------
  if (!window.appSocket) {
    console.error("appSocket not found");
    return;
  }

  if (typeof window.encryptMessage !== "function" ||
    typeof window.decryptMessage !== "function") {
    console.error("crypto helpers missing");
    return;
  }


  // ------------------------------------------------
  // SEND MESSAGE
  // ------------------------------------------------
  async function sendMessage(text) {
    if (!text) return;

  const tempId = generateUUID();


    renderMessage({
      id: tempId,
      text,
      sender: "me",
      state: MESSAGE_STATE.PENDING,
      timestamp: Date.now(),
    });

    await window.messagingReady;

    try {
      const { ciphertext, nonce } =
        await window.encryptMessage(text, window.sharedSecret);

      window.appSocket.emit("send-message", {
        roomId,
        ciphertext,
        nonce,
      });

      updateMessageState(tempId, MESSAGE_STATE.SENT);
    } catch (err) {
      console.error("Send failed:", err);
    }
  }

  // ------------------------------------------------
  // RECEIVE MESSAGE
  // ------------------------------------------------
  window.appSocket.on("receive-message", async (data) => {
    if (!data || data.roomId !== roomId) return;

    if (data.sender === myUserId) return;
    
   
    try {
      const text = await window.decryptMessage(
        data.ciphertext,
        data.nonce,
        window.sharedSecret
      );

      renderMessage({
        id: data._id,
        text,
        sender: data.sender === myUserId ? "me" : "them",
        state: data.readAt ? MESSAGE_STATE.SEEN : MESSAGE_STATE.SENT,
        timestamp: data.createdAt || Date.now(),
      });

    } catch (err) {
      console.error("Decryption failed:", err);
    }
  });

  // ------------------------------------------------
  // UI WIRING
  // ------------------------------------------------
  const sendBtn = document.getElementById("sendBtn");
  const input = document.getElementById("messageInput");

  if (!sendBtn || !input) {
    console.warn("Chat input elements missing");
    return;
  }

  sendBtn.addEventListener("click", () => {
    const text = input.value.trim();
    if (!text) return;
    sendMessage(text);
    input.value = "";
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendBtn.click();
    }
  });

  // ------------------------------------------------
  // UI HELPERS
  // ------------------------------------------------
  function formatTime(ts) {
    const d = new Date(ts);
    return d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getDateLabel(ts) {
    const d = new Date(ts);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const isSameDay = (a, b) =>
      a.getDate() === b.getDate() &&
      a.getMonth() === b.getMonth() &&
      a.getFullYear() === b.getFullYear();

    if (isSameDay(d, today)) return "Today";
    if (isSameDay(d, yesterday)) return "Yesterday";

    return d.toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  let lastRenderedDate = null;

  function renderDateSeparator(label) {
    const chat = document.getElementById("chatMessages");
    if (!chat) return;

    const sep = document.createElement("div");
    sep.className = "date-separator";
    sep.textContent = label;

    chat.appendChild(sep);
  }

  function renderMessage(msg) {
    const chat = document.getElementById("chatMessages");
    if (!chat) return;

    const empty = chat.querySelector(".chat-empty");
    if (empty) empty.remove();

    // Date separator logic

    function renderDateSeparator(label) {
      const chat = document.getElementById("chatMessages");
      if (!chat) return;

      const sep = document.createElement("div");
      sep.className = "date-separator";
      sep.textContent = label;

      chat.appendChild(sep);
    }


    const div = document.createElement("div");
    div.className = `message ${msg.sender}`;
    div.dataset.id = msg.id;

    const showState = msg.sender === "me";

    div.innerHTML = `
  <div class="bubble">
    <span class="text"></span>
    <div class="meta">
      <span class="time">${formatTime(msg.timestamp)}</span>
      ${showState
        ? `<span class="state">${msg.state === MESSAGE_STATE.PENDING
          ? "⏳"
          : msg.state === MESSAGE_STATE.SEEN
            ? "✓✓"
            : "✓"
        }</span>`
        : ""
      }
    </div>
  </div>
`;
    div.querySelector(".text").textContent = msg.text;
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
  }
});

