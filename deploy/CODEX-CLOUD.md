# Vetcole: desarrollo de la web y del sistema en Codex Cloud

Estado inicial: código de la demo existente, con datos ficticios. Este arranque sirve
para desarrollar el producto; todavía no habilita el uso con datos reales ni un hosting
público permanente. No utiliza SSH, Docker ni nginx de Última Milla.

## Preparar el entorno

Repositorio: `martinsantos/vetcole`. Runtime: Node.js 22 y npm.
Seleccionar una rama de desarrollo revisada, no publicar cambios en `main`:
el workflow existente puede desplegar al VPS desde esa rama si está habilitado.

Comando de instalación desde la raíz del repositorio:

```sh
npm run cloud:setup
```

Instala las dependencias de los lockfiles, genera Prisma, inicializa **sólo si falta**
una base de desarrollo independiente y compila la web. Las ejecuciones siguientes
conservan la base existente y el secreto de sesión. No usar `npm run setup`,
`reseed`, `db:reset`, `e2e` ni el entrypoint Docker para continuar este entorno:
esos comandos pertenecen a la demo y algunos recargan sus datos.

Comando de inicio (web y API en el mismo puerto):

```sh
npm run cloud:start
```

Puerto predeterminado: `4000`. Comprobación: `GET /api/v1/health`.
Web pública: `/`. Ingreso: `/ingresar`. Paneles: `/vet`, `/admin`,
`/inspeccion`, `/muni`, `/tutor`. Los accesos de demostración siguen habilitados:
utilizar sólo datos ficticios y la vista previa privada del entorno.

Para edición con recarga: `npm run cloud:dev` (web en 5173, API en 4000).
Después de editar, `npm run cloud:prepare` vuelve a generar el cliente y compilar
sin reinstalar paquetes ni reiniciar los datos. No migra automáticamente una base
existente si cambió el esquema: revisar el cambio y respaldar la base antes de migrarla.

## Continuidad

La base y el secreto viven en `.local/cloud/`, fuera de Git. La base local del
desarrollador (`backend/prisma/dev.db`) y la demo de UMSA quedan independientes.
El arranque fuerza `DEMO_RESET_HOURS=0` y `noindex, nofollow`.

La carpeta de datos requiere un filesystem compatible con SQLite y enlaces duros
(por ejemplo, el disco Linux del entorno). Si el repositorio local está en un disco
externo exFAT, definir `VETCOLE_CLOUD_DATA_DIR` con una carpeta privada en APFS/ext4
para todos los comandos. No usar `/tmp` para datos que se quieran conservar.

Guardar el código en una rama remota y continuar el mismo chat de nube. No considerar
el disco de la tarea como un respaldo permanente: una tarea nueva tiene su propio
espacio. Si se necesitan datos persistentes entre entornos, incorporar base externa
y respaldos antes de cargar datos reales.

Referencia del servicio: https://learn.chatgpt.com/docs/environments/cloud-environments

## Primer alcance de desarrollo

1. Web del Colegio: contenido institucional, noticias, padrón público, guardias,
   consulta de credenciales por QR y acceso al sistema, con tamaños legibles en móvil.
2. Sistema Colegio: padrón y matrícula, autogestión, trámites, cuotas/cobros y
   certificaciones, permisos de administración y portal profesional.
3. Pasar de demo a uso real: autenticación sin cuentas de demostración, permisos
   revisados por rol, auditoría, migraciones, respaldo y restauración comprobada.

Consultorios, Zoonosis, libreta sanitaria abierta, Android y pasarela de pagos se
mantienen como módulos separados según la propuesta. Una funcionalidad simulada
de la demo no acredita una integración real (pagos, ARCA, Wallet u homologaciones).

No modificar SITREP, DGE, nginx ni otros servicios de producción. No ejecutar
despliegues a UMSA como parte de la preparación del entorno de desarrollo.
