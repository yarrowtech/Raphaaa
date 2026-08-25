# Keep the JS bridge if one is ever added; harmless no-op otherwise.
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
