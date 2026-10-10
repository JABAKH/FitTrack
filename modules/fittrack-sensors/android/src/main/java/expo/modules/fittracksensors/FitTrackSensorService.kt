package expo.modules.fittracksensors
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.os.Handler
import android.os.Looper
import org.json.JSONObject
import kotlin.math.max

class FitTrackSensorService : Service(), SensorEventListener {
  private lateinit var manager: SensorManager
  private var state = JSONObject()
  private var counterBaseline: Float? = null
  private var detectorAvailable = false
  private var wakeLock: PowerManager.WakeLock? = null
  private var lastSaved = 0L
  private val handler = Handler(Looper.getMainLooper())
  private val heartbeat = object : Runnable {
    override fun run() { state.put("heartbeat",System.currentTimeMillis());save();handler.postDelayed(this,1000) }
  }
  override fun onCreate() { super.onCreate();manager=getSystemService(Context.SENSOR_SERVICE) as SensorManager }
  private fun save() { getSharedPreferences("fittrack-sensors",Context.MODE_PRIVATE).edit().putString("snapshot",state.toString()).apply();lastSaved=System.currentTimeMillis() }
  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    val sessionId=intent?.getStringExtra("sessionId") ?: run { stopSelf();return START_NOT_STICKY }
    val notifications=getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if(Build.VERSION.SDK_INT>=26)notifications.createNotificationChannel(NotificationChannel("fittrack-tracking","Entrenamiento en curso",NotificationManager.IMPORTANCE_LOW))
    val launch=packageManager.getLaunchIntentForPackage(packageName)
    val builder=if(Build.VERSION.SDK_INT>=26)Notification.Builder(this,"fittrack-tracking") else Notification.Builder(this)
    builder.setContentTitle("FitTrack · sensores activos").setContentText("Pasos y movimiento durante tu entrenamiento.").setSmallIcon(android.R.drawable.ic_media_play).setOngoing(true)
    if(launch!=null)builder.setContentIntent(PendingIntent.getActivity(this,0,launch,PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE))
    if(Build.VERSION.SDK_INT>=34)startForeground(7821,builder.build(),ServiceInfo.FOREGROUND_SERVICE_TYPE_HEALTH) else startForeground(7821,builder.build())
    if(state.optString("sessionId")==sessionId && state.optBoolean("running"))return START_NOT_STICKY
    manager.unregisterListener(this);handler.removeCallbacks(heartbeat);counterBaseline=null
    state=JSONObject().put("sessionId",sessionId).put("running",true).put("steps",0).put("heartbeat",System.currentTimeMillis())
    val available=JSONObject();state.put("available",available)
    for((name,type) in listOf("accelerometer" to Sensor.TYPE_ACCELEROMETER,"gyroscope" to Sensor.TYPE_GYROSCOPE,"barometer" to Sensor.TYPE_PRESSURE)) {
      val sensor=manager.getDefaultSensor(type,true) ?: manager.getDefaultSensor(type)
      available.put(name,sensor!=null && manager.registerListener(this,sensor,100000))
    }
    val detector=manager.getDefaultSensor(Sensor.TYPE_STEP_DETECTOR,true) ?: manager.getDefaultSensor(Sensor.TYPE_STEP_DETECTOR)
    detectorAvailable=try { detector!=null && manager.registerListener(this,detector,SensorManager.SENSOR_DELAY_NORMAL) } catch(_:SecurityException) { false }
    val counter=if(detectorAvailable)null else manager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER,true) ?: manager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)
    val counterAvailable=try { counter!=null && manager.registerListener(this,counter,SensorManager.SENSOR_DELAY_NORMAL) } catch(_:SecurityException) { false }
    available.put("steps",detectorAvailable || counterAvailable)
    if(!available.optBoolean("steps"))state.put("steps",JSONObject.NULL)
    if(wakeLock?.isHeld!=true){wakeLock=(getSystemService(Context.POWER_SERVICE) as PowerManager).newWakeLock(PowerManager.PARTIAL_WAKE_LOCK,"FitTrack:Workout");wakeLock?.acquire(4*60*60*1000L)}
    save();handler.post(heartbeat)
    return START_NOT_STICKY
  }
  override fun onSensorChanged(event:SensorEvent) {
    if(!state.optBoolean("running"))return
    val now=System.currentTimeMillis()
    when(event.sensor.type) {
      Sensor.TYPE_ACCELEROMETER,Sensor.TYPE_GYROSCOPE -> {
        val key=if(event.sensor.type==Sensor.TYPE_ACCELEROMETER)"accelerometer" else "gyroscope"
        val unit=if(key=="accelerometer")SensorManager.GRAVITY_EARTH else 1f
        state.put(key,JSONObject().put("x",event.values[0]/unit).put("y",event.values[1]/unit).put("z",event.values[2]/unit).put("receivedAt",now))
      }
      Sensor.TYPE_PRESSURE -> state.put("barometer",JSONObject().put("pressure",event.values[0]).put("relativeAltitude",JSONObject.NULL).put("receivedAt",now))
      Sensor.TYPE_STEP_DETECTOR -> state.put("steps",state.optInt("steps")+max(1,event.values[0].toInt()))
      Sensor.TYPE_STEP_COUNTER -> {
        val current=event.values[0];if(counterBaseline==null)counterBaseline=current
        state.put("steps",max(state.optInt("steps"),max(0,(current-counterBaseline!!).toInt())))
      }
    }
    if(now-lastSaved>=1000 || event.sensor.type==Sensor.TYPE_STEP_COUNTER || event.sensor.type==Sensor.TYPE_STEP_DETECTOR)save()
  }
  override fun onAccuracyChanged(sensor:Sensor?,accuracy:Int) {}
  override fun onDestroy() {
    handler.removeCallbacks(heartbeat);manager.unregisterListener(this)
    state.put("running",false);save()
    if(wakeLock?.isHeld==true)wakeLock?.release()
    super.onDestroy()
  }
  override fun onTaskRemoved(rootIntent:Intent?) { stopSelf();super.onTaskRemoved(rootIntent) }
  override fun onBind(intent:Intent?):IBinder? = null
}
