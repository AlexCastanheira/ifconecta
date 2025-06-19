document.addEventListener("DOMContentLoaded", () => {
    // Botões para alternar status do usuário (bloquear/desbloquear)
    const toggleStatusButtons = document.querySelectorAll(".toggle-status-btn")
    toggleStatusButtons.forEach((button) => {
        button.addEventListener("click", function () {
            const userId = this.dataset.id
            const newStatus = this.dataset.status === "true"
            const action = newStatus ? "desbloquear" : "bloquear"

            if (confirm(`Tem certeza que deseja ${action} este usuário?`)) {
                fetch(`/admin/users/${userId}/toggle-status`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ status: newStatus }),
                })
                    .then((response) => response.json())
                    .then((data) => {
                        if (data.success) {
                            window.location.reload()
                        } else {
                            alert(`Erro ao ${action} usuário: ${data.error}`)
                        }
                    })
                    .catch((error) => {
                        console.error("Erro:", error)
                        alert(`Erro ao ${action} usuário. Tente novamente.`)
                    })
            }
        })
    })

    // Botões para excluir usuário
    const deleteUserButtons = document.querySelectorAll(".delete-user-btn")
    deleteUserButtons.forEach((button) => {
        button.addEventListener("click", function () {
            const userId = this.dataset.id

            if (
                confirm("ATENÇÃO: Esta ação é irreversível. Tem certeza que deseja excluir este usuário e todos os seus dados?")
            ) {
                fetch(`/admin/users/${userId}`, {
                    method: "DELETE",
                })
                    .then((response) => response.json())
                    .then((data) => {
                        if (data.success) {
                            window.location.reload()
                        } else {
                            alert(`Erro ao excluir usuário: ${data.error}`)
                        }
                    })
                    .catch((error) => {
                        console.error("Erro:", error)
                        alert("Erro ao excluir usuário. Tente novamente.")
                    })
            }
        })
    })

    // Botões para aprovar empregador
    const approveButtons = document.querySelectorAll(".approve-employer-btn")
    approveButtons.forEach((button) => {
        button.addEventListener("click", function () {
            const employerId = this.dataset.id

            if (confirm("Tem certeza que deseja aprovar este empregador?")) {
                fetch(`/admin/employers/${employerId}/approve`, {
                    method: "POST",
                })
                    .then((response) => {
                        if (response.ok) {
                            window.location.reload()
                        } else {
                            alert("Erro ao aprovar empregador. Tente novamente.")
                        }
                    })
                    .catch((error) => {
                        console.error("Erro:", error)
                        alert("Erro ao aprovar empregador. Tente novamente.")
                    })
            }
        })
    })

    // Botões para rejeitar empregador
    const rejectButtons = document.querySelectorAll(".reject-employer-btn")
    rejectButtons.forEach((button) => {
        button.addEventListener("click", function () {
            const employerId = this.dataset.id

            if (
                confirm(
                    "ATENÇÃO: Esta ação é irreversível. Tem certeza que deseja rejeitar este empregador? O usuário será excluído do sistema.",
                )
            ) {
                fetch(`/admin/employers/${employerId}/reject`, {
                    method: "POST",
                })
                    .then((response) => {
                        if (response.ok) {
                            window.location.reload()
                        } else {
                            alert("Erro ao rejeitar empregador. Tente novamente.")
                        }
                    })
                    .catch((error) => {
                        console.error("Erro:", error)
                        alert("Erro ao rejeitar empregador. Tente novamente.")
                    })
            }
        })
    })

    // Botões para excluir vaga
    const deleteJobButtons = document.querySelectorAll(".delete-job-btn")
    deleteJobButtons.forEach((button) => {
        button.addEventListener("click", function () {
            const jobId = this.dataset.id

            if (confirm("ATENÇÃO: Esta ação é irreversível. Tem certeza que deseja excluir esta vaga?")) {
                fetch(`/admin/jobs/${jobId}`, {
                    method: "DELETE",
                })
                    .then((response) => response.json())
                    .then((data) => {
                        if (data.success) {
                            window.location.reload()
                        } else {
                            alert(`Erro ao excluir vaga: ${data.error}`)
                        }
                    })
                    .catch((error) => {
                        console.error("Erro:", error)
                        alert("Erro ao excluir vaga. Tente novamente.")
                    })
            }
        })
    })
})
