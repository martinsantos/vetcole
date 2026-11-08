# ColVet Digital

Plataforma del **Colegio de Médicos Veterinarios de Mendoza**: una sola base de datos para el Colegio, los consultorios veterinarios, las áreas de zoonosis de los municipios y las familias.

> **Demo.** Las guardias salen del listado público de colvetmza.com.ar (con ubicación aproximada). Profesionales, tutores, animales, ventas y municipios en servicio son **ficticios**. Propuesta de Última Milla.

## Qué incluye

| Aplicación | Ruta | Para quién | Qué resuelve |
|---|---|---|---|
| Sitio público | `/` | Comunidad | Directorio, mapa, **tablero de guardia en vivo**, turnos online, libreta sanitaria, verificación de matrícula, de establecimiento y de recetas, asistente, datos abiertos |
| Portal del veterinario | `/vet` | Matriculados | Credencial con QR, cuotas, trámites, recetas con QR, credencial, oblea y cartel del establecimiento, declaración de guardia, notificación de casos, asamblea online, ficha pública |
| **Consultorio** (equivalente a MyVete) | `/vet/consultorio` | Veterinarias | Agenda y turnos por servicio, pacientes con historia clínica (= libreta oficial), clientes, ventas y facturación, caja, inventario y pet shop, proveedores y compras, cuentas corrientes, mensajería y recordatorios a tutores, reportes |
| Administración | `/admin` | Colegio | Tablero, padrón (ABM), inscripciones (Ley 7825), establecimientos, guardias, cobranzas, denuncias, salud pública, asamblea, comunicaciones, alta de municipios |
| **Zoonosis municipal** (equivalente a VetCard) | `/muni` | Municipios | Credencial animal con la identidad del municipio, atenciones, campañas con **modo sin conexión**, mordeduras (observación de 10 días), perros potencialmente peligrosos, panel de cobertura |
| App del tutor/a | `/tutor` | Familias | Mis mascotas, credencial para Wallet, libreta completa, turnos, mensajes con la veterinaria, aviso de mascota perdida |

**La idea central:** lo que firma un matriculado vigente en su consultorio queda en la libreta del animal. Esa libreta la ve el tutor en su app, el municipio en su panel de zoonosis, y cualquiera puede verificarla por QR. Ni MyVete (que gestiona el consultorio) ni VetCard (que gestiona la zoonosis municipal) pueden dar fe de una matrícula; el Colegio sí.

### Equivalencias

| MyVete | ColVet Digital |
|---|---|
| Historia clínica | Historia clínica unificada con la libreta oficial (los registros privados no se publican) |
| Turnos por tipo de servicio | Agenda semanal por servicio y profesional + reserva online desde el sitio y la app |
| Clientes y cuenta corriente | Clientes (tutores) con cuenta corriente y cobros |
| Ventas, facturación | Punto de venta con Factura B/C, ticket y presupuesto (CAE simulado; ARCA a integrar) |
| Inventario / pet shop | Inventario con stock mínimo, vencimientos y ajuste |
| Proveedores | Proveedores, compras (suben el stock) y cuenta corriente con proveedores |
| App para tutores | App del tutor con libreta, turnos, mensajes y recordatorios |

| VetCard | ColVet Digital |
|---|---|
| Credencial digital por animal con marca municipal | Credencial municipal sobre la libreta del Colegio (nombre, sigla y color propios) |
| Google / Apple Wallet | Tarjeta tipo Wallet en la app del tutor (pases reales a integrar) |
| Antirrábica, castraciones, historia clínica | Atenciones de zoonosis en la misma libreta que usan los veterinarios |
| Mordeduras, perros mordedores y potencialmente peligrosos | Mordeduras con observación de 10 días y registro de peligrosos |
| Campañas y operativos sin conexión | Campañas con cola local y sincronización |
| Panel de estadísticas | Panel por municipio + datos abiertos por departamento |

## Stack

El mismo que Psicole, para poder converger con el producto de gestión de colegios:

