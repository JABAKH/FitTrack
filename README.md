# FitTrack

Aplicación Expo + React Native + TypeScript. Supabase es el único backend principal. AsyncStorage conserva exclusivamente sesión y borradores de actividades aún no enviados.

## Ejecutar

1. Copia `.env.example` a `.env` y configura `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY` (clave pública/publishable o anon, nunca service_role).
2. `npm install` y `npm start`. Para sensores, OAuth con esquema propio y push utiliza una development build en un teléfono real.
3. `npm run typecheck`, `npm test`, `npm run test:database`.

## Supabase

Desplegado en el proyecto FitTrack `ybshrssdpgvdghvpoyud`. La aplicación tiene `.env` con URL y clave pública, las migraciones están aplicadas, Auth tiene redirects configurados y las cuatro Edge Functions están desplegadas. Stripe y proveedores OAuth externos siguen pendientes de sus credenciales.

- `npx supabase login`, `npx supabase link --project-ref TU_PROJECT_REF`, `npx supabase db push`.
- En Auth agrega los redirects `fittrack://auth/callback` y `fittrack://reset-password`. Activa email/password, confirmación de correo y los proveedores Google/Apple con sus credenciales. Configura SMTP para envío real.
- Despliega `billing`, `stripe-webhook` y `delete-account` con `npx supabase functions deploy NOMBRE`. La configuración desactiva el chequeo JWT de gateway; billing/delete-account verifican explícitamente el usuario con `auth.getUser`. El webhook verifica la firma Stripe sobre el cuerpo original.
- Secretos de Functions: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID`, `APP_RETURN_URL`. Las claves Supabase de servidor las proporciona Functions automáticamente. Stripe Price: activo, 150000 centavos, MXN, mensual, sin período de prueba.
- `APP_RETURN_URL` debe ser una URL HTTPS bajo tu control, con enlace a `fittrack://payment-return`; Stripe no acepta un esquema móvil como success_url.
- Webhook Stripe a `https://PROJECT_REF.supabase.co/functions/v1/stripe-webhook`: `checkout.session.completed`, `customer.subscription.created/updated/deleted`, `invoice.paid`, `invoice.payment_failed`.
- Registra entrenadores reales desde un administrador: cada entrenador requiere usuario Auth + profile, `trainers.user_id`, datos reales y fotografía en `trainer-photos`. El cliente no puede editar precios, pagos, entrenadores ni suscripciones.
- Nunca ejecutar `db reset` contra datos existentes. Esta migración está destinada a un esquema nuevo y fallará si ya existen tablas homónimas; revisar antes de aplicarla a un proyecto existente.

## Comportamiento y límites

- GPS y sensores no generan datos ficticios. La app detiene el seguimiento al pasar a segundo plano y conserva un borrador reintentable. No implementa tracking GPS en segundo plano.
- iOS obtiene pasos del dispositivo para el día, cuando el sistema permite leerlos. Android expone pasos de la sesión y el servidor agrega únicamente las actividades guardadas de ese día, de manera idempotente: no se presentan como total diario completo del teléfono.
- Sin internet, se conservan formularios y el borrador de actividad. Los demás cambios requieren conexión; no existe una cola oculta que simule guardados.
- Realtime invalida consultas compartidas entre pantallas y al reconectar; el chat carga los últimos 100 mensajes.
- Calorías y necesidades energéticas son estimaciones, no mediciones del teléfono.
- Recordatorios locales de actividad/peso incluidos. Push requiere development build y `EXPO_PUBLIC_EAS_PROJECT_ID`. Configurar webhook de mensajes según la sección siguiente. Renovaciones notificadas por el webhook Stripe.
- Pruebas SQL usan PostgreSQL WASM desechable (PGlite) para verificar SQL/RLS; no prueban entrega push, Stripe real, hardware, publicación Realtime ni API Storage remota.

## Push de chat

El trigger remoto `fittrack_message_push` ya está configurado y usa Vault para el secreto compartido. No crees un segundo webhook para evitar notificaciones duplicadas. La entrega al teléfono aún requiere `EXPO_PUBLIC_EAS_PROJECT_ID`, permiso de notificaciones y una development build. Las instrucciones siguientes sirven como alternativa si migras a otro proyecto.

Despliega `message-notification`, configura `DB_WEBHOOK_SECRET` como un secreto aleatorio largo en Functions y crea un Database Webhook en Supabase para INSERT sobre `public.messages`, destino `https://PROJECT_REF.supabase.co/functions/v1/message-notification`, cabecera `x-webhook-secret` con ese valor. El servidor consulta el mensaje y sus participantes desde la base, respeta las preferencias y envía el aviso mediante Expo Push. La entrega push depende de Expo y puede repetirse si el webhook se reintenta. Nunca pongas el secreto en la aplicación.
