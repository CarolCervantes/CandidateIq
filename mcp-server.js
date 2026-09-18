#!/usr/bin/env node
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const nodemailer = require('nodemailer');
const twilio = require('twilio');
require('dotenv').config();

const server = new Server(
  {
    name: 'candidateiq-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Definición de Herramientas
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'send_email',
        description: 'Envía un correo electrónico formal a un candidato en el proceso CandidateIQ.',
        inputSchema: {
          type: 'object',
          properties: {
            to: { type: 'string', description: 'Dirección de correo electrónico del destinatario' },
            candidateName: { type: 'string', description: 'Nombre completo del candidato' },
            subject: { type: 'string', description: 'Asunto del correo' },
            message: { type: 'string', description: 'Cuerpo del correo (inicia con Estimado(a) Candidato(a)...)' }
          },
          required: ['to', 'message']
        }
      },
      {
        name: 'send_whatsapp',
        description: 'Envía una notificación por WhatsApp al candidato.',
        inputSchema: {
          type: 'object',
          properties: {
            phone: { type: 'string', description: 'Número telefónico en formato internacional (+57...)' },
            candidateName: { type: 'string', description: 'Nombre del candidato' },
            message: { type: 'string', description: 'Cuerpo del mensaje a enviar' }
          },
          required: ['phone', 'message']
        }
      }
    ]
  };
});

// Ejecución de Herramientas
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'send_email') {
    const { to, candidateName, subject, message } = args;
    let finalMessage = message || '';
    if (!finalMessage.trim().startsWith('Estimado(a) Candidato(a)')) {
      finalMessage = `Estimado(a) Candidato(a) ${candidateName || ''},\n\n${finalMessage}`;
    }

    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (host && user && pass) {
      try {
        const transporter = nodemailer.createTransport({
          host,
          port: parseInt(process.env.SMTP_PORT || '587', 10),
          auth: { user, pass }
        });

        await transporter.sendMail({
          from: process.env.EMAIL_FROM || 'CandidateIQ <no-reply@candidateiq.com>',
          to,
          subject: subject || 'Invitación a Entrevista - CandidateIQ',
          text: finalMessage
        });

        return { content: [{ type: 'text', text: `✓ Correo enviado exitosamente a ${to}` }] };
      } catch (err) {
        return { isError: true, content: [{ type: 'text', text: `Error en envío de correo: ${err.message}` }] };
      }
    } else {
      return { content: [{ type: 'text', text: `[CandidateIQ MCP] Correo para ${to} preparado. Configura las variables SMTP para realizar envíos reales.` }] };
    }
  }

  if (name === 'send_whatsapp') {
    const { phone, candidateName, message } = args;
    let finalMessage = message || '';
    if (!finalMessage.trim().startsWith('Estimado(a) Candidato(a)')) {
      finalMessage = `Estimado(a) Candidato(a) ${candidateName || ''},\n\n${finalMessage}`;
    }

    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;

    if (sid && token && sid.startsWith('AC')) {
      try {
        const client = twilio(sid, token);
        const resp = await client.messages.create({
          from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER || '+14155238886'}`,
          to: `whatsapp:${phone.startsWith('+') ? phone : '+' + phone}`,
          body: finalMessage
        });

        return { content: [{ type: 'text', text: `✓ WhatsApp enviado exitosamente a ${phone}. SID: ${resp.sid}` }] };
      } catch (err) {
        return { isError: true, content: [{ type: 'text', text: `Error enviando WhatsApp: ${err.message}` }] };
      }
    } else {
      return { content: [{ type: 'text', text: `[CandidateIQ MCP] Mensaje WhatsApp para ${phone} preparado. Configura Twilio para envíos reales.` }] };
    }
  }

  throw new Error(`Herramienta no encontrada: ${name}`);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Servidor CandidateIQ MCP iniciado vía stdio.');
}

main().catch((err) => {
  console.error('Error fatal iniciando CandidateIQ MCP:', err);
  process.exit(1);
});
