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
// HELPER: TRANSPORTE DE CORREO (NODEMAILER)
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
// ENDPOINT API: ENVIAR EMAIL
// -------------------------------------------------------------
app.post('/api/send-email', async (req, res) => {
  try {
    const { to, candidateName, subject, message } = req.body;

    if (!to || !message) {
      return res.status(400).json({ ok: false, error: 'Faltan parámetros requeridos (to, message).' });
    }

    // Aseguramos que el cuerpo inicie con "Estimado(a) Candidato(a)"
    let finalMessage = message;
    if (!finalMessage.trim().startsWith('Estimado(a) Candidato(a)')) {
      finalMessage = `Estimado(a) Candidato(a) ${candidateName || ''},\n\n${finalMessage}`;
    }

    const transporter = getEmailTransporter();
    const fromAddress = process.env.EMAIL_FROM || 'CandidateIQ <no-reply@candidateiq.com>';
    const emailSubject = subject || `Invitación a Entrevista - CandidateIQ Proceso de Selección`;

    if (transporter) {
      const info = await transporter.sendMail({
        from: fromAddress,
        to,
        subject: emailSubject,
        text: finalMessage,
        html: `<div style="font-family: Arial, sans-serif; color: #1e293b; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
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
        </div>`
      });

      return res.json({ ok: true, message: 'Correo enviado exitosamente vía SMTP.', messageId: info.messageId });
    } else {
      // Modo Simulación/Demostración cuando no hay credenciales SMTP configuradas aún
      console.log(`[SIMULACIÓN EMAIL CandidateIQ] Hacia: ${to} | Asunto: ${emailSubject}`);
      return res.json({
        ok: true,
        simulated: true,
        message: `[Simulación] Correo preparado y listo para ${to}. Configura SMTP_USER y SMTP_PASS en el servidor o panel de hosting para envíos reales.`
      });
    }
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

    // Formatear número de teléfono a E.164 (+57...)
    let cleanPhone = phone.replace(/[^\d+]/g, '');
    if (!cleanPhone.startsWith('+')) {
      if (cleanPhone.length === 10 && cleanPhone.startsWith('3')) {
        cleanPhone = '+57' + cleanPhone; // Colombia por defecto si tiene 10 dígitos
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
      // Modo Simulación/Demostración cuando no hay credenciales Twilio
      console.log(`[SIMULACIÓN WHATSAPP CandidateIQ] Hacia: ${cleanPhone}`);
      return res.json({
        ok: true,
        simulated: true,
        message: `[Simulación] Mensaje preparado y listo para WhatsApp (${cleanPhone}). Configura TWILIO_ACCOUNT_SID en el servidor para envíos reales.`
      });
    }
  } catch (error) {
    console.error('Error enviando WhatsApp:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// -------------------------------------------------------------
// ENDPOINT MCP (MODEL CONTEXT PROTOCOL OVER HTTP JSON-RPC)
// -------------------------------------------------------------
app.post('/api/mcp', async (req, res) => {
  const { jsonrpc, method, params, id } = req.body;

  if (jsonrpc !== '2.0') {
    return res.status(400).json({ jsonrpc: '2.0', error: { code: -32600, message: 'Invalid Request' }, id: id || null });
  }

  // Lista de herramientas disponibles en el MCP de CandidateIQ
  if (method === 'tools/list') {
    return res.json({
      jsonrpc: '2.0',
      id,
      result: {
        tools: [
          {
            name: 'send_candidate_email',
            description: 'Envía una citación a entrevista o notificación por correo electrónico a un candidato.',
            inputSchema: {
              type: 'object',
              properties: {
                to: { type: 'string', description: 'Dirección de correo electrónico del candidato' },
                candidateName: { type: 'string', description: 'Nombre completo del candidato' },
                subject: { type: 'string', description: 'Asunto del correo' },
                message: { type: 'string', description: 'Cuerpo del mensaje (inicia con Estimado(a) Candidato(a)...)' }
              },
              required: ['to', 'message']
            }
          },
          {
            name: 'send_candidate_whatsapp',
            description: 'Envía una citación a entrevista o notificación por WhatsApp a un candidato.',
            inputSchema: {
              type: 'object',
              properties: {
                phone: { type: 'string', description: 'Número telefónico con código de país (ej: +573001234567)' },
                candidateName: { type: 'string', description: 'Nombre completo del candidato' },
                message: { type: 'string', description: 'Mensaje a enviar por WhatsApp' }
              },
              required: ['phone', 'message']
            }
          },
          {
            name: 'evaluate_cv_ranking',
            description: 'Evalúa y ordena automáticamente candidatos con base en palabras requeridas y excluyentes.',
            inputSchema: {
              type: 'object',
              properties: {
                requiredKeywords: { type: 'array', items: { type: 'string' } },
                excludedKeywords: { type: 'array', items: { type: 'string' } },
                candidates: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      text: { type: 'string' },
                      email: { type: 'string' },
                      phone: { type: 'string' }
                    }
                  }
                }
              },
              required: ['candidates', 'requiredKeywords']
            }
          }
        ]
      }
    });
  }

  // Ejecución de herramientas MCP
  if (method === 'tools/call') {
    const { name, arguments: args } = params || {};

    if (name === 'send_candidate_email') {
      const { to, candidateName, subject, message } = args;
      const transporter = getEmailTransporter();
      let finalMessage = message || '';
      if (!finalMessage.trim().startsWith('Estimado(a) Candidato(a)')) {
        finalMessage = `Estimado(a) Candidato(a) ${candidateName || ''},\n\n${finalMessage}`;
      }

      if (transporter) {
        try {
          await transporter.sendMail({
            from: process.env.EMAIL_FROM || 'CandidateIQ <no-reply@candidateiq.com>',
            to,
            subject: subject || 'Invitación a Entrevista - CandidateIQ',
            text: finalMessage
          });
          return res.json({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: `Correo enviado con éxito a ${to}` }] } });
        } catch (e) {
          return res.json({ jsonrpc: '2.0', id, result: { isError: true, content: [{ type: 'text', text: `Error enviando correo: ${e.message}` }] } });
        }
      } else {
        return res.json({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: `[MCP Simulación] Correo preparado para ${to}. Configura SMTP en servidor para envíos reales.` }] } });
      }
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
        return res.json({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: `[MCP Simulación] WhatsApp preparado para ${phone}. Configura Twilio para envíos reales.` }] } });
      }
    }

    if (name === 'evaluate_cv_ranking') {
      const { candidates = [], requiredKeywords = [], excludedKeywords = [] } = args;
      const reqLower = requiredKeywords.map(k => k.toLowerCase().trim());
      const excLower = excludedKeywords.map(k => k.toLowerCase().trim());

      const results = candidates.map(c => {
        const textLower = (c.text || '').toLowerCase();
        const found = reqLower.filter(k => textLower.includes(k));
        const missing = reqLower.filter(k => !textLower.includes(k));
        const excludedFound = excLower.filter(k => textLower.includes(k));

        let score = reqLower.length ? Math.round((found.length / reqLower.length) * 10) : 5;
        if (excludedFound.length) score = Math.max(1, Math.min(score, 3));

        return {
          name: c.name,
          email: c.email,
          phone: c.phone,
          score,
          foundKeywords: found,
          missingKeywords: missing,
          excludedKeywordsFound: excludedFound
        };
      });

      results.sort((a, b) => b.score - a.score);

      return res.json({
        jsonrpc: '2.0',
        id,
        result: {
          content: [{ type: 'text', text: JSON.stringify(results, null, 2) }]
        }
      });
    }

    return res.status(404).json({ jsonrpc: '2.0', error: { code: -32601, message: 'Tool not found' }, id });
  }

  return res.status(400).json({ jsonrpc: '2.0', error: { code: -32601, message: 'Method not supported' }, id });
});

// Ruta principal para servir la SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`  CandidateIQ - Plataforma Inteligente en Ejecución`);
  console.log(`  Servidor Web: http://localhost:${PORT}`);
  console.log(`  Endpoint MCP: http://localhost:${PORT}/api/mcp`);
  console.log(`====================================================`);
});
