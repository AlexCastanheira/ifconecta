// src/public/js/jobSearch.js

document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('jobSearchInput');
    const contractTypeFilter = document.getElementById('contractTypeFilter');
    const requirementFilter = document.getElementById('requirementFilter');
    const limitPerPageSelect = document.getElementById('limitPerPage');

    // Função para construir a URL com todos os parâmetros
    function buildUrl() {
        const urlParams = new URLSearchParams(window.location.search);

        const query = searchInput?.value || '';
        const selectedContract = contractTypeFilter?.value || '';
        const selectedRequirement = requirementFilter?.value || '';
        const currentLimit = limitPerPageSelect?.value || '10';

        // Resetar a página para 1 se a pesquisa ou filtros mudarem
        const oldQuery = urlParams.get('search') || '';
        const oldContract = urlParams.get('contractType') || '';
        const oldRequirement = urlParams.get('requirement') || '';
        const oldLimit = urlParams.get('limit') || '10';

        let newPage = urlParams.get('page') || '1'; // Manter a página atual por padrão
        if (query !== oldQuery || selectedContract !== oldContract || selectedRequirement !== oldRequirement || currentLimit !== oldLimit) {
            newPage = '1'; // Reinicia a paginação se algum filtro/pesquisa mudar
        }

        const params = new URLSearchParams();
        if (query) params.set('search', query);
        if (selectedContract) params.set('contractType', selectedContract);
        if (selectedRequirement) params.set('requirement', selectedRequirement);
        params.set('limit', currentLimit);
        params.set('page', newPage);

        // Manter o filtro de aba (open, closed, applied, all)
        const currentFilter = urlParams.get('filter');
        if (currentFilter) {
            params.set('filter', currentFilter);
        }

        window.location.href = `/jobs/list?${params.toString()}`;
    }

    if (searchInput) {
        // Dispara a busca ao pressionar Enter
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                buildUrl();
            }
        });
        // Dispara a busca ao limpar o campo ou ao sair dele (melhor para UX)
        searchInput.addEventListener('change', buildUrl);
    }
    if (contractTypeFilter) contractTypeFilter.addEventListener('change', buildUrl);
    if (requirementFilter) requirementFilter.addEventListener('change', buildUrl);
    if (limitPerPageSelect) limitPerPageSelect.addEventListener('change', buildUrl);

    // Adicionar listener para os botões de paginação (se eles existirem no EJS)
    document.querySelectorAll('.pagination-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = e.target.dataset.page;
            const urlParams = new URLSearchParams(window.location.search);
            urlParams.set('page', page);
            window.location.href = `/jobs/list?${urlParams.toString()}`;
        });
    });

    // Função para carregar os filtros e pesquisa da URL ao carregar a página
    function loadFiltersFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        if (searchInput) searchInput.value = urlParams.get('search') || '';
        if (contractTypeFilter) contractTypeFilter.value = urlParams.get('contractType') || '';
        if (requirementFilter) requirementFilter.value = urlParams.get('requirement') || '';
        if (limitPerPageSelect) limitPerPageSelect.value = urlParams.get('limit') || '10';
    }

    loadFiltersFromUrl(); // Chamar ao carregar a página
});