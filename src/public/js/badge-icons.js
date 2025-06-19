// Mapeamento de badges para ícones
const badgeIcons = {
    // Linguagens de programação
    JavaScript: "code",
    TypeScript: "braces",
    Python: "code-2",
    Java: "coffee",
    PHP: "file-code",
    "C#": "hash",
    Ruby: "gem",
    Swift: "swift",
    Kotlin: "code",

    // Frontend
    HTML: "code",
    CSS: "palette",
    React: "atom",
    Angular: "circle-dot",
    "Vue.js": "layers",

    // Backend
    "Node.js": "server",
    Express: "server",
    Django: "server",
    Flask: "flask-conical",

    // Banco de dados
    SQL: "database",
    MongoDB: "database",
    PostgreSQL: "database",
    MySQL: "database",

    // DevOps
    Git: "git-branch",
    Docker: "container",
    AWS: "cloud",
    Azure: "cloud",
    "Google Cloud": "cloud",

    // Padrão para badges sem ícone específico
    default: "code",
}

// Função para obter o ícone de uma badge
function getBadgeIcon(badgeName) {
    return badgeIcons[badgeName] || badgeIcons.default
}
