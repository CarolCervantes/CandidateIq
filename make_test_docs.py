import os
import json

target_dir = r"C:\Users\HP\Downloads\documentos_de_prueba"
os.makedirs(target_dir, exist_ok=True)

professions = [
    ("Carlos_Mendoza_Ingeniero_Sistemas", "Profesional", "Ingeniero de Sistemas", "Java, Python, SQL, Docker, AWS, 5 años de experiencia, Liderazgo, Arquitectura", "Apto", 9),
    ("Ana_Maria_Gomez_Contadora", "Profesional", "Contadora Pública", "Excel avanzado, NIIF, Impuestos, Auditoría, SAP, 4 años de experiencia", "Apto", 8),
    ("Luis_Hernandez_Analista_Datos", "Tecnólogo", "Tecnólogo en Análisis de Datos", "Python, SQL, Power BI, Excel, Tableau, 3 años de experiencia", "Apto", 8),
    ("Diana_Valencia_Disenadora_UX", "Profesional", "Diseñadora Gráfica / UX", "Figma, Adobe XD, Photoshop, HTML/CSS, Design Systems, 4 años de experiencia", "Apto", 7),
    ("Jorge_Ramirez_Auxiliar_Administrativo", "Técnico", "Técnico en Gestión Administrativa", "Archivística, Digitación, Excel básico, Atención al cliente, 1 año de experiencia", "Revisar", 5),
    ("Mariana_Lopez_Bachiller_Sin_Exp", "Bachiller", "Bachiller Académico", "Sin experiencia, aprendizaje rápido, disponibilidad inmediata", "Descartado", 3),
    ("Andres_Castro_Magister_Proyectos", "Magíster", "Magíster en Gerencia de Proyectos", "PMP, Scrum Master, Agile, Presupuestos, 8 años de experiencia, Gestión de Equipos", "Apto", 10),
    ("Sofia_Rios_Desarrolladora_Frontend", "Profesional", "Ingeniera de Software", "React, JavaScript, TypeScript, CSS, Tailwind, Git, 3 años de experiencia", "Apto", 8),
    ("Felipe_Torres_Especialista_Marketing", "Especialista", "Especialista en Marketing Digital", "SEO, SEM, Google Ads, Meta Ads, Copywriting, Google Analytics, 4 años de experiencia", "Apto", 8),
    ("Laura_Morales_Abogada_Corporativa", "Profesional", "Abogada", "Derecho laboral, Contratos, Cumplimiento normativo, Litigios, 6 años de experiencia", "Apto", 9),
    ("Gabriel_Ortez_Tecnico_Redes", "Técnico", "Técnico en Redes y Mantenimiento", "Cisco, Mikrotik, Cableado estructurado, Soporte técnico, 2 años de experiencia", "Revisar", 6),
    ("Valeria_Suarez_Enfermera_Jefe", "Profesional", "Enfermera Profesional", "Cuidados intensivos, Urgencias, Triaje, Primeros auxilios, 5 años de experiencia", "Apto", 9),
    ("Daniel_Vargas_Ejecutivo_Ventas", "Profesional", "Administrador de Empresas", "Ventas B2B, Negociación, CRM Salesforce, Cierre de negocios, 4 años de experiencia", "Apto", 8),
    ("Camila_Perez_Asistente_Bilingue", "Tecnólogo", "Tecnóloga en Asistencia de Dirección", "Inglés C1 avanzado, Redacción ejecutiva, Agenda, Excel, 3 años de experiencia", "Apto", 8),
    ("Esteban_Díaz_Ingeniero_Civil", "Profesional", "Ingeniero Civil", "AutoCAD, Revit, Presupuestos de obra, Interventoría, 6 años de experiencia", "Apto", 9),
    ("Natalia_Ruiz_Psicologa_Organizacional", "Profesional", "Psicóloga", "Pruebas psicotécnicas, Entrevistas por competencias, Selección, 3 años de experiencia", "Apto", 8),
    ("Mateo_Alvarez_Tecnico_Electricista", "Técnico", "Técnico Electricista Industrial", "Instalaciones eléctricas, PLC, Tableros, Mantenimiento, 4 años de experiencia", "Revisar", 6),
    ("Daniela_Herrera_Comunicadora", "Profesional", "Comunicadora Social", "Relaciones públicas, Prensa, Redacción institucional, Eventos, 3 años de experiencia", "Apto", 7),
    ("Julian_Mendoza_Arquitecto", "Profesional", "Arquitecto", "SketchUp, 3ds Max, AutoCAD, Diseño arquitectónico, 5 años de experiencia", "Apto", 9),
    ("Alejandra_Silva_Cajera", "Bachiller", "Bachiller", "Manejo de caja, Arqueo, Datáfono, Servicio al cliente, 1 año de experiencia", "Revisar", 5),
    ("Ricardo_Guerrero_Gerente_Operaciones", "Magíster", "Ingeniero Industrial - Magíster Ops", "Cadena de suministro, Lean Manufacturing, Six Sigma, KPI, 10 años de experiencia", "Apto", 10),
    ("Paula_Bermudez_Docente_Ingles", "Profesional", "Licenciada en Idiomas", "Inglés C2, Pedagogía, TOEFL, Clases virtuales, 5 años de experiencia", "Apto", 9),
    ("Hector_Cardenas_Mecanico_Automotriz", "Técnico", "Técnico en Mecánica Automotriz", "Diagnóstico escáner, Motores inyección, Frenos, 3 años de experiencia", "Revisar", 6),
    ("Isabel_Nieto_Disenadora_Modas", "Profesional", "Diseñadora de Modas", "Patronaje, Illustrator, Fichas técnicas, Tendencias, 4 años de experiencia", "Apto", 7),
    ("Javier_Molina_Tecnologo_Sistemas", "Tecnólogo", "Tecnólogo en Desarrollo de Software", "Java, SQL, JavaScript, HTML, 2 años de experiencia", "Revisar", 6),
    ("Monica_Quintero_Recepcionista", "Técnico", "Técnico en Servicio al Cliente", "Conmutador, Recepción, Redacción, Word, Excel, 2 años de experiencia", "Revisar", 5),
    ("Oscar_Salazar_DevOps_Engineer", "Profesional", "Ingeniero de Sistemas", "Kubernetes, Docker, Jenkins, Terraform, CI/CD, AWS, Linux, 4 años de experiencia", "Apto", 9),
    ("Patricia_Montoya_Nutricionista", "Profesional", "Nutricionista Dietista", "Consulta clínica, Plan alimentario, Valoración antropométrica, 3 años de experiencia", "Apto", 7),
    ("Rodrigo_Linares_Conductor", "Bachiller", "Bachiller", "Licencia C2, Transporte pesado, Logística de entrega, 5 años de experiencia", "Revisar", 6),
    ("Salome_Giraldo_Analista_Financiero", "Profesional", "Economista", "Modelación financiera, Valoración de empresas, Excel avanzado, Bloomberg, 3 años exp", "Apto", 8),
    ("Tomas_Ospina_Bodeguero", "Bachiller", "Bachiller", "Inventarios, WMS, Montacargas, Picking, Packing, 2 años de experiencia", "Revisar", 5),
    ("Vanessa_Parra_Community_Manager", "Tecnólogo", "Tecnóloga en Medios Digitales", "TikTok, Instagram, Canva, CapCut, Copywriting, 2 años de experiencia", "Apto", 7),
    ("Wilmer_Acosta_Ingeniero_Ambiental", "Profesional", "Ingeniero Ambiental", "PGIR, Licencias ambientales, ISO 14001, Auditorías, 4 años de experiencia", "Apto", 8),
    ("Yolanda_Toro_Secretaria", "Técnico", "Técnico Secretariado Ejecutivo", "Manejo de correspondencia, Archivo, Digitación rápida, 5 años de experiencia", "Revisar", 6),
    ("Zulma_Castillo_Biotecnologa", "Profesional", "Biotecnóloga", "Cultivo celular, PCR, Microbiología, Ensayos clínicos, 3 años de experiencia", "Apto", 8),
    ("Alvaro_Pinzon_Auxiliar_Contable", "Tecnólogo", "Tecnólogo en Contabilidad", "Siigo, Conciliaciones bancarias, Facturación electrónica, 2 años de experiencia", "Revisar", 6),
    ("Beatriz_Mejia_Jefe_Recursos_Humanos", "Especialista", "Psicóloga - Esp. Talento Humano", "Nómina, Clima organizacional, Evaluación del desempeño, Ley laboral, 7 años exp", "Apto", 10),
    ("Cesar_Agudelo_Operario_Produccion", "Bachiller", "Bachiller Técnico", "Línea de empaque, Manejo de maquinaria básica, Rotación turnos, 1 año exp", "Descartado", 4),
    ("Dora_Zapata_Auxiliar_Enfermeria", "Técnico", "Técnico en Auxiliar de Enfermería", "Toma de signos vitales, Administración medicamentos, Cuidados paciente, 4 años exp", "Apto", 7),
    ("Emilio_Vidal_Desarrollador_Mobile", "Profesional", "Ingeniero de Sistemas", "Flutter, Dart, React Native, iOS, Android, REST API, 3 años de experiencia", "Apto", 8),
    ("Fabiola_Restrepo_Coordinadora_Calidad", "Profesional", "Ingeniera Industrial", "ISO 9001, Auditora interna, Mejora continua, Procesos, 5 años de experiencia", "Apto", 9),
    ("Gonzalo_Mesa_Soporte_IT", "Tecnólogo", "Tecnólogo en Infraestructura IT", "Mesa de ayuda, Windows Server, Active Directory, Office 365, 3 años de experiencia", "Revisar", 6),
    ("Helena_Celis_Traductora", "Profesional", "Profesional en Lenguas Modernas", "Traducción simultánea Inglés-Español-Francés, 4 años de experiencia", "Apto", 8),
    ("Ignacio_Pardo_Consultor_SAP", "Profesional", "Ingeniero de Sistemas", "SAP FI/CO, ABAP, Implementación ERP, 6 años de experiencia", "Apto", 9),
    ("Jacqueline_Soto_Merchandiser", "Técnico", "Técnico en Mercadeo", "Exhibición de producto, Planimetrías, Trade marketing, 2 años de experiencia", "Revisar", 5),
    ("Kevin_Londono_Estudiante_Ingenieria", "Estudiante", "Estudiante 6to Semestre Ingeniería", "Conocimientos básicos Python, C++, inglés intermedio, sin experiencia formal", "Revisar", 5),
    ("Ligia_Rondon_Supervisora_Seguridad", "Tecnólogo", "Tecnóloga en SST", "SISTEMA SG-SST, Matriz de riesgos, Capacitaciones, ISO 45001, 4 años exp", "Apto", 8),
    ("Mario_Caicedo_Chef_Ejecutivo", "Tecnólogo", "Gastrónomo y Chef", "Cocina internacional, Control de costos de cocina, Menús, HACCP, 6 años exp", "Apto", 8),
    ("Nora_Ibarguen_Agente_Call_Center", "Bachiller", "Bachiller Bilingüe", "Inglés B2, Atención al cliente, Retención, Campañas USA, 1 año de experiencia", "Apto", 7),
    ("Orlando_Bravo_Ingeniero_Mecatronico", "Profesional", "Ingeniero Mecatrónico", "Robótica, Automatización industrial, LabVIEW, SolidWorks, 4 años exp", "Apto", 9)
]

