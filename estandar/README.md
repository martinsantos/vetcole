# Libreta Sanitaria Animal Abierta (LSAA) · borrador 0.1

Un formato abierto para que la libreta sanitaria de un animal pueda pasar de un consultorio a otro, del consultorio al municipio y de ahí a un registro público, sin volver a cargar los datos y sin perder la firma de quien los registró.

> **Estado: borrador para discusión.** No es una norma oficial. Es una propuesta técnica alineada con el proyecto de registro provincial de animales de compañía que se discute en Mendoza. Cualquier colegio, municipio, software veterinario o registro público puede usarla, comentarla y proponer cambios.

## Por qué

En Mendoza conviven hoy:

- la **Libreta Única Sanitaria Canina y Felina (LUSCyF)** en papel, que el Colegio de Médicos Veterinarios de Mendoza incorporó como certificado válido en la provincia (Resolución N.º 36/22);
- la **Libreta Sanitaria Equina Digital (LSED)** de SENASA, que reemplazará a la de papel para los equinos;
- el **proyecto de ley de registro provincial de animales de compañía**, que prevé microchip desde los 3 meses, colocado y validado por veterinarios/as matriculados/as, una libreta digital asociada al chip y el registro de mordeduras;
- los registros de cada municipio (zoonosis, campañas de vacunación y castración) y el software de cada consultorio.

Si cada uno guarda los datos a su manera, la libreta del animal se fragmenta. Un formato común permite que todos lean y escriban lo mismo.

## Principios

1. **Un animal, un identificador.** El número de libreta de la jurisdicción y, cuando existe, el microchip ISO 11784/11785 de 15 dígitos.
2. **Cada registro va firmado.** Vacunas, castraciones, identificación y certificados llevan la matrícula de quien los firmó y si esa matrícula estaba vigente en el padrón del colegio al momento de firmar. Los registros de zoonosis llevan el municipio.
3. **Privacidad por niveles.** El mismo documento se genera con distinto contenido según quién lo pide (ver abajo). El nivel público nunca incluye datos del tutor/a, consultas, cirugías ni mordeduras.
4. **Verificable con un QR.** Cada libreta tiene una URL pública de verificación (`libreta.verificacion`) que es la que va en el QR.
5. **Convive con lo existente.** Guarda el número de sticker de la LUSCyF de cada vacuna y el número de LSED de los equinos.
6. **Abierto.** La especificación y el esquema son libres; cualquiera puede implementarlos.

## Niveles de acceso

| Nivel | Quién | Qué incluye |
|---|---|---|
| `publico` | Cualquiera que escanea el QR | Animal, microchip, vacunas, desparasitaciones, castración, identificación, análisis y certificados de viaje, con su firma. Estado de extravío. |
| `tutor` | La familia | Todo lo anterior más consultas, cirugías, mordeduras y sus datos de contacto. |
| `profesional` | Veterinarios/as matriculados/as | La historia clínica completa. |
| `autoridad` | Zoonosis municipal, registro provincial | Identificación, tutor/a, vacunación antirrábica, mordeduras y peligrosidad, según lo que fije la reglamentación. |

## Estructura

El esquema completo está en [`libreta-sanitaria.schema.json`](libreta-sanitaria.schema.json) (JSON Schema 2020-12). Resumen:

```
LSAA
├── estandar: "LSAA", version: "0.1", nivel
├── libreta      numero, verificacion (URL del QR), luscyf, lsed, credencialMunicipal
├── animal       nombre, especie, raza, sexo, nacimiento, pelaje, castrado
│   ├── microchip   numero (15 dígitos), norma ISO 11784/11785, fechaColocacion, colocadoPor (firma)
│   └── estado      perdido, fallecido (+ mordedor y potencialmentePeligroso fuera del nivel público)
├── tutor        (sólo fuera del nivel público)
├── emisor       institucion que da fe de las matrículas, jurisdiccion (ISO 3166-2, ej. AR-M), generado
├── estadoSanitario   codigo (al_dia | por_vencer | vencida | sin), etiqueta, vence
└── eventos[]    tipo, fecha, titulo, detalle, producto (nombre, laboratorio, lote, vencimiento),
                 stickerLuscyf, proximo, origen (consultorio | zoonosis | campania), firma, visibilidad
```

Tipos de evento: `vacuna`, `desparasitacion`, `castracion`, `identificacion`, `analisis`, `certificado_viaje`, `consulta`, `cirugia`, `mordedura`, `otro`.

## Ejemplos

- [`ejemplos/luna-canino.json`](ejemplos/luna-canino.json): canino con microchip, credencial municipal y certificado de viaje.
- [`ejemplos/michi-felino.json`](ejemplos/michi-felino.json): felino.
- [`ejemplos/tormenta-equino.json`](ejemplos/tormenta-equino.json): equino con anemia infecciosa equina (AIE).

Los ejemplos usan datos ficticios.

## API de referencia

La demo ColVet Digital implementa el formato:

```
GET /api/v1/public/libretas/{numero o microchip}/estandar
```

Devuelve `{ "success": true, "data": <documento LSAA de nivel público> }`. La implementación está en [`backend/src/lib/estandar.js`](../backend/src/lib/estandar.js) y el test que valida la salida contra el esquema, en [`backend/tests/estandar.test.js`](../backend/tests/estandar.test.js).

## Cómo validar un documento

Con Node.js y [Ajv](https://ajv.js.org/):

```js
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import schema from './libreta-sanitaria.schema.json' with { type: 'json' };

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validar = ajv.compile(schema);
if (!validar(documento)) console.log(ajv.errorsText(validar.errors));
```

## Temas abiertos para la discusión

- Quién emite el número de libreta cuando exista el registro provincial (¿el registro, el colegio o el municipio?).
- Qué datos del tutor/a recibe el registro y por cuánto tiempo se conservan.
- Si las mordeduras y la peligrosidad deben ser visibles para quien encuentra un animal perdido.
- Firma digital con certificado (hoy la firma es la matrícula validada contra el padrón en el momento del registro).
- Interoperabilidad con la LSED de SENASA y con registros de otras provincias.

## Cómo participar

Abrí un *issue* o un *pull request* en este repositorio con la propuesta de cambio y, si corresponde, la norma o el caso que la motiva. Los cambios incompatibles suben la versión (0.2, 0.3…); los compatibles, el último número (0.1.1).

## Licencia

- Especificación, esquema y ejemplos (esta carpeta): [Creative Commons Atribución 4.0 Internacional (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/deed.es).
- Código de la implementación de referencia (`backend/src/lib/estandar.js` y su test): licencia MIT (ver [`LICENSE-codigo`](LICENSE-codigo)).

Propuesta de Última Milla, 2026.