- **Backend:** Node.js 22 + Express (ESM), Prisma, JWT con roles (`ADMIN`, `VET`, `MUNICIPIO`, `TUTOR`), respuestas `{ success, data, message }`, base `/api/v1`.
- **Frontend:** React 18 + Vite, Tailwind, Zustand, axios, React Router, Leaflet.
- **Base de datos:** SQLite para la demo. Para usar MySQL, cambiá `provider = "mysql"` en `backend/prisma/schema.prisma` y `DATABASE_URL`.

```
backend/
  prisma/schema.prisma   modelo (Colegio · libreta · consultorio · zoonosis)
  prisma/seed.js         datos de demostración
  src/routes/            public · auth · vet · clinic · admin · muni · tutor
  tests/                 tests de integración (node:test)
frontend/src/
  routes/                una app por rol (PublicApp, VetApp, AdminApp, MuniApp, TutorApp)
  pages/                 pantallas por área
  components/            UI compartida (tablero de guardia, mapa, turnos, asistente, QR)
docs/prototipo-html.html prototipo navegable original
```

## Probarla sin instalar nada

[![Abrir en GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/martinsantos/vetcole?quickstart=1)

Arma la demo en la nube de GitHub, carga los datos y la abre en el navegador en unos 3 minutos. Para compartirla, en la pestaña **Puertos** poné el 4000 como **Público** y copiá el link.

## Cómo correrla

Requiere Node.js 22.

```bash
npm run setup     # instala dependencias, crea la base SQLite y carga los datos
npm run dev       # API en :4000 y frontend en http://localhost:5173
```

Para presentarla en un solo puerto:

```bash
npm run demo      # compila el frontend y lo sirve desde la API en http://localhost:4000
```

Con Docker:

```bash
docker compose up --build   # http://localhost:4000 (la base se recrea en cada arranque)
```

Otros comandos:

- `npm test`: 10 tests de integración de la API sobre una base propia.
- `npm run e2e`: con la demo corriendo en :4000, recorre las pantallas de las 5 aplicaciones y los flujos que las cruzan (73 verificaciones, Playwright). Después vuelve a cargar los datos.
- `npm run reseed`: vuelve los datos al estado inicial.

## Publicarla online

La demo se publica en **www.ultimamilla.com.ar/casos/vetcole/**. Cada push a `main` corre los tests y publica la imagen `ghcr.io/martinsantos/vetcole`. Los pasos del servidor, nginx o Cloudflare están en [`deploy/DEPLOY.md`](deploy/DEPLOY.md).

Para correrla localmente bajo la misma subruta:

```bash
BASE_PATH=/casos/vetcole/ npm run build --prefix frontend
```
```bash
BASE_PATH=/casos/vetcole npm start --prefix backend   # http://localhost:4000/casos/vetcole/
```

## Cuentas de la demo

Todas con contraseña `demo1234`. La barra superior de la demo cambia de rol en un clic.

| Rol | Email |
|---|---|
| Veterinaria (DT del Consultorio Veterinario Parque) | `lucia.ferreyra@demo.colvet` |
| Administración del Colegio | `admin@demo.colvet` |
| Zoonosis Godoy Cruz | `zoonosis@godoycruz.demo` |
| Zoonosis Guaymallén | `zoonosis@guaymallen.demo` |
| Tutora (Luna y Michi) | `sofia.rios@demo.colvet` |

Para probar: libretas `MZA-000231` (Luna), `MZA-000198` (Michi), `EQ-000017` (Tormenta, equino); matrículas `1342` (vigente), `552` (suspendida); receta `RV-2026-000412`.

## Pendiente para producción

- Refresh tokens, auditoría y permisos finos (como en Psicole).
- Facturación electrónica real con ARCA y cobro con Mercado Pago u otra pasarela.
- Pases reales de Google Wallet y Apple Wallet.
- Homologación ante SENASA del módulo equino (Libreta Sanitaria Equina Digital, Res. 831/2026).
- Interoperabilidad con el registro provincial de animales de compañía si se aprueba el proyecto de ley.
- Asistente con un modelo de lenguaje restringido al contenido oficial (hoy responde con reglas y datos en vivo).
