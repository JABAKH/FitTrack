# FitTrack: prueba para el examen en Android

1. Instala el APK en un teléfono Android. No lo abras mediante Expo Go.
2. Inicia sesión y abre Actividad.
3. Inicia una caminata al aire libre. Permite notificaciones, actividad física y ubicación todo el tiempo.
4. Abre Sensores y anota pasos, distancia, lecturas y sus horas.
5. Bloquea la pantalla y camina durante 1–2 minutos. Deben mantenerse las notificaciones de actividad.
6. Regresa a FitTrack: comprueba el aumento de pasos y distancia, y las nuevas lecturas de los sensores disponibles.
7. Finaliza y guarda la actividad. Comprueba que desaparecen las notificaciones de seguimiento y que Inicio muestra los pasos guardados una sola vez.

Si Android restringe la actividad, configura la batería de FitTrack como Sin restricciones. No fuerces el cierre durante la prueba.

El barómetro y el podómetro dependen del hardware. La app indica No disponible si el teléfono no los tiene o no tiene permisos. No genera lecturas simuladas.

El APK no necesita la computadora ni el servidor de Expo para ejecutar la app. Supabase necesita conexión para guardar los datos; la actividad pendiente se conserva localmente mientras no hay conexión.

El mapa Android usa OpenStreetMap sin clave API. Requiere internet para cargar calles, respeta la caché HTTP e incluye la atribución. Solo solicita el mapa visible; no descarga zonas para usar sin conexión. El GPS y los sensores registran la actividad por separado.

Compilación local en Windows: ejecuta npm run apk:local desde FitTrack. El APK firmado se guarda en builds/FitTrack-android.apk. La firma existente se conserva en archivos locales excluidos de Git y EAS. Requiere Java y Android SDK; no usa la cola de compilación de Expo.
