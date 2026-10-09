# Verificación

- TypeScript móvil: aprobado.
- Pruebas de dominio: aprobadas.
- SQL y RLS: probados en PostgreSQL WASM desechable; incluye las 14 tablas, trigger Auth, privacidad del chat, pasos y actividades idempotentes, límite mensual de cambios, bloqueo de cobros y reintentos de webhooks.
- Compilación Expo web: aprobada. No sustituye una prueba en Android/iOS.
- Migraciones aplicadas al proyecto remoto FitTrack `ybshrssdpgvdghvpoyud`. Las 14 tablas tienen RLS y están en la publicación Realtime. Storage y cuatro Edge Functions desplegados. Se comprobaron Auth y rechazo de peticiones anónimas contra el backend real.
- Stripe y Expo Push aún no tienen credenciales/configuración completa: no se han probado cobros ni entrega push a dispositivos reales.
- npm audit reporta avisos en dependencias de Expo y sus herramientas (braces, node-forge, uuid y decode-uri-component). Se aplicaron las correcciones compatibles disponibles. No se forzó una degradación de Expo ni una actualización a un SDK incompatible para silenciar el reporte. Revisar actualizaciones del SDK antes de distribuir una build de producción.
- El seguimiento usa exclusivamente el primer plano y necesita permisos/sensores del dispositivo.
