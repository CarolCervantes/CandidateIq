const express = require('express');
const cors = require('cors');
const path = require('path');
const nodemailer = require('nodemailer');
const twilio = require('twilio');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// -------------------------------------------------------------
// HELPER: ENVÍO DE CORREO VÍA BREVO API (300 CORREOS/DÍA GRATIS A CUALQUIER CORREO)
// -------------------------------------------------------------
async function sendWithBrevo({ to, candidateName, subject, text, html }) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) return null;

  const senderEmail = process.env.EMAIL_FROM_ADDRESS || 'candidateiq.seleccion@gmail.com';
  const senderName = process.env.EMAIL_FROM_NAME || 'CandidateIQ Selección';

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: [{ email: to, name: candidateName || 'Candidato' }],
      subject: subject,
      htmlContent: html || text
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || data.code || 'Error enviando correo con Brevo API');
  }
  return data;
}

// -------------------------------------------------------------
// HELPER: ENVÍO DE CORREO VÍA RESEND API
// -------------------------------------------------------------
async function sendWithResend({ to, subject, text, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;

  const from = process.env.EMAIL_FROM || 'CandidateIQ <onboarding@resend.dev>';

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
      text,
      html
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Error enviando correo con Resend API');
  }
  return data;
}

// -------------------------------------------------------------
// HELPER: TRANSPORTE DE CORREO (SMTP / NODEMAILER)
// -------------------------------------------------------------
function getEmailTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host: host,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user, pass }
    });
  }
  return null;
}

// -------------------------------------------------------------
// HELPER: CLIENTE DE WHATSAPP (TWILIO)
// -------------------------------------------------------------
function getTwilioClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (sid && token && sid.startsWith('AC')) {
    return twilio(sid, token);
  }
  return null;
}

