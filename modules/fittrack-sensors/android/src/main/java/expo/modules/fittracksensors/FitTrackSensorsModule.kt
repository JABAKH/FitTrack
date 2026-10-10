package expo.modules.fittracksensors
import android.content.Context
import android.content.Intent
import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class FitTrackSensorsModule : Module() {
  private fun context(): Context = appContext.reactContext ?: throw IllegalStateException("App context unavailable")
  override fun definition() = ModuleDefinition {
    Name("FitTrackSensors")
    AsyncFunction("start") { sessionId: String ->
      val context = context()
      val intent = Intent(context, FitTrackSensorService::class.java).putExtra("sessionId", sessionId)
      if (Build.VERSION.SDK_INT >= 26) context.startForegroundService(intent) else context.startService(intent)
      Unit
    }
    AsyncFunction("stop") {
      val context = context()
      context.stopService(Intent(context, FitTrackSensorService::class.java))
      Unit
    }
    AsyncFunction("snapshot") {
      context().getSharedPreferences("fittrack-sensors", Context.MODE_PRIVATE).getString("snapshot", null)
    }
  }
}
