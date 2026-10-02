# Capacitor discovers plugins, permission annotations and callbacks at runtime.
# Retain the annotation types too: R8 full mode otherwise loses the permission
# metadata used by LocalNotifications.checkPermissions during startup.
-keepattributes RuntimeVisibleAnnotations,RuntimeInvisibleAnnotations,AnnotationDefault,InnerClasses,EnclosingMethod
-keep class com.getcapacitor.** { *; }
-keep class ma.cahier.textes.** { *; }
-keep class com.capacitorjs.plugins.** extends com.getcapacitor.Plugin { *; }
-keep class io.simsek.plugins.webviewprint.WebviewPrintPlugin { *; }

-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Lifecycle callbacks and the Play update bridge also cross platform boundaries.
-keep class androidx.core.splashscreen.** { *; }
-keep class com.google.android.play.core.appupdate.** { *; }
-keep class com.google.android.play.core.install.** { *; }
-keepattributes SourceFile,LineNumberTable
