# VPO Corp — app móvil

App [Expo](https://expo.dev) (SDK 54, expo-router) que replica el panel web.
Consume la misma API que la web: el dominio sale de `extra.apiUrl` en `app.json`.

Comparte tipos y permisos con la web a través de `packages/shared`, que Metro
resuelve directo al código fuente (ver `metro.config.js`) — `apps/mobile`
deliberadamente **no** es miembro del workspace npm de la raíz, así que sus
dependencias se instalan aparte.

## Levantar el entorno de desarrollo

```bash
cd apps/mobile
npm install
npx expo start
```

El QR aparece dibujado en la terminal. Escanealo con la cámara (iOS) o desde
adentro de Expo Go (Android). El celular y la computadora tienen que estar en
la misma red Wi-Fi.

Si la red bloquea la conexión entre dispositivos (Wi-Fi de invitados,
corporativas, redes con aislamiento de clientes), usá un túnel:

```bash
npx expo start --tunnel
```

> El QR sólo vive mientras el servidor está corriendo. Expo Go no guarda
> proyectos: si cerrás la terminal, la app desaparece de la lista. Eso es
> normal, no se pierde nada.

## Expo Go soporta un solo SDK a la vez

Este proyecto está fijado a **SDK 54** a propósito (ver `AGENTS.md`). Expo Go
sólo soporta la versión de SDK que trae la build publicada en la tienda, así
que cuando Expo Go se actualiza a un SDK más nuevo, este proyecto deja de
abrir con el error:

```
Project is incompatible with this version of Expo Go
```

Si eso pasa, la salida no es bajar de versión Expo Go — es usar un
development build.

## Development build (la app instalada de verdad)

Un development build se instala en el celular como una app propia, con su
ícono, y **no depende de la versión de Expo Go**. También habilita módulos
nativos que Expo Go no incluye (`@expo/ui`, `expo-glass-effect`).

Requiere una cuenta de Expo (el plan gratuito alcanza):

```bash
npm install -g eas-cli
eas login
eas init          # crea el projectId y lo escribe en app.json
eas build --profile development --platform android
```

Al terminar, EAS devuelve un QR y un enlace de instalación que funcionan desde
cualquier red — no hace falta tener la computadora prendida.

Los perfiles están definidos en `eas.json`:

| Perfil | Para qué sirve |
| --- | --- |
| `development` | Development build con el cliente de desarrollo incluido. Se usa junto con `npx expo start`. |
| `preview` | APK instalable para compartir y probar, sin servidor de desarrollo. |
| `production` | Build para publicar en las tiendas. |

Para iOS, `--platform ios` en un build de `development` o `preview` requiere
cuenta de Apple Developer para registrar el dispositivo.

## Estructura

```
src/app/        pantallas (expo-router, ruteo por archivos)
src/components/ componentes compartidos entre pantallas
src/lib/        cliente de API, sesión, helpers
```
