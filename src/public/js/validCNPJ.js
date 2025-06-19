document.addEventListener('DOMContentLoaded', () => {
    // Referências aos elementos - AGORA ELES DEVEM EXISTIR NO REGISTER.EJS
    const consultCnpjButton = document.getElementById('btn-consultar-cnpj');
    const cnpjInput = document.getElementById('cnpj');
    const resultDiv = document.getElementById('cnpj-result');
    const typeInput = document.getElementById('type'); // Referência ao input hidden
    const cnpjGroup = document.getElementById('cnpj-group');
    const tabs = document.querySelectorAll('.tab'); // Referência às abas

    // Função para atualizar a visibilidade do CNPJ e obrigatoriedade
    function updateCnpjVisibility() {
        if (!typeInput || !cnpjGroup || !cnpjInput) {
            console.warn("updateCnpjVisibility: Elementos de tipo de usuário ou CNPJ não encontrados.");
            return;
        }

        const selectedType = typeInput.value.toLowerCase();
        if (selectedType === 'employer') {
            cnpjGroup.classList.remove('hidden');
            cnpjInput.required = true;
        } else {
            cnpjGroup.classList.add('hidden');
            cnpjInput.required = false;
        }
    }

    // Lógica do botão de consultar CNPJ
    if (consultCnpjButton && cnpjInput && resultDiv) {
        consultCnpjButton.addEventListener('click', async () => {
            const cnpj = cnpjInput.value.replace(/\D/g, '');

            if (!cnpj || cnpj.length !== 14) {
                resultDiv.textContent = 'Digite um CNPJ válido (14 dígitos).';
                resultDiv.style.color = 'red';
                return;
            }

            resultDiv.textContent = 'Consultando CNPJ...';
            resultDiv.style.color = 'blue';

            try {
                // A BrasilAPI às vezes bloqueia IPs de servidores sem User-Agent.
                // No frontend, o navegador envia um User-Agent por padrão.
                const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ message: 'Erro desconhecido.' }));
                    const errorMessage = errorData.message || `Erro: Status ${response.status}.`;
                    throw new Error(errorMessage);
                }
                const data = await response.json();
                resultDiv.textContent = `Razão Social: ${data.razao_social || data.nome || 'não disponível'}`;
                resultDiv.style.color = 'green';

            } catch (error) {
                resultDiv.textContent = 'Erro ao consultar CNPJ: ' + error.message;
                resultDiv.style.color = 'red';
                console.error("Erro no validCNPJ.js (frontend):", error);
            }
        });
    } else {
        console.warn("validCNPJ.js: Botão de consulta CNPJ ou campos relacionados não encontrados.");
    }

    // Lógica para atualizar a visibilidade do CNPJ e obrigatoriedade baseada nas abas
    if (tabs.length > 0 && typeInput && cnpjGroup && cnpjInput) {
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                updateCnpjVisibility(); // Chama a função para atualizar a visibilidade
            });
        });
        updateCnpjVisibility(); // Chamar no carregamento inicial para definir o estado correto
    } else {
        console.warn("validCNPJ.js: Abas de tipo de usuário ou campos relacionados não encontrados. A visibilidade do CNPJ pode não ser atualizada.");
    }
});