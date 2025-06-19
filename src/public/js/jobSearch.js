document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('jobSearchInput');
    const contractTypeFilter = document.getElementById('contractTypeFilter');
    const requirementFilter = document.getElementById('requirementFilter');

    const jobCards = document.querySelectorAll('.job-card');

    function filterJobs() {
        const query = (searchInput?.value || '').toLowerCase();
        const selectedContract = contractTypeFilter?.value || '';
        const selectedRequirement = requirementFilter?.value || '';

        jobCards.forEach(card => {
            const title = (card.dataset.title || '').toLowerCase();
            const description = (card.dataset.description || '').toLowerCase();
            const contractType = (card.dataset.contracttype || '').toLowerCase();
            const requirements = (card.dataset.requirements || '').toLowerCase();

            const matchesKeyword = query === '' ||
                title.includes(query) ||
                description.includes(query) ||
                contractType.includes(query) ||
                requirements.includes(query);

            const matchesContract = selectedContract === '' || contractType === selectedContract;
            const matchesRequirement = selectedRequirement === '' || requirements.includes(selectedRequirement);

            card.style.display = (matchesKeyword && matchesContract && matchesRequirement) ? 'block' : 'none';
        });
    }

    if (searchInput) searchInput.addEventListener('input', filterJobs);
    if (contractTypeFilter) contractTypeFilter.addEventListener('change', filterJobs);
    if (requirementFilter) requirementFilter.addEventListener('change', filterJobs);
});
