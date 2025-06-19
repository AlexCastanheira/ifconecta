import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"
import readline from "readline"

const prisma = new PrismaClient()

// Criar interface para leitura de input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
})

// Função para perguntar
const question = (query) => new Promise((resolve) => rl.question(query, resolve))

// Função principal
async function createAdmin() {
    try {
        console.log("=== Criação de Usuário Administrador ===")

        const name = await question("Nome: ")
        const email = await question("Email: ")
        const password = await question("Senha: ")

        // Verificar se o email já está em uso
        const existingUser = await prisma.user.findUnique({
            where: { email },
        })

        if (existingUser) {
            console.log("Este email já está em uso.")
            rl.close()
            return
        }

        // Hash da senha
        const hashedPassword = await bcrypt.hash(password, 10)

        // Criar usuário admin
        const admin = await prisma.user.create({
            data: {
                name: "ifconecta",
                email: "ifconecta@ifconecta.com.br",
                password: hashedPassword,
                type: "ADMIN",
                status: "ACTIVE",
                profile: "Administrador do sistema IFConecta"

            },
        })

        console.log(`Administrador criado com sucesso! ID: ${admin.id}`)

        // Registrar log de criação
        await prisma.adminLog.create({
            data: {
                adminId: admin.id,
                action: "ADMIN_CREATED",
            },
        })
    } catch (error) {
        console.error("Erro ao criar administrador:", error)
    } finally {
        rl.close()
        await prisma.$disconnect()
    }
}

// Executar função
createAdmin()
