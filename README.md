# Nurse Finder — Plataforma de búsqueda de enfermeras

![React Native](https://img.shields.io/badge/React%20Native-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Expo](https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Recharts](https://img.shields.io/badge/Recharts-22B8CF?style=for-the-badge&logo=chartdotjs&logoColor=white)
![License](https://img.shields.io/badge/Licencia-MIT-green?style=for-the-badge)

> **Conecta pacientes y enfermeras: app móvil en React Native (Expo) con panel de administración en Next.js, todo sobre Supabase.**

Nurse Finder es una plataforma que conecta a pacientes con enfermeras disponibles. Incluye una **app móvil** (React Native + Expo) con flujos separados para cliente y enfermera, y un **panel de administración** web (Next.js) con tablas de datos y gráficas. Backend y autenticación sobre **Supabase**.

## ✨ Características

- **App móvil (Expo)** — flujos diferenciados para cliente `(client)` y enfermera `(nurse)`
- **Panel admin (Next.js)** — gestión con tablas avanzadas (`@tanstack/react-table`) y gráficas (Recharts)
- **Supabase** — base de datos, autenticación y SSR (`@supabase/ssr`)
- **React Query** — caché y estado de datos en el cliente móvil
- **Componentes nativos** — bottom sheets, image picker, document picker, fonts y deep linking
- **Monorepo** — administración y móvil en un solo repositorio con workspaces

## 🛠 Stack

| Capa | Tecnología |
|---|---|
| App móvil | React Native + Expo |
| Panel admin | Next.js + Tailwind |
| Datos | Supabase (`@supabase/ssr` + `@supabase/supabase-js`) |
| Estado | TanStack Query / React Table |
| Gráficas | Recharts |
| UI móvil | Bottom Sheet, Image Picker, Document Picker |

## 🚀 Inicio rápido

```bash
npm install

# App móvil (Expo)
npm run mobile

# Panel admin
npm run admin
```

## 📁 Estructura

```
nurse-finder/
├── apps/
│   ├── mobile/            # React Native + Expo
│   │   └── app/
│   │       ├── (auth)/    # Login y registro
│   │       ├── (client)/  # Flujo del cliente
│   │       ├── (nurse)/   # Flujo de la enfermera
│   │       └── dashboard/
│   └── admin/             # Next.js + Supabase SSR
│       └── src/app/       # Panel de administración
├── supabase/              # Esquema y migraciones
└── package.json           # Workspaces (mobile + admin)
```

## 🏗 Arquitectura

```
┌─ Mobile (Expo) ─┐        ┌─ Admin (Next.js) ─┐
│  Cliente/Nurse  │        │   Panel web       │
└────────┬────────┘        └────────┬──────────┘
         │                         │
         └────────── Supabase ─────┘
              (Auth + DB + RLS)
```

Ambas apps comparten la misma infraestructura de Supabase; el panel admin opera sobre los mismos datos que la app móvil.

<!-- Agrega capturas en docs/screenshots/ -->

---

## Desarrollado por Francisco Javier Laguna

Full-stack developer · React · Vue · .NET · PHP

[GitHub](https://github.com/jlaguna553) · [LinkedIn](https://www.linkedin.com/in/francisco-javier-laguna-mondrag%C3%B3n-80a798154/) · [CV Online](https://cv-online.jlaguna553.workers.dev/v/xrdcnyej)
