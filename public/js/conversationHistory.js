async function loadConversationHistory() {
  console.log("🚀 loadConversationHistory called");

  const res = await fetch("/messages/conversations", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    headers: { Accept: "application/json" },
  });

  const { conversations } = await res.json();
  console.log("📦 conversations data:", conversations);

  const history = document.getElementById("conversationHistory");
  const empty = document.getElementById("chatEmpty");

  if (!history || !empty) return;

  if (!conversations || conversations.length === 0) {
    empty.classList.remove("hidden");
    history.classList.add("hidden");
    return;
  }

  empty.classList.add("hidden");
  history.classList.remove("hidden");
  history.innerHTML = "";

  conversations.forEach((c) => {
    const other = c.members.find(
      (m) => m._id !== window.myUserId
    );

    if (!other) return;

    const unread = c.unreadCount?.[window.myUserId] || 0;

    const lastText = c.lastMessage?.text || "";
    const lastTime = c.lastMessageAt
      ? new Date(c.lastMessageAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "";

    const div = document.createElement("div");
    div.className = "user-item";

   
    div.dataset.roomId = c.roomId;

    div.onclick = () => openChat(other._id);

    div.innerHTML = `
      <img class="avatar" src="${other.profileImageUrl}" />

      <div class="conversation-main">
        <div class="conversation-top">
          <span class="name">${other.fullName}</span>
          <span class="time">${lastTime}</span>
        </div>

        <div class="conversation-bottom">
          <span class="preview">
            ${
              lastText.length > 35
                ? lastText.slice(0, 35) + "…"
                : lastText
            }
          </span>
          ${
            unread
              ? `<span class="badge">${unread}</span>`
              : ""
          }
        </div>
      </div>
    `;

    if (unread) div.classList.add("unread");

    history.appendChild(div);
  });
}

loadConversationHistory();

