// Arquivo principal de JavaScript para o frontend

document.addEventListener("DOMContentLoaded", () => {
  // Aqui você pode adicionar código para manipular o menu mobile
  // e outras funcionalidades do frontend
  console.log("Main.js carregado com sucesso!")
})

// Função para validar formulários
function validateForm(formId) {
  const form = document.getElementById(formId)
  if (!form) return true

  let isValid = true

  // Validar campos obrigatórios
  const requiredFields = form.querySelectorAll("[required]")
  requiredFields.forEach((field) => {
    if (!field.value.trim()) {
      isValid = false
      field.classList.add("error")
    } else {
      field.classList.remove("error")
    }
  })

  // Validar e-mail
  const emailField = form.querySelector('input[type="email"]')
  if (emailField && emailField.value) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(emailField.value)) {
      isValid = false
      emailField.classList.add("error")
    }
  }

  return isValid
}

// Função para mostrar mensagens de erro ou sucesso
function showMessage(message, type = "error") {
  const messageDiv = document.createElement("div")
  messageDiv.className = `message ${type}-message`
  messageDiv.textContent = message

  document.body.appendChild(messageDiv)

  setTimeout(() => {
    messageDiv.classList.add("show")
  }, 10)

  setTimeout(() => {
    messageDiv.classList.remove("show")
    setTimeout(() => {
      document.body.removeChild(messageDiv)
    }, 300)
  }, 3000)
}
