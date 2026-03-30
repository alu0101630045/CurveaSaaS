# CurveaSaaS

Plataforma web para estudiar funciones matematicas con graficacion y publicacion de articulos.

El proyecto esta dividido en dos partes:

- Backend de calculo en C++ (analisis de funciones y endpoint `/api/plot`).
- Servidor web en Node.js + TypeScript (autenticacion, articulos y archivos estaticos del frontend).

## En que consiste el proyecto

CurveaSaaS permite:

- Registrarse e iniciar sesion.
- Analizar y graficar funciones matematicas.
- Publicar articulos matematicos asociados a funciones.
- Guardar usuarios y articulos en una base de datos SQLite.

La arquitectura funciona asi:

1. El usuario accede al frontend servido por Express en `http://localhost:3000`.
2. El servidor Node expone APIs de login/registro y articulos (`/api/auth/*`, `/api/articles`) con persistencia en SQLite.
3. Cuando se solicita analisis matematico, Node reenvia la peticion a C++ (`/api/plot`) que corre en `http://localhost:8080`.

## Tecnologias utilizadas

### Frontend y servidor web

- TypeScript
- Express 5
- Node.js
- HTML/CSS/JavaScript (archivos estaticos en `frontend/public`)

### Motor matematico

- C++17
- CMake
- Make

### Base de datos

- SQLite
- better-sqlite3 (driver para Node)

## Estructura principal

```text
CurveaSaaS/
	backend/     # API C++ para analisis matematico
	frontend/    # Servidor Express + frontend + SQLite
	database/    # Carpeta reservada del repo
```

Nota: la base de datos SQLite usada por el servidor Node se crea automaticamente en:

`frontend/database/curvea.db`

## Requisitos previos

Instala en tu sistema:

- Node.js 18+ (recomendado LTS)
- npm
- CMake 3.15+
- g++ con soporte C++17
- make

En Ubuntu/Debian, por ejemplo:

```bash
sudo apt update
sudo apt install -y build-essential cmake nodejs npm
```

## Puesta en funcionamiento desde terminal

Debes levantar dos procesos: backend C++ y servidor Node.

### 1) Compilar y ejecutar backend C++ (puerto 8080)

En una terminal:

```bash
cd backend
cmake -S . -B build
cmake --build build
./build/servidor_api
```

Si todo va bien, veras un mensaje similar a:

```text
Backend C++ escuchando en http://localhost:8080
```

### 2) Instalar dependencias del frontend

En otra terminal:

```bash
cd frontend
npm install
```

### 3) Compilar TypeScript

```bash
npm run build
```

Este comando compila:

- `src/server.ts` -> `dist/server.js`
- `src/*.ts` del frontend -> `public/js/*.js`

### 4) Ejecutar servidor web (puerto 3000)

```bash
npm start
```

Salida esperada:

```text
Servidor activo en http://localhost:3000
```

Abre en el navegador:

`http://localhost:3000/login.html`

## Modo desarrollo

Para desarrollo con recarga del servidor Node y compilacion en watch del cliente:

```bash
cd frontend
npm run dev
```

Scripts disponibles:

- `npm run dev:server` -> nodemon sobre `src/server.ts`
- `npm run dev:client` -> compilacion continua del frontend
- `npm run dev` -> ejecuta ambos en paralelo

## Endpoints principales

### Autenticacion

- `POST /api/auth/register`
- `POST /api/auth/login`

### Articulos

- `GET /api/articles`
- `POST /api/articles`

### Analisis matematico

- `POST /api/plot` (proxy hacia backend C++ en puerto 8080)

## Solucion de problemas rapida

- Si `/api/plot` falla, verifica que el backend C++ este corriendo en `8080`.
- Si `npm run build` falla por dependencias, ejecuta `npm install` de nuevo en `frontend`.
- Si no ves cambios en frontend, recompila con `npm run build` o usa `npm run dev`.
- Si quieres reiniciar datos, elimina `frontend/database/curvea.db` con el servidor detenido.
