# Conectar OBS Studio a Claude Code

Permite que Claude controle OBS: cambiar escenas, mostrar/ocultar fuentes,
arrancar y parar streaming o grabación, mutear audio, disparar transiciones.

## Por qué esto solo funciona en tu máquina

OBS expone su API por `obs-websocket`, que escucha en `localhost:4455` — solo
acepta conexiones desde la misma máquina (o desde tu red local, si lo abrís a
mano). El servidor MCP se conecta a ese `localhost`.

Es decir: **el MCP tiene que correr en la misma computadora que OBS.** Una
sesión de Claude Code en la nube (claude.ai/code) corre en un contenedor
remoto: ahí `localhost` es el contenedor, no tu PC, y no hay ruta de red hacia
tu OBS. Desde una sesión web esto no se puede conectar, sin importar el MCP que
se use.

Hay que hacerlo con **Claude Code instalado localmente**.

## Pasos

### 1. Habilitar el WebSocket en OBS

Necesitás **OBS Studio 31 o superior** (el plugin ya viene incluido, no hay que
instalar nada aparte).

En OBS: **Herramientas → Ajustes del servidor WebSocket**
(`Tools → WebSocket Server Settings`)

1. Marcá **Habilitar servidor WebSocket**.
2. Dejá el puerto en `4455`.
3. Clic en **Mostrar información de conexión** y copiá la **contraseña**.

### 2. Instalar Claude Code en tu máquina

```bash
npm install -g @anthropic-ai/claude-code
```

Requiere **Node.js 16+** (el MCP de OBS se baja solo con `npx`).

### 3. Cargar la contraseña como variable de entorno

La config del repo lee la contraseña del entorno — **nunca se commitea**.

macOS / Linux — agregar a `~/.zshrc` o `~/.bashrc`:

```bash
export OBS_WEBSOCKET_PASSWORD="la-contraseña-que-copiaste-de-obs"
```

Windows (PowerShell):

```powershell
[Environment]::SetEnvironmentVariable("OBS_WEBSOCKET_PASSWORD", "la-contraseña", "User")
```

Abrí una terminal nueva para que tome el cambio.

### 4. Levantar Claude Code en el repo

```bash
cd DISCOGR-FICA
claude
```

El repo ya trae [`.mcp.json`](../.mcp.json) con el servidor `obs` configurado.
La primera vez Claude pide aprobar el servidor MCP del proyecto — aceptá.

Verificar que quedó conectado:

```bash
claude mcp list
```

Tiene que aparecer `obs` con `✔ Connected`. Si dice `✘ Failed to connect`,
mirá la sección de problemas abajo.

## Usarlo fuera de este repo

`.mcp.json` es a nivel proyecto: el MCP de OBS solo aparece cuando abrís Claude
Code dentro de `DISCOGR-FICA`. Como OBS no tiene nada que ver con este repo en
particular, quizá te convenga instalarlo a nivel usuario, así está disponible
en cualquier carpeta:

```bash
claude mcp add --scope user --env OBS_WEBSOCKET_PASSWORD=tu-contraseña \
  --transport stdio obs -- npx -y obs-mcp@latest
```

## OBS en otra computadora de la red

Si OBS corre en otra máquina de tu red local (por ejemplo la PC de streaming, y
Claude Code en tu laptop), apuntá el MCP a esa IP:

```bash
export OBS_WEBSOCKET_URL="ws://192.168.1.50:4455"
```

En la máquina con OBS hay que permitir conexiones de la red local en los
ajustes del WebSocket, y abrir el puerto `4455` en el firewall.

> No expongas `obs-websocket` a internet. Da control total sobre OBS y sobre lo
> que sale al aire. Si necesitás acceso remoto, usá una VPN o un túnel SSH, no
> port forwarding.

## Si algo falla

| Síntoma | Causa habitual |
|---|---|
| `✘ Failed to connect` | OBS cerrado, o el WebSocket sin habilitar en Herramientas → Ajustes del servidor WebSocket |
| Error de autenticación | `OBS_WEBSOCKET_PASSWORD` mal escrita o sin exportar — revisá con `echo $OBS_WEBSOCKET_PASSWORD` |
| El servidor `obs` no aparece | Estás en una sesión web/nube, no en Claude Code local; o no aprobaste el MCP del proyecto |
| `command not found: npx` | Falta Node.js 16+ |

## Referencias

- [royshil/obs-mcp](https://github.com/royshil/obs-mcp) — el servidor MCP que usa esta config
- [Claude Code · MCP](https://code.claude.com/docs/en/mcp)
- [obs-websocket](https://github.com/obsproject/obs-websocket)