generated_files = []

for idx, (filename, level, title, skills, category, base_score) in enumerate(professions, 1):
    file_path = os.path.join(target_dir, f"{idx:02d}_{filename}.txt")
    
    content = f"""CURRICULUM VITAE / DOCUMENTO DE ACREDITACIÓN PROFESIONAL

DATOS PERSONALES
Nombre: {filename.replace('_', ' ')}
Nivel Académico: {level}
Título Obtenido / Certificado: {title}
Correo Electrónico: {filename.lower()}@gmail.com
Teléfono / WhatsApp: +57 300 {idx*123456 % 899999 + 100000}

RESUMEN PROFESIONAL Y HABILIDADES CLAVE
Candidato en categoría: {category} (Calificación estimada: {base_score}/10)
Acreditación oficial: Documento legal que certifica estudios y competencias en {title}.

HABILIDADES TÉCNICAS Y CONOCIMIENTOS:
{skills}

EXPERIENCIA LABORAL Y CERTIFICACIONES:
- Certificado de Grado y Acta de Matrícula / Egreso oficial expedida por la institución educativa.
- Experiencia laboral verificable en el área de {title}.
- Competencias evaluadas: {skills}

CandidateIQ Document Verification Code: CIQ-{idx:03d}-2026
"""
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    generated_files.append(file_path)

print(f"Se crearon {len(generated_files)} documentos de prueba en: {target_dir}")
