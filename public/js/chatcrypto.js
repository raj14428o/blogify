console.log("✅ chatCrypto.js loaded");

document.addEventListener("DOMContentLoaded", () => {

  console.log("encryptMessage type:", typeof window.encryptMessage);

  // -------------------------------
  // MESSAGE STATES
  // -------------------------------
  const MESSAGE_STATE = {
    PENDING: "pending",
    SENT: "sent",
  };

  async function sendMessage(text) {
    const messageId = crypto.randomUUID();

    renderMessage({
      id: messageId,
      text,
      sender: "me",
      state: MESSAGE_STATE.PENDING,
      timestamp: Date.now(),
    });

    if (!window.sharedSecret) {
      console.log("⏳ No shared key yet → pending");
      return;
    }

    const { ciphertext, nonce } = await window.encryptMessage(
      text,
      window.sharedSecret
    );

    window.appSocket.emit("send-message", {
      roomId: window.roomId,
      messageId,
      ciphertext,
      nonce,
    });

    updateMessageState(messageId, MESSAGE_STATE.SENT);
  }

  window.appSocket.on("receive-message", async (data) => {
    if (!window.sharedSecret) return;

    const text = await window.decryptMessage(
      data.ciphertext,
      data.nonce,
      window.sharedSecret
    );

    renderMessage({
      id: data.messageId,
      text,
      sender: "them",
      state: MESSAGE_STATE.SENT,
      timestamp: Date.now(),
    });
  });

  // -------------------------------
  // UI WIRING
  // -------------------------------
  const sendBtn = document.getElementById("sendBtn");
  const input = document.getElementById("messageInput");

  if (sendBtn && input) {
    sendBtn.addEventListener("click", () => {
      const text = input.value.trim();
      if (!text) return;
      sendMessage(text);
      input.value = "";
    });

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") sendBtn.click();
    });
  }

  function renderMessage(msg) {
    const chat = document.getElementById("chatMessages");
    if (!chat) return;

    const empty = chat.querySelector(".chat-empty");
    if (empty) empty.remove();

    const div = document.createElement("div");
    div.className = `message ${msg.sender}`;
    div.dataset.id = msg.id;

    div.innerHTML = `
      <div class="bubble">
        <span class="text">${msg.text}</span>
        <span class="state">${msg.state === "pending" ? "⏳" : "✓"}</span>
      </div>
    `;

    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
  }

  function updateMessageState(id, state) {
    const el = document.querySelector(
      `.message[data-id="${id}"] .state`
    );
    if (el) el.textContent = state === "sent" ? "✓" : "⏳";
  }

});
