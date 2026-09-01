# Infraestructura — VERA SOCIALIS

> Qué hay que crear una sola vez para que la beta viva en internet, y cómo queda operando.
> Presupuesto objetivo: **menos de 25 dólares al mes** (spec §4).

---

## Lo que necesito de ti antes de poder desplegar

El deploy está escrito y listo (`.github/workflows/deploy.yml`), pero no puede correr hasta que existan estas cuentas y el dominio. Son decisiones y gastos tuyos, así que no las creo yo.

### 1. Dominio

**Por qué es indispensable:** las passkeys (WebAuthn) exigen HTTPS sobre un dominio estable. Sin dominio no hay huella ni rostro, y sin eso no hay verificación humana.

Cuando lo compres, avísame el nombre. Con eso configuro `WEBAUTHN_RP_ID` y `WEBAUTHN_ORIGEN`.

### 2. Google Cloud (Cloud Run)

1. Crear un proyecto — anota el ID del proyecto.
2. Habilitar `run.googleapis.com`, `artifactregistry.googleapis.com` y `secretmanager.googleapis.com`.
3. Crear un repositorio de Artifact Registry llamado `vera` en la región `southamerica-west1`.
4. Activar la facturación y **poner una alerta de presupuesto en 20 dólares**.

Costo esperado: **0 a 10 dólares al mes**. El servicio escala a cero — cuando nadie lo usa, no cobra.

### 3. Neon (base de datos)

1. Crear un proyecto en la región más cercana a Chile.
2. Copiar la cadena de conexión (la que dice *pooled*).

Costo esperado: **0 a 8 dólares al mes**. El plan gratuito alcanza de sobra para menos de 100 personas.

### 4. Cloudflare R2 (archivos)

1. Crear un bucket llamado `vera-archivos`.
2. Crear un token de API con permiso de lectura y escritura sobre ese bucket.
3. Anotar el Account ID, el Access Key ID y el Secret Access Key.

Costo esperado: **0 dólares**. Los primeros 10 GB son gratis, y R2 no cobra por sacar datos.

### 5. API de Claude

Una API key desde console.anthropic.com. Es lo que hace funcionar el pre-filtro de selfies y, más adelante, la clasificación de comentarios.

Costo esperado: **menos de 5 dólares al mes** a escala de la beta.

---

## Cómo queda configurado (esto lo hago yo)

### Secretos en Google Secret Manager

Los valores sensibles no viven en el repo ni en variables de GitHub: van a Secret Manager, y Cloud Run los inyecta en tiempo de ejecución.

```
vera-database-url · vera-cookie-secret · vera-claude-api-key
vera-r2-account-id · vera-r2-access-key-id · vera-r2-secret-access-key · vera-r2-bucket
```

`COOKIE_SECRET` se genera con `openssl rand -base64 48`.

### Secretos y variables en GitHub

| Nombre | Tipo | Para qué |
|---|---|---|
| `GCP_WIF_PROVIDER` | secreto | Autenticación sin llaves de servicio |
| `GCP_SERVICE_ACCOUNT` | secreto | Cuenta de servicio que despliega |
| `GCP_PROYECTO` | secreto | ID del proyecto |
| `DATABASE_URL` | secreto | Migraciones desde la CI |
| `WEBAUTHN_RP_ID` | variable | El dominio, sin `https://` |
| `WEBAUTHN_ORIGEN` | variable | El dominio completo, con `https://` |

**Sin llaves de servicio descargadas.** GitHub se autentica en Google Cloud con Workload Identity Federation: no existe ningún archivo de credenciales que se pueda filtrar.

### El deploy

`master` despliega solo a staging en cada merge. Producción se dispara a mano desde la pestaña Actions eligiendo el entorno.

Cada deploy: construye la imagen, la publica, **aplica las migraciones**, actualiza Cloud Run y **verifica que la sonda de salud responda**. Si no responde, el deploy falla en rojo.

### Configuración de Cloud Run

| Ajuste | Valor | Por qué |
|---|---|---|
| Región | `southamerica-west1` | Santiago: la latencia más baja para Chile |
| CPU / memoria | 1 / 512 MiB | De sobra para la beta |
| Instancias | 0 a 3 | Escala a cero: sin uso, sin costo |
| Puerto | 8080 | Cloud Run lo inyecta como `PORT` |

---

## Vigilancia del presupuesto

- Alerta de presupuesto en Google Cloud a los 20 dólares.
- `GET /admin/resumen` muestra el estado de la beta y el cupo restante.
- La API **se niega a arrancar en producción** si falta R2, si falta la base de datos, si `COOKIE_SECRET` quedó en el valor de desarrollo o si `WEBAUTHN_RP_ID` sigue en `localhost`. Es una red de seguridad contra un deploy mal configurado.

### Un riesgo conocido

Cloud Run escala a cero, y eso corta las conexiones WebSocket cuando no hay tráfico. El cliente reconecta solo, así que en la beta debería pasar desapercibido. Si molesta en el uso real, se sube a `min-instances=1`, lo que agrega entre 5 y 8 dólares al mes — eso es un gasto, así que lo decides tú.

---

## Cuando todo esté creado

Pásame los datos y yo dejo el resto andando. El siguiente hito es **CP2**: te registras de verdad desde tu celular contra staging — código de referido, passkey con tu huella, selfie — y te apruebas a ti mismo en el panel.
