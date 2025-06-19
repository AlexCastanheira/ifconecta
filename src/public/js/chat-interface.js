document.addEventListener("DOMContentLoaded", () => {
    const chatPanel = document.getElementById("chat-panel");
    const chatsListPanel = document.querySelector(".chat-list-panel");
    const searchInput = document.getElementById("chat-search-input");
    const chatItems = document.querySelectorAll(".chat-item");
    let messagesContainer = document.getElementById("chat-messages");
    let messageForm = document.getElementById("message-form");
    let messageContent = document.getElementById("message-content");
    let closeChatBtn = document.getElementById("close-chat-btn");
    let reactivateChatBtn = document.getElementById("reactivate-chat-btn");
    let backToListBtn = null;

    let selectedChatId = window.selectedChatId || null;
    const currentUserId = window.currentUserId || null;

    console.log("Chat interface initialized", { selectedChatId, currentUserId });

    async function loadMessages(chatId) {
        if (!chatId || !messagesContainer) {
            // Adicionado log se messagesContainer for nulo aqui também
            if (!messagesContainer) console.error("messagesContainer é NULO no início de loadMessages para chatId:", chatId);
            return;
        }
        console.log("Loading messages for chat", chatId);
        try {
            const response = await fetch(`/chat/api/${chatId}/messages`);
            if (response.ok) {
                const messages = await response.json();
                console.log("Mensagens recebidas do servidor:", messages);
                renderMessages(messages);
            } else {
                console.error("Error loading messages", response.status);
                messagesContainer.innerHTML = '<div class="error-message">Erro ao carregar mensagens.</div>';
            }
        } catch (error) {
            console.error("Error loading messages:", error);
            messagesContainer.innerHTML = '<div class="error-message">Erro ao carregar mensagens.</div>';
        }
    }

    function renderMessages(messages) {
        if (!messagesContainer) {
            console.error("messagesContainer é NULO em renderMessages!");
            return;
        }
        console.log("Renderizando mensagens em:", messagesContainer, "Total:", messages.length);

        // Limpa o contêiner de mensagens, exceto se for a mensagem "Nenhuma mensagem..."
        // ou "Carregando mensagens..." que são substituídas naturalmente.
        const noMessagesElement = messagesContainer.querySelector(".no-messages");
        const loadingMessagesElement = messagesContainer.querySelector(".loading-messages");

        if (!noMessagesElement && !loadingMessagesElement && messagesContainer.firstChild) {
            messagesContainer.innerHTML = ""; // Limpa apenas se não for placeholder
        } else if ((noMessagesElement || loadingMessagesElement) && messages.length > 0) {
            messagesContainer.innerHTML = ""; // Limpa placeholders se novas mensagens chegarem
        }


        if (!messages || messages.length === 0) {
            if (!noMessagesElement) { // Evita adicionar múltiplas vezes
                messagesContainer.innerHTML = '<div class="no-messages">Nenhuma mensagem ainda. Inicie a conversa!</div>';
            }
            return;
        }

        messages.forEach((message) => {
            const isCurrentUser = message.senderId === currentUserId;
            const messageDiv = document.createElement("div");

            // <<< ALTERAÇÃO AQUI: Usar "chat-bubble" em vez de "message" >>>
            if (message.isSystemMessage) {
                messageDiv.className = "chat-bubble system-message"; // Alterado de "message"
                messageDiv.innerHTML = `
                    <div class="message-content">${message.content}</div>
                    <div class="message-meta">
                        <span class="message-time">${new Date(message.createdAt).toLocaleTimeString()}</span>
                    </div>`;
            } else {
                messageDiv.className = `chat-bubble ${isCurrentUser ? "message-sent" : "message-received"}`; // Alterado de "message"
                messageDiv.innerHTML = `
                    <div class="message-content">${message.content}</div>
                    <div class="message-meta">
                        <span class="message-time">${new Date(message.createdAt).toLocaleTimeString()}</span>
                        ${isCurrentUser ? `<span class="message-status">${message.read ? "Lida" : "Enviada"}</span>` : ""}
                    </div>`;
            }
            console.log("Elemento HTML da mensagem a ser adicionado:", messageDiv.outerHTML);
            console.log("Objeto Message:", message);
            messagesContainer.appendChild(messageDiv);
        });
        console.log("Conteúdo final do messagesContainer:", messagesContainer.innerHTML);
        console.log("Número de 'div.chat-bubble' filhos em messagesContainer:", messagesContainer.querySelectorAll("div.chat-bubble").length);


        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    async function sendMessage(content) {
        if (!selectedChatId) return;
        console.log("Sending message", { chatId: selectedChatId, content });
        try {
            const response = await fetch(`/chat/api/${selectedChatId}/messages`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content }),
            });
            if (response.ok) {
                const message = await response.json();
                console.log("Message sent successfully", message);

                if (!messagesContainer) {
                    console.error("messagesContainer é NULO ao tentar adicionar mensagem enviada!");
                    return;
                }

                // Remove a mensagem "Nenhuma mensagem..." se ela existir
                const noMessagesEl = messagesContainer.querySelector(".no-messages");
                if (noMessagesEl) {
                    noMessagesEl.remove();
                }

                const messageDiv = document.createElement("div");
                // <<< ALTERAÇÃO AQUI: Usar "chat-bubble" >>>
                messageDiv.className = "chat-bubble message-sent"; // Alterado de "message"
                messageDiv.innerHTML = `
                    <div class="message-content">${message.content}</div>
                    <div class="message-meta">
                        <span class="message-time">${new Date(message.createdAt).toLocaleTimeString()}</span>
                        <span class="message-status">Enviada</span>
                    </div>`;
                messagesContainer.appendChild(messageDiv);
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
                updateChatPreview(selectedChatId, content);
            } else {
                const error = await response.json();
                console.error("Error sending message", error);
                alert(`Erro: ${error.message}`);
            }
        } catch (error) {
            console.error("Error sending message:", error);
            alert("Ocorreu um erro ao enviar a mensagem.");
        }
    }

    function updateChatPreview(chatId, content) {
        const chatItem = document.querySelector(`.chat-item[data-chat-id="${chatId}"]`);
        if (chatItem) {
            const lastMessage = chatItem.querySelector(".chat-last-message");
            if (lastMessage) {
                lastMessage.textContent = content.length > 50 ? content.substring(0, 50) + "..." : content;
            }
            const chatTime = chatItem.querySelector(".chat-time");
            if (chatTime) {
                chatTime.textContent = new Date().toLocaleDateString();
            }
            const chatsList = chatItem.parentElement;
            if (chatsList && chatsList.firstChild !== chatItem) { // Evita mover se já for o primeiro
                chatsList.insertBefore(chatItem, chatsList.firstChild);
            }
        }
    }

    async function closeChat() {
        if (!selectedChatId) return;
        if (!confirm("Tem certeza que deseja encerrar este chat?")) return;
        console.log("Closing chat", selectedChatId);
        try {
            const response = await fetch(`/chat/api/${selectedChatId}/close`, { method: "POST" });
            if (response.ok) {
                console.log("Chat closed successfully");
                alert("Chat encerrado com sucesso!");
                window.location.reload();
            } else {
                const error = await response.json();
                console.error("Error closing chat", error);
                alert(`Erro: ${error.message}`);
            }
        } catch (error) {
            console.error("Error closing chat:", error);
            alert("Ocorreu um erro ao encerrar o chat.");
        }
    }

    async function reactivateChat() {
        if (!selectedChatId) return;
        if (!confirm("Tem certeza que deseja reativar este chat?")) return;
        console.log("Reactivating chat", selectedChatId);
        try {
            const response = await fetch(`/chat/api/${selectedChatId}/reactivate`, { method: "POST" });
            if (response.ok) {
                console.log("Chat reactivated successfully");
                alert("Chat reativado com sucesso!");
                window.location.reload();
            } else {
                const error = await response.json();
                console.error("Error reactivating chat", error);
                alert(`Erro: ${error.message}`);
            }
        } catch (error) {
            console.error("Error reactivating chat:", error);
            alert("Ocorreu um erro ao reativar o chat.");
        }
    }

    function filterChats(query) {
        const normalizedQuery = query.toLowerCase().trim();
        chatItems.forEach((item) => {
            const userName = item.querySelector("h3").textContent.toLowerCase();
            const jobTitleElement = item.querySelector(".chat-job-title");
            const jobTitle = jobTitleElement ? jobTitleElement.textContent.toLowerCase() : '';
            const lastMessage = item.querySelector(".chat-last-message").textContent.toLowerCase();
            if (userName.includes(normalizedQuery) || jobTitle.includes(normalizedQuery) || lastMessage.includes(normalizedQuery)) {
                item.style.display = "flex";
            } else {
                item.style.display = "none";
            }
        });
    }

    if (searchInput) {
        searchInput.addEventListener("input", (e) => filterChats(e.target.value));
    }

    chatItems.forEach((item) => {
        item.addEventListener("click", () => {
            chatItems.forEach((i) => i.classList.remove("active"));
            item.classList.add("active");
            selectedChatId = item.dataset.chatId;
            console.log("Chat selected", selectedChatId);
            loadChatContent(item.dataset.chatUrl);
            item.classList.remove("unread");
            const unreadCount = item.querySelector(".chat-unread-count");
            if (unreadCount) unreadCount.remove();
            history.pushState({}, "", `/chat/interface?chatId=${selectedChatId}`);
            handleResponsiveLayout();
        });
    });

    async function loadChatContent(url) {
        console.log("Loading chat content from URL:", url);
        if (!chatPanel) {
            console.error("chatPanel é NULO em loadChatContent!");
            return;
        }
        try {
            const response = await fetch(`${url}?ajax=true`);
            console.log("Response status for chat content:", response.status);
            if (response.ok) {
                const html = await response.text();
                console.log("Chat content HTML (primeiros 100 chars):", html.substring(0, 100) + "...");
                chatPanel.innerHTML = html;

                messagesContainer = document.getElementById("chat-messages");
                messageForm = document.getElementById("message-form");
                messageContent = document.getElementById("message-content");
                closeChatBtn = document.getElementById("close-chat-btn");
                reactivateChatBtn = document.getElementById("reactivate-chat-btn");
                backToListBtn = document.getElementById("back-to-list-btn");

                console.log("Chat elements reinitialized", {
                    messagesContainer: !!messagesContainer,
                    messageForm: !!messageForm,
                    messageContent: !!messageContent,
                    closeChatBtn: !!closeChatBtn,
                    reactivateChatBtn: !!reactivateChatBtn,
                    backToListBtn: !!backToListBtn,
                });

                if (messageForm) messageForm.addEventListener("submit", handleMessageSubmit);
                if (closeChatBtn) closeChatBtn.addEventListener("click", closeChat);
                if (reactivateChatBtn) reactivateChatBtn.addEventListener("click", reactivateChat);
                if (backToListBtn) {
                    backToListBtn.addEventListener("click", () => {
                        selectedChatId = null;
                        // Limpar o conteúdo do chatPanel para mostrar "Selecione um chat..."
                        chatPanel.innerHTML = `
                            <div class="no-chat-selected">
                                <div class="no-chat-content">
                                    <i class="fas fa-comments"></i>
                                    <h2>Selecione um chat para começar</h2>
                                    <p>Escolha uma conversa na lista à esquerda para visualizar as mensagens.</p>
                                </div>
                            </div>`;
                        history.pushState({}, "", "/chat/interface");
                        // Desativar todos os chat-items
                        chatItems.forEach(item => item.classList.remove("active"));
                        handleResponsiveLayout();
                    });
                }
                loadMessages(selectedChatId);
            } else {
                console.error("Error loading chat content, status:", response.status);
                chatPanel.innerHTML = '<div class="error-message">Erro ao carregar chat. Tente selecionar novamente.</div>';
            }
        } catch (error) {
            console.error("Error loading chat content:", error);
            chatPanel.innerHTML = '<div class="error-message">Erro ao carregar chat. Tente selecionar novamente.</div>';
        }
    }

    function handleMessageSubmit(e) {
        e.preventDefault();
        if (!messageContent) return;
        const content = messageContent.value.trim();
        if (!content) return;
        sendMessage(content);
        messageContent.value = "";
    }

    if (messageForm) messageForm.addEventListener("submit", handleMessageSubmit);
    if (closeChatBtn) closeChatBtn.addEventListener("click", closeChat);
    if (reactivateChatBtn) reactivateChatBtn.addEventListener("click", reactivateChat);

    if (selectedChatId) {
        console.log("Loading initial messages for chat (selectedChatId existe):", selectedChatId);
        // Marca o item de chat correto como ativo na lista
        const activeChatItem = document.querySelector(`.chat-item[data-chat-id="${selectedChatId}"]`);
        if (activeChatItem) {
            activeChatItem.classList.add('active');
            // Remove unread status se aplicável
            activeChatItem.classList.remove("unread");
            const unreadCount = activeChatItem.querySelector(".chat-unread-count");
            if (unreadCount) unreadCount.remove();
        }
        // O conteúdo já é renderizado pelo EJS no servidor se selectedChatId existir.
        // Apenas precisamos garantir que as variáveis JS estejam corretas.
        // A chamada loadMessages já será feita se o chatContent for renderizado pelo servidor
        // porque messagesContainer será encontrado no DOM inicial.
        if (messagesContainer) { // Se chatContent foi renderizado pelo servidor
            loadMessages(selectedChatId);
        }

    } else {
        // Se nenhum chat está selecionado, o chatPanel mostra a mensagem "Selecione um chat..."
        // que é o comportamento padrão do chatInterface.ejs
        if (chatPanel) {
            chatPanel.innerHTML = `
                <div class="no-chat-selected">
                    <div class="no-chat-content">
                        <i class="fas fa-comments"></i>
                        <h2>Selecione um chat para começar</h2>
                        <p>Escolha uma conversa na lista à esquerda para visualizar as mensagens.</p>
                    </div>
                </div>`;
        }
    }

    // O polling de mensagens só deve ocorrer se um chat estiver ativo e o painel de mensagens visível.
    let messagePollingInterval = null;

    function startMessagePolling() {
        if (messagePollingInterval) clearInterval(messagePollingInterval); // Limpa intervalo anterior
        if (selectedChatId && messagesContainer) {
            messagePollingInterval = setInterval(() => {
                // Verifica se o messagesContainer ainda está no DOM e pertence ao chat selecionado
                // (uma checagem extra, já que o conteúdo é carregado dinamicamente)
                const currentMessagesContainer = document.getElementById("chat-messages");
                if (selectedChatId && currentMessagesContainer) {
                    console.log("Polling for messages for chat:", selectedChatId);
                    loadMessages(selectedChatId);
                } else {
                    stopMessagePolling();
                }
            }, 5000);
        }
    }

    function stopMessagePolling() {
        if (messagePollingInterval) {
            clearInterval(messagePollingInterval);
            messagePollingInterval = null;
            console.log("Message polling stopped.");
        }
    }

    // Inicia o polling se um chat estiver selecionado no carregamento
    if (selectedChatId) startMessagePolling();

    // Ajusta o polling quando um chat é selecionado ou deselecionado
    chatItems.forEach((item) => {
        item.addEventListener("click", () => {
            // selectedChatId é atualizado dentro do handler de click
            stopMessagePolling(); // Para o polling do chat anterior
            if (selectedChatId) startMessagePolling(); // Inicia para o novo
        });
    });
    if (backToListBtn) { // Parar o polling quando volta para a lista
        backToListBtn.addEventListener("click", stopMessagePolling);
    }


    function handleResponsiveLayout() {
        const isMobile = window.innerWidth < 768;
        if (!chatsListPanel || !chatPanel) return;

        if (isMobile) {
            if (selectedChatId) {
                chatsListPanel.classList.add('hidden-on-mobile');
                chatPanel.classList.remove('hidden-on-mobile');
            } else {
                chatsListPanel.classList.remove('hidden-on-mobile');
                chatPanel.classList.add('hidden-on-mobile');
            }
        } else {
            chatsListPanel.classList.remove('hidden-on-mobile');
            chatPanel.classList.remove('hidden-on-mobile');
        }
    }

    handleResponsiveLayout();
    window.addEventListener("resize", handleResponsiveLayout);

    // Se nenhum chat estiver selecionado no início e for mobile, garantir que a lista seja mostrada
    if (!selectedChatId && window.innerWidth < 768) {
        if (chatsListPanel) chatsListPanel.classList.remove('hidden-on-mobile');
        if (chatPanel) chatPanel.classList.add('hidden-on-mobile');
    }
});
