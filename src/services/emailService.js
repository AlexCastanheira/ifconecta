import nodemailer from "nodemailer"

// Criar o transportador de e-mail
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number.parseInt(process.env.EMAIL_PORT),
    secure: process.env.EMAIL_SECURE === "true",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  })
}

// Templates de e-mail
const emailTemplates = {
  // Template para redefinição de senha
  passwordReset: (token, userId) => {
    const resetUrl = `${process.env.BASE_URL}/auth/reset-password/${userId}/${token}`

    return `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
    <div style="text-align: center; margin-bottom: 20px;">
      <h1 style="margin: 0;">
        <span style="color: green;">IF</span>
        <span style="color: red;">(</span>
        <span style="color: green;">Conecta</span>
        <span style="color: red;">)</span>
      </h1>
    </div>
    <h2 style="color: #333; text-align: center;">Redefinição de Senha</h2>
    <p style="color: #666; line-height: 1.5;">Você solicitou a redefinição de sua senha no IF Conecta. Clique no botão abaixo para criar uma nova senha:</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${resetUrl}" style="
        background-color: #4CAF50;
        color: white;
        padding: 12px 24px;
        text-decoration: none;
        border-radius: 5px;
        font-weight: bold;
        display: inline-block;
        font-size: 16px;
      ">Redefinir Senha</a>
    </div>
    <p style="color: #666; line-height: 1.5;">Se você não solicitou esta redefinição, ignore este e-mail e sua senha permanecerá inalterada.</p>
    <p style="color: #666; line-height: 1.5;">Este link expirará em 1 hora por motivos de segurança.</p>
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #999; font-size: 12px; text-align: center;">
      <p>Este é um e-mail automático, por favor não responda.</p>
      <p>&copy; ${new Date().getFullYear()} IF Conecta - Todos os direitos reservados</p>
    </div>
  </div>
`
  }
  ,

  // Template para notificação de nova vaga
  newJob: (job) => {
    const jobUrl = `${process.env.BASE_URL}/jobs/${job.id}`

    return `
       <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
    <div style="text-align: center; margin-bottom: 20px;">
      <h1 style="margin: 0;">
        <span style="color: green;">IF</span>
        <span style="color: red;">(</span>
        <span style="color: green;">Conecta</span>
        <span style="color: red;">)</span>
      </h1>
    </div>
        <h2 style="color: #333; text-align: center;">Nova Vaga Disponível</h2>
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #4CAF50; margin-top: 0;">${job.title}</h3>
          <p style="color: #666; line-height: 1.5;">${job.description.substring(0, 150)}${job.description.length > 150 ? "..." : ""}</p>
          <p style="color: #666;"><strong>Tipo de Contrato:</strong> ${job.contractType}</p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${jobUrl}" style="background-color: #4CAF50; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Ver Detalhes da Vaga</a>
        </div>
        <p style="color: #666; line-height: 1.5;">Você está recebendo este e-mail porque optou por receber notificações sobre novas vagas no IF Conecta.</p>
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #999; font-size: 12px; text-align: center;">
          <p>Para deixar de receber estes e-mails, acesse suas <a href="${process.env.BASE_URL}/users/email-preferences" style="color: #4CAF50; text-decoration: none;">configurações de e-mail</a>.</p>
          <p>&copy; ${new Date().getFullYear()} IF Conecta - Todos os direitos reservados</p>
        </div>
      </div>
    `
  },

  // Template para notificação de nova mensagem
  newMessage: (senderName, chatId) => {
    const chatUrl = `${process.env.BASE_URL}/chat/interface?chatId=${chatId}`

    return `
       <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
    <div style="text-align: center; margin-bottom: 20px;">
      <h1 style="margin: 0;">
        <span style="color: green;">IF</span>
        <span style="color: red;">(</span>
        <span style="color: green;">Conecta</span>
        <span style="color: red;">)</span>
      </h1>
    </div>
        <h2 style="color: #333; text-align: center;">Nova Mensagem Recebida</h2>
        <p style="color: #666; line-height: 1.5;">Você recebeu uma nova mensagem de <strong>${senderName}</strong> no IF Conecta.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${chatUrl}" style="background-color: #4CAF50; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Ver Mensagem</a>
        </div>
        <p style="color: #666; line-height: 1.5;">Você está recebendo este e-mail porque optou por receber notificações sobre novas mensagens no IF Conecta.</p>
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #999; font-size: 12px; text-align: center;">
          <p>Para deixar de receber estes e-mails, acesse suas <a href="${process.env.BASE_URL}/users/email-preferences" style="color: #4CAF50; text-decoration: none;">configurações de e-mail</a>.</p>
          <p>&copy; ${new Date().getFullYear()} IF Conecta - Todos os direitos reservados</p>
        </div>
      </div>
    `
  },

  // Template para notificação de nova candidatura
  newApplication: (jobTitle, applicantName, jobId) => {
    const jobUrl = `${process.env.BASE_URL}/jobs/${jobId}`
    return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="margin: 0;">
            <span style="color: green;">IF</span><span style="color: red;">(</span><span style="color: green;">Conecta</span><span style="color: red;">)</span>
          </h1>
        </div>
        <h2 style="color: #333; text-align: center;">Nova Candidatura Recebida</h2>
        <p style="color: #666; line-height: 1.5;">${applicantName} se candidatou à vaga <strong>${jobTitle}</strong>.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${jobUrl}" style="background-color: #4CAF50; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Ver Vaga</a>
        </div>
        <p style="color: #666; line-height: 1.5;">Você está recebendo este e-mail porque optou por notificações de novas candidaturas.</p>
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #999; font-size: 12px; text-align: center;">
          <p>Para alterar suas preferências, acesse suas <a href="${process.env.BASE_URL}/users/email-preferences" style="color: #4CAF50;">configurações de e-mail</a>.</p>
          <p>&copy; ${new Date().getFullYear()} IF Conecta - Todos os direitos reservados</p>
        </div>
    </div>`
  },
  // NOVO: Template para confirmação de cadastro de estudante (usando 'token' que será o resetToken)
 emailConfirmation: (token, userId, userName) => {
        const confirmationUrl = `${process.env.BASE_URL}/auth/confirm-email/${userId}/${token}`;

        return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
            <div style="text-align: center; margin-bottom: 20px;">
                <h1 style="margin: 0;">
                    <span style="color: green;">IF</span>
                    <span style="color: red;">(</span>
                    <span style="color: green;">Conecta</span>
                    <span style="color: red;">)</span>
                </h1>
            </div>
            <h2 style="color: #333; text-align: center;">Confirme seu E-mail no IF Conecta</h2>
            <p style="color: #666; line-height: 1.5;">Olá ${userName},</p>
            <p style="color: #666; line-height: 1.5;">Obrigado por se registrar no IF Conecta! Para ativar sua conta e começar a explorar as oportunidades, por favor, clique no botão abaixo:</p>
            <div style="text-align: center; margin: 30px 0;">
                <table border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                    <tr>
                        <td align="center" bgcolor="#2ecc71" style="border-radius: 5px;">
                            <a href="${confirmationUrl}" target="_blank" style="
                                font-family: Arial, sans-serif;
                                color: #ffffff;
                                text-decoration: none;
                                padding: 12px 24px;
                                border-radius: 5px;
                                font-weight: bold;
                                display: inline-block; /* Mantém, mas o table é mais robusto */
                                font-size: 16px;
                                mso-padding-alt: 0px; /* Para Outlook */
                            ">Confirmar E-mail</a>
                        </td>
                    </tr>
                </table>
            </div>
            <p style="color: #666; line-height: 1.5;">Se você não se registrou no IF Conecta, por favor, ignore este e-mail.</p>
            <p style="color: #666; line-height: 1.5;">Este link de confirmação é válido por 24 horas.</p>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #999; font-size: 12px; text-align: center;">
                <p>Este é um e-mail automático, por favor não responda.</p>
                <p>&copy; ${new Date().getFullYear()} IF Conecta - Todos os direitos reservados</p>
            </div>
        </div>
        `;
    }
}



// Função para enviar e-mail
const sendEmail = async (to, subject, html) => {
  try {
    const transporter = createTransporter()

    const mailOptions = {
      from: process.env.EMAIL_FROM || `"IF Conecta" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    }

    const info = await transporter.sendMail(mailOptions)
    console.log(`E-mail enviado: ${info.messageId}`)
    return info
  } catch (error) {
    console.error("Erro ao enviar e-mail:", error)
    throw error
  }
}

export { sendEmail, emailTemplates }
