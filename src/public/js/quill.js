// src/public/js/quill.js
const quillInstances = {}; // Objeto para armazenar as instâncias do Quill por ID

document.addEventListener("DOMContentLoaded", function () {
    const editorElements = document.querySelectorAll('.quill-editor');

    editorElements.forEach(editorElement => {
        editorElement.style.display = 'none';

        const quillContainer = document.createElement('div');
        // Garante que o container tenha um ID único para o Quill
        // Se o textarea original já tem um ID, usamos ele para o container.
        const containerId = editorElement.id ? editorElement.id + '-quill-editor' : `quill-editor-${Math.random().toString(36).substr(2, 9)}`;
        quillContainer.id = containerId;
        quillContainer.classList.add('quill-textarea');
        editorElement.parentNode.insertBefore(quillContainer, editorElement);

        const quill = new Quill(quillContainer, {
            theme: 'snow',
            modules: {
                toolbar: [
                    [{ header: [1, 2, 3, false] }],
                    ['bold', 'italic', 'underline', 'strike'],
                    ['blockquote', 'code-block'],
                    [{ list: 'ordered' }, { list: 'bullet' }],
                    ['link', 'clean']
                ]
            }
        });

        // Define o conteúdo inicial do Quill com o valor do textarea.
        quill.root.innerHTML = editorElement.value;

        // Armazena a instância do Quill
        quillInstances[editorElement.id] = quill;

        // Ao submeter o formulário, atualiza o textarea original com o conteúdo HTML do Quill.
        const form = editorElement.closest('form');
        if (form) {
            form.addEventListener('submit', () => {
                editorElement.value = quill.root.innerHTML;
            });
        }
    });
});

// Exporta as instâncias para que outros scripts possam acessá-las
// Isso é útil para casos onde o script de submissão do formulário precisa pegar o conteúdo diretamente.
window.quillInstances = quillInstances;