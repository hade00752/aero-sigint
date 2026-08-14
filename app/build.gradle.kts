plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.aero.batteryhealth"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.aero.batteryhealth"
        minSdk = 26
        targetSdk = 34
        versionCode = 5
        versionName = "0.5.0"
        ndk { abiFilters += "arm64-v8a" }
    }

    buildTypes {
        release { isMinifyEnabled = false }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_1_8
        targetCompatibility = JavaVersion.VERSION_1_8
    }

    kotlinOptions {
        jvmTarget = "1.8"
    }
}

dependencies {
    implementation("androidx.appcompat:appcompat:1.6.1")
    implementation("androidx.webkit:webkit:1.8.0")
    implementation("org.nanohttpd:nanohttpd:2.3.1")
}
