// src/scripts/seed-badges.js
import dotenv from 'dotenv'
dotenv.config({ path: new URL('../../.env', import.meta.url) })
import prisma from "../config/prismaClient.js"

async function seedBadges() {
  const badges = [
    { name: "JavaScript", description: "Linguagem de programação JavaScript", category: "programming" }, // Adicionado category
    { name: "HTML", description: "Linguagem de marcação HTML", category: "frontend" },
    { name: "CSS", description: "Folhas de estilo em cascata", category: "frontend" },
    { name: "React", description: "Biblioteca JavaScript para construção de interfaces", category: "frontend" },
    { name: "Node.js", description: "Ambiente de execução JavaScript server-side", category: "backend" },
    { name: "Python", description: "Linguagem de programação Python", category: "programming" },
    { name: "Java", description: "Linguagem de programação Java", category: "programming" },
    { name: "PHP", description: "Linguagem de programação PHP", category: "programming" },
    { name: "SQL", description: "Linguagem de consulta estruturada", category: "database" },
    { name: "Git", description: "Sistema de controle de versão", category: "devops" },
    { name: "Docker", description: "Plataforma de containerização", category: "devops" },
    { name: "AWS", description: "Amazon Web Services", category: "devops" },
    { name: "TypeScript", description: "Superset tipado do JavaScript", category: "programming" },
    { name: "Angular", description: "Framework JavaScript para construção de aplicações web", category: "frontend" },
    { name: "Vue.js", description: "Framework JavaScript progressivo", category: "frontend" },
    { name: "C#", description: "Linguagem de programação C#", category: "programming" },
    { name: "Ruby", description: "Linguagem de programação Ruby", category: "programming" },
    { name: "Swift", description: "Linguagem de programação Swift", category: "programming" },
    { name: "Kotlin", description: "Linguagem de programação Kotlin", category: "programming" },
    { name: "MongoDB", description: "Banco de dados NoSQL", category: "database" },
  ]

  console.log("Iniciando seed de badges...")

  for (const badge of badges) {
    const existingBadge = await prisma.badge.findUnique({
      where: { name: badge.name },
    })

    if (!existingBadge) {
      await prisma.badge.create({
        data: badge,
      })
      console.log(`Badge criado: ${badge.name} (${badge.category})`)
    } else {
      // Opcional: Atualizar a categoria se a badge já existe
      if (existingBadge.category !== badge.category) {
        await prisma.badge.update({
          where: { id: existingBadge.id },
          data: { category: badge.category }
        });
        console.log(`Badge atualizada: ${badge.name} - Categoria para ${badge.category}`);
      } else {
        console.log(`Badge já existe: ${badge.name}`);
      }
    }
  }

  console.log("Seed de badges concluído!")
}

// Executar o seed
seedBadges()
  .catch((e) => {
    console.error("Erro durante o seed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })