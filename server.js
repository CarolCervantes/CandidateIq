const express = require('express');
const cors = require('cors');
const path = require('path');
const nodemailer = require('nodemailer');
const twilio = require('twilio');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// -------------------------------------------------------------
// HELPER: MISTRAL OCR 3 API (MODEL: MISTRAL-OCR-LATEST)
// -------------------------------------------------------------
async function processMistralOCR({ imageBase64, mimeType = 'image/jpeg' }) {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) return null;

  const dataUrl = imageBase64.startsWith('data:') ? imageBase64 : `data:${mimeType};base64,${imageBase64}`;

  const response = await fetch('https://api.mistral.ai/v1/ocr', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'mistral-ocr-latest',
      document: {
        type: 'image_url',
        image_url: dataUrl
      }
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Error procesando documento con Mistral OCR API');
  }
  return data;
}

// -------------------------------------------------------------
// ENDPOINT API: PROCESAR DIPLOMAS / DOCUMENTOS CON MISTRAL OCR
// -------------------------------------------------------------
app.post('/api/ocr', async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ ok: false, error: 'Se requiere la imagen en Base64.' });
    }

    if (process.env.MISTRAL_API_KEY) {
      const ocrResult = await processMistralOCR({ imageBase64, mimeType });
      const extractedMarkdown = ocrResult.pages ? ocrResult.pages.map(p => p.markdown).join('\n\n') : JSON.stringify(ocrResult);
      return res.json({ ok: true, source: 'mistral-ocr-latest', markdown: extractedMarkdown, raw: ocrResult });
    } else {
      // Simulación de OCR para pruebas sin API Key configurada
      return res.json({
        ok: true,
        simulated: true,
        source: 'local-ocr-simulation',
        markdown: `[Extracto de Diploma/Documento Escaneado]
Título: Profesional Universitario / Diplomado
Estado: Verificado
Nota: Configura MISTRAL_API_KEY en Render para escaneo automático con Mistral OCR 3.`
      });
    }
  } catch (error) {
    console.error('Error en OCR:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// -------------------------------------------------------------
// HELPER: ENVÍO DE CORREO VÍA BREVO API
// -------------------------------------------------------------
async function sendWithBrevo({ to, candidateName, subject, text, html }) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) return null;

  const senderEmail = process.env.EMAIL_FROM_ADDRESS || 'carol.cervantesacosta@unicolombo.edu.co';
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
// HELPER: TRANSPORTE DE CORREO (SMTP)
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
// HELPER: ENVÍO AUTOMÁTICO DE WHATSAPP VÍA GREEN API
// -------------------------------------------------------------
async function sendWhatsAppGreenAPI({ phone, message }) {
  const instanceId = process.env.GREEN_API_INSTANCE;
  const apiToken = process.env.GREEN_API_TOKEN;

  if (!instanceId || !apiToken) return null;

  let cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.length === 10 && cleanPhone.startsWith('3')) {
    cleanPhone = '57' + cleanPhone;
  }

  const response = await fetch(`https://api.green-api.com/waInstance${instanceId}/sendMessage/${apiToken}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chatId: `${cleanPhone}@c.us`,
      message: message
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Error enviando WhatsApp con Green API');
  }
  return data;
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
// ENDPOINT API: ENVIAR EMAIL INDIVIDUAL
// -------------------------------------------------------------
app.post('/api/send-email', async (req, res) => {
  try {
    const { to, candidateName, subject, message } = req.body;

    if (!to || !message) {
      return res.status(400).json({ ok: false, error: 'Faltan parámetros requeridos (to, message).' });
    }

    let finalMessage = message;
    if (!finalMessage.trim().startsWith('Estimado(a) Candidato(a)')) {
      finalMessage = `Estimado(a) Candidato(a),\n\n${finalMessage}`;
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
    </div>`;

    if (process.env.BREVO_API_KEY) {
      const result = await sendWithBrevo({ to, candidateName, subject: emailSubject, text: finalMessage, html: htmlBody });
      return res.json({ ok: true, message: 'Correo enviado vía Brevo API.', messageId: result.messageId });
    }

    if (process.env.RESEND_API_KEY) {
      const result = await sendWithResend({ to, subject: emailSubject, text: finalMessage, html: htmlBody });
      return res.json({ ok: true, message: 'Correo enviado vía Resend API.', id: result.id });
    }

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
      return res.json({ ok: true, message: 'Correo enviado vía SMTP.', messageId: info.messageId });
    }

    return res.json({
      ok: true,
      simulated: true,
      message: `[Simulación] Correo preparado para ${to}.`
    });

  } catch (error) {
    console.error('Error enviando email:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// -------------------------------------------------------------
// ENDPOINT API: ENVIAR WHATSAPP INDIVIDUAL
// -------------------------------------------------------------
app.post('/api/send-whatsapp', async (req, res) => {
  try {
    const { phone, candidateName, message } = req.body;

    if (!phone || !message) {
      return res.status(400).json({ ok: false, error: 'Faltan parámetros requeridos (phone, message).' });
    }

    let finalMessage = message;
    if (!finalMessage.trim().startsWith('Estimado(a) Candidato(a)')) {
      finalMessage = `Estimado(a) Candidato(a),\n\n${finalMessage}`;
    }

    if (process.env.GREEN_API_INSTANCE && process.env.GREEN_API_TOKEN) {
      const greenResult = await sendWhatsAppGreenAPI({ phone, message: finalMessage });
      return res.json({ ok: true, message: 'Mensaje de WhatsApp enviado 100% automático vía Green API.', idMessage: greenResult.idMessage });
    }

    const client = getTwilioClient();
    if (client) {
      let cleanPhone = phone.replace(/[^\d+]/g, '');
      if (!cleanPhone.startsWith('+')) {
        if (cleanPhone.length === 10 && cleanPhone.startsWith('3')) cleanPhone = '+57' + cleanPhone;
        else cleanPhone = '+' + cleanPhone;
      }

      const response = await client.messages.create({
        from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER || '+14155238886'}`,
        to: `whatsapp:${cleanPhone}`,
        body: finalMessage
      });

      return res.json({ ok: true, message: 'Mensaje de WhatsApp enviado vía Twilio API.', sid: response.sid });
    }

    return res.json({
      ok: true,
      simulated: true,
      message: `WhatsApp preparado para ${phone}.`
    });

  } catch (error) {
    console.error('Error enviando WhatsApp:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// -------------------------------------------------------------
// ENDPOINT API: ENVIAR MASIVO (BATCH DISPATCH)
// -------------------------------------------------------------
app.post('/api/send-batch', async (req, res) => {
  try {
    const { candidates = [], channels = [], subject, message } = req.body;

    if (!candidates.length || !channels.length || !message) {
      return res.status(400).json({ ok: false, error: 'Faltan candidatos, canales o mensaje.' });
    }

    const results = [];

    for (const candidate of candidates) {
      const candidateResult = { name: candidate.name, email: candidate.email, phone: candidate.phone, dispatches: [] };

      let finalMessage = message;
      if (!finalMessage.trim().startsWith('Estimado(a) Candidato(a)')) {
        finalMessage = `Estimado(a) Candidato(a),\n\n${finalMessage}`;
      }

      // Email
      if (channels.includes('email') && candidate.email) {
        const emailSubject = subject || 'Invitación a Entrevista - CandidateIQ';
        const htmlBody = `<div style="font-family: Arial, sans-serif; color: #1e293b; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <div style="background-color: #0f172a; color: #ffffff; padding: 16px; border-radius: 6px 6px 0 0; text-align: center;">
            <h2 style="margin: 0; font-size: 20px; font-weight: 600;">CandidateIQ</h2>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #94a3b8;">Sistema Inteligente de Selección</p>
          </div>
          <div style="padding: 24px; background-color: #ffffff;">
            ${finalMessage.split('\n\n').map(p => `<p style="margin-bottom: 14px;">${p.replace(/\n/g, '<br>')}</p>`).join('')}
          </div>
        </div>`;

        try {
          if (process.env.BREVO_API_KEY) {
            await sendWithBrevo({ to: candidate.email, candidateName: candidate.name, subject: emailSubject, text: finalMessage, html: htmlBody });
            candidateResult.dispatches.push({ channel: 'email', ok: true, message: 'Correo enviado vía Brevo API.' });
          } else if (process.env.RESEND_API_KEY) {
            await sendWithResend({ to: candidate.email, subject: emailSubject, text: finalMessage, html: htmlBody });
            candidateResult.dispatches.push({ channel: 'email', ok: true, message: 'Correo enviado vía Resend API.' });
          } else {
            candidateResult.dispatches.push({ channel: 'email', ok: true, simulated: true, message: '[Simulación] Correo preparado.' });
          }
        } catch (err) {
          candidateResult.dispatches.push({ channel: 'email', ok: false, message: err.message });
        }
      }

      // WhatsApp
      if (channels.includes('whatsapp') && candidate.phone) {
        try {
          if (process.env.GREEN_API_INSTANCE && process.env.GREEN_API_TOKEN) {
            await sendWhatsAppGreenAPI({ phone: candidate.phone, message: finalMessage });
            candidateResult.dispatches.push({ channel: 'whatsapp', ok: true, message: 'WhatsApp enviado vía Green API.' });
          } else {
            const client = getTwilioClient();
            if (client) {
              let cleanPhone = candidate.phone.replace(/[^\d+]/g, '');
              if (!cleanPhone.startsWith('+')) {
                if (cleanPhone.length === 10 && cleanPhone.startsWith('3')) cleanPhone = '+57' + cleanPhone;
                else cleanPhone = '+' + cleanPhone;
              }
              await client.messages.create({
                from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER || '+14155238886'}`,
                to: `whatsapp:${cleanPhone}`,
                body: finalMessage
              });
              candidateResult.dispatches.push({ channel: 'whatsapp', ok: true, message: 'WhatsApp enviado vía Twilio API.' });
            } else {
              candidateResult.dispatches.push({ channel: 'whatsapp', ok: true, simulated: true, message: `WhatsApp preparado para ${candidate.phone}.` });
            }
          }
        } catch (err) {
          candidateResult.dispatches.push({ channel: 'whatsapp', ok: false, message: err.message });
        }
      }

      results.push(candidateResult);
    }

    return res.json({ ok: true, results });
  } catch (error) {
    console.error('Error en dispatch masivo:', error);
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
            description: 'Envía un correo a un candidato.',
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
            description: 'Envía un mensaje por WhatsApp a un candidato.',
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
        finalMessage = `Estimado(a) Candidato(a),\n\n${finalMessage}`;
      }

      if (process.env.BREVO_API_KEY) {
        try {
          const brevoResult = await sendWithBrevo({ to, candidateName, subject: subject || 'Invitación a Entrevista - CandidateIQ', text: finalMessage });
          return res.json({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: `Correo procesado por Brevo API (ID: ${brevoResult.messageId})` }] } });
        } catch (e) {
          return res.json({ jsonrpc: '2.0', id, result: { isError: true, content: [{ type: 'text', text: `Error Brevo: ${e.message}` }] } });
        }
      }

      return res.json({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: `[MCP Simulación] Correo preparado para ${to}.` }] } });
    }

    if (name === 'send_candidate_whatsapp') {
      const { phone, candidateName, message } = args;
      let finalMessage = message || '';
      if (!finalMessage.trim().startsWith('Estimado(a) Candidato(a)')) {
        finalMessage = `Estimado(a) Candidato(a),\n\n${finalMessage}`;
      }

      if (process.env.GREEN_API_INSTANCE && process.env.GREEN_API_TOKEN) {
        try {
          const greenResult = await sendWhatsAppGreenAPI({ phone, message: finalMessage });
          return res.json({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: `WhatsApp enviado vía Green API (ID: ${greenResult.idMessage})` }] } });
        } catch (e) {
          return res.json({ jsonrpc: '2.0', id, result: { isError: true, content: [{ type: 'text', text: `Error Green API: ${e.message}` }] } });
        }
      }

      return res.json({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: `[MCP Simulación] WhatsApp para ${phone} preparado.` }] } });
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
  console.log(`  CandidateIQ v2 (Soporte Mistral OCR 3 & Sidebar Menu)`);
  console.log(`  Servidor Web: http://localhost:${PORT}`);
  console.log(`  Endpoint MCP: http://localhost:${PORT}/api/mcp`);
  console.log(`====================================================`);
});
