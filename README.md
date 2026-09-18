# CandidateIQ 🚀

Plataforma Inteligente de Evaluación de Candidatos, Servidor MCP (Model Context Protocol) e Integración de Notificaciones vía Correo Electrónico y WhatsApp.

---

## 💡 Características Principales

1. **Rebranding Completo y UI/UX Térmica & Técnica**:
   - Diseño moderno, limpio y profesional adaptado a estándares de HR-Tech.
   - Procesamiento local y extracción inteligente de datos desde archivos PDF y TXT.

2. **Acceso Web Global sin Instalación Local**:
   - Preparado para desplegarse en la nube en **Vercel**, **Render**, **Railway** o **Cloudflare**.
   - Compatible con cualquier **dominio personalizado** (ej: `https://candidateiq.tudominio.com`).

3. **Integración MCP & APIs de Notificación**:
   - **Módulo de Correo**: Soporte para SMTP, Gmail, Outlook, Resend o SendGrid.
   - **Módulo de WhatsApp**: Integración con Twilio WhatsApp API.
   - **Servidor MCP Nativo (`/api/mcp` y `mcp-server.js`)**: Permite a asistentes de IA (Gemini, Claude, Cursor) invocar directamente las herramientas `send_email`, `send_whatsapp` y `evaluate_cv_ranking`.

4. **Cuerpo del Mensaje Estándar Obligatorio**:
   - Plantilla formateada que inicia con:
     > `Estimado(a) Candidato(a) [Nombre],`
     > `Nos complace informarte que has sido seleccionado/a...`

---

## 🛠️ Instalación y Prueba Local

```bash
# 1. Navegar a la carpeta del proyecto
cd C:\Users\HP\.gemini\antigravity\scratch\candidateiq

# 2. Instalar dependencias
npm install

# 3. Copiar archivo de entorno
cp .env.example .env

# 4. Iniciar el servidor local
npm start
```

Ingresa en tu navegador a: `http://localhost:3000`

---

## 🌐 Despliegue en la Nube con Dominio Propio

### Opción A: Despliegue en Vercel (Recomendado - 1 Clic)

1. Sube este proyecto a tu repositorio de GitHub / GitLab.
2. Ve a [Vercel](https://vercel.com) y crea un nuevo proyecto seleccionando tu repositorio.
3. En la sección **Environment Variables**, añade las credenciales de tu `.env`:
   - `SMTP_HOST`
   - `SMTP_USER`
   - `SMTP_PASS`
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_WHATSAPP_NUMBER`
4. En el panel de Vercel, ve a **Settings -> Domains** y añade tu propio dominio (ejemplo `candidateiq.com` o `rrhh.tudominio.com`).
5. Configura en tu proveedor de DNS el registro `CNAME` apuntando a `cname.vercel-dns.com`.

### Opción B: Despliegue en Render

1. Crea un **Web Service** en [Render](https://render.com).
2. Conecta tu repositorio y selecciona el entorno **Node**.
3. En **Build Command** escribe `npm install` y en **Start Command** escribe `node server.js`.
4. Añade tus variables de entorno en la pestaña **Environment**.
5. En la sección **Custom Domains**, conecta tu dominio.

---

## 🤖 Conexión del Servidor MCP a Clientes de IA

Puedes conectar CandidateIQ como un servidor de herramientas MCP para asistentes como Cursor, Claude Desktop o Google Antigravity:

### Configuración JSON de MCP (`mcpServers`):
```json
{
  "mcpServers": {
    "candidateiq": {
      "command": "node",
      "args": ["C:/Users/HP/.gemini/antigravity/scratch/candidateiq/mcp-server.js"],
      "env": {
        "SMTP_HOST": "smtp.gmail.com",
        "SMTP_USER": "tu_correo@gmail.com",
        "SMTP_PASS": "tu_password",
        "TWILIO_ACCOUNT_SID": "ACXXXXXXXXXXXX",
        "TWILIO_AUTH_TOKEN": "your_token"
      }
    }
  }
}
```

---

## 📄 Licencia

MIT © CandidateIQ Platform