// -------------------------------------------------------------
// ENDPOINT API: ENVIAR EMAIL (BREVO > RESEND > SMTP > SIMULACIÓN)
// -------------------------------------------------------------
app.post('/api/send-email', async (req, res) => {
  try {
    const { to, candidateName, subject, message } = req.body;

    if (!to || !message) {
      return res.status(400).json({ ok: false, error: 'Faltan parámetros requeridos (to, message).' });
    }

    let finalMessage = message;
    if (!finalMessage.trim().startsWith('Estimado(a) Candidato(a)')) {
      finalMessage = `Estimado(a) Candidato(a) ${candidateName || ''},\n\n${finalMessage}`;
    }

    const emailSubject = subject || `Invitación a Entrevista - CandidateIQ Proceso de Selección`;
    const htmlBody = `<div style="font-family: Arial, sans-serif; color: #1e293b; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <div style="background-color: #0f172a; color: #ffffff; padding: 16px; border-radius: 6px 6px 0 0; text-align: center;">
        <h2 style="margin: 0; font-size: 20px; font-weight: 600;">CandidateIQ</h2>
        <p style="margin: 4px 0 0 0; font-size: 12px; color: #94a3b8;">Sistema Inteligente de Selección</p>
      </div>
      <div style="padding: 24px; background-color: #ffffff;">
        ${finalMessage.split('\n\n').map(p => `<p style="margin-bottom: 14px;">${p.replace(/\n/g, '<br>')}</p>`).join('')}
      </div>
      <div style="background-color: #f8fafc; padding: 12px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
        Este es un correo automático enviado por CandidateIQ en nombre del equipo de selección.
      </div>
    </div>`;

    // 1. Intentar con BREVO API (Permite enviar a CUALQUIER correo destino gratis)
    if (process.env.BREVO_API_KEY) {
      const result = await sendWithBrevo({ to, candidateName, subject: emailSubject, text: finalMessage, html: htmlBody });
      return res.json({ ok: true, message: 'Correo enviado exitosamente a cualquier destino vía Brevo API.', messageId: result.messageId });
    }

    // 2. Intentar con RESEND API
    if (process.env.RESEND_API_KEY) {
      const result = await sendWithResend({ to, subject: emailSubject, text: finalMessage, html: htmlBody });
      return res.json({ ok: true, message: 'Correo enviado exitosamente vía Resend API.', id: result.id });
    }

    // 3. Intentar con SMTP
    const transporter = getEmailTransporter();
    if (transporter) {
      const fromAddress = process.env.EMAIL_FROM || 'CandidateIQ <no-reply@candidateiq.com>';
      const info = await transporter.sendMail({
        from: fromAddress,
        to,
        subject: emailSubject,
        text: finalMessage,
        html: htmlBody
      });
      return res.json({ ok: true, message: 'Correo enviado exitosamente vía SMTP.', messageId: info.messageId });
    }

    // 4. Simulación
    console.log(`[SIMULACIÓN EMAIL CandidateIQ] Hacia: ${to} | Asunto: ${emailSubject}`);
    return res.json({
      ok: true,
      simulated: true,
      message: `[Simulación] Correo preparado para ${to}. Configura BREVO_API_KEY en Render para envíos reales a cualquier correo.`
    });

  } catch (error) {
    console.error('Error enviando email:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// -------------------------------------------------------------
// ENDPOINT API: ENVIAR WHATSAPP
// -------------------------------------------------------------
app.post('/api/send-whatsapp', async (req, res) => {
  try {
    const { phone, candidateName, message } = req.body;

    if (!phone || !message) {
      return res.status(400).json({ ok: false, error: 'Faltan parámetros requeridos (phone, message).' });
    }

    let cleanPhone = phone.replace(/[^\d+]/g, '');
    if (!cleanPhone.startsWith('+')) {
      if (cleanPhone.length === 10 && cleanPhone.startsWith('3')) {
        cleanPhone = '+57' + cleanPhone;
      } else {
        cleanPhone = '+' + cleanPhone;
      }
    }

    let finalMessage = message;
    if (!finalMessage.trim().startsWith('Estimado(a) Candidato(a)')) {
      finalMessage = `Estimado(a) Candidato(a) ${candidateName || ''},\n\n${finalMessage}`;
    }

    const client = getTwilioClient();
    const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER || '+14155238886';

    if (client) {
      const response = await client.messages.create({
        from: `whatsapp:${fromNumber}`,
        to: `whatsapp:${cleanPhone}`,
        body: finalMessage
      });

      return res.json({ ok: true, message: 'Mensaje de WhatsApp enviado exitosamente vía Twilio.', sid: response.sid });
    } else {
      console.log(`[SIMULACIÓN WHATSAPP CandidateIQ] Hacia: ${cleanPhone}`);
      return res.json({
        ok: true,
        simulated: true,
        message: `[Simulación] Mensaje preparado para WhatsApp (${cleanPhone}). Configura TWILIO_ACCOUNT_SID en Render.`
      });
    }
  } catch (error) {
    console.error('Error enviando WhatsApp:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// -------------------------------------------------------------
// ENDPOINT MCP
// -------------------------------------------------------------
app.post('/api/mcp', async (req, res) => {
  const { jsonrpc, method, params, id } = req.body;

  if (jsonrpc !== '2.0') {
    return res.status(400).json({ jsonrpc: '2.0', error: { code: -32600, message: 'Invalid Request' }, id: id || null });
  }

  if (method === 'tools/list') {
    return res.json({
      jsonrpc: '2.0',
      id,
      result: {
        tools: [
          {
            name: 'send_candidate_email',
            description: 'Envía un correo a un candidato (vía Brevo, Resend o SMTP).',
            inputSchema: {
              type: 'object',
              properties: {
                to: { type: 'string' },
                candidateName: { type: 'string' },
                subject: { type: 'string' },
                message: { type: 'string' }
              },
              required: ['to', 'message']
            }
          },
          {
            name: 'send_candidate_whatsapp',
            description: 'Envía un mensaje por WhatsApp a un candidato (vía Twilio).',
            inputSchema: {
              type: 'object',
              properties: {
                phone: { type: 'string' },
                candidateName: { type: 'string' },
                message: { type: 'string' }
              },
              required: ['phone', 'message']
            }
          }
        ]
      }
    });
  }

  if (method === 'tools/call') {
    const { name, arguments: args } = params || {};

    if (name === 'send_candidate_email') {
      const { to, candidateName, subject, message } = args;
      let finalMessage = message || '';
      if (!finalMessage.trim().startsWith('Estimado(a) Candidato(a)')) {
        finalMessage = `Estimado(a) Candidato(a) ${candidateName || ''},\n\n${finalMessage}`;
      }

      if (process.env.BREVO_API_KEY) {
        try {
          const brevoResult = await sendWithBrevo({ to, candidateName, subject: subject || 'Invitación a Entrevista - CandidateIQ', text: finalMessage });
          return res.json({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: `Correo enviado a cualquier correo vía Brevo API (ID: ${brevoResult.messageId})` }] } });
        } catch (e) {
          return res.json({ jsonrpc: '2.0', id, result: { isError: true, content: [{ type: 'text', text: `Error Brevo: ${e.message}` }] } });
        }
      }

      if (process.env.RESEND_API_KEY) {
        try {
          const resendResult = await sendWithResend({ to, subject: subject || 'Invitación a Entrevista - CandidateIQ', text: finalMessage });
          return res.json({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: `Correo enviado exitosamente vía Resend API (ID: ${resendResult.id})` }] } });
        } catch (e) {
          return res.json({ jsonrpc: '2.0', id, result: { isError: true, content: [{ type: 'text', text: `Error Resend: ${e.message}` }] } });
        }
      }

      return res.json({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: `[MCP Simulación] Correo preparado para ${to}.` }] } });
    }

    if (name === 'send_candidate_whatsapp') {
      const { phone, candidateName, message } = args;
      const client = getTwilioClient();
      let finalMessage = message || '';
      if (!finalMessage.trim().startsWith('Estimado(a) Candidato(a)')) {
        finalMessage = `Estimado(a) Candidato(a) ${candidateName || ''},\n\n${finalMessage}`;
      }

      if (client) {
        try {
          const resp = await client.messages.create({
            from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER || '+14155238886'}`,
            to: `whatsapp:${phone}`,
            body: finalMessage
          });
          return res.json({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: `WhatsApp enviado con éxito. SID: ${resp.sid}` }] } });
        } catch (e) {
          return res.json({ jsonrpc: '2.0', id, result: { isError: true, content: [{ type: 'text', text: `Error enviando WhatsApp: ${e.message}` }] } });
        }
      } else {
        return res.json({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: `[MCP Simulación] WhatsApp para ${phone} preparado.` }] } });
      }
    }

    return res.status(404).json({ jsonrpc: '2.0', error: { code: -32601, message: 'Tool not found' }, id });
  }

  return res.status(400).json({ jsonrpc: '2.0', error: { code: -32601, message: 'Method not supported' }, id });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`  CandidateIQ - Plataforma en Ejecución (Soporte Brevo & Resend)`);
  console.log(`  Servidor Web: http://localhost:${PORT}`);
  console.log(`  Endpoint MCP: http://localhost:${PORT}/api/mcp`);
  console.log(`====================================================`);
});
