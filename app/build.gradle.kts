plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("com.chaquo.python")
}

android {
    namespace = "com.aero.batteryhealth"
    compileSdk = 34

    sourceSets {
        getByName("main") {
            // By default, Chaquopy looks in src/main/python.
            // If you need to add other directories, use:
            // (this as com.android.build.gradle.api.AndroidSourceSet).extensions.getByName<com.chaquo.python.PythonSourceSet>("python").srcDirs(...)
        }
    }

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

chaquopy {
    defaultConfig {
        version = "3.11"
        pip {
            install("flask")
            install("ntplib")
        }
    }
}

// Exclude io.opencensus telemetry pulled in transitively by Chaquopy.
// These are flagged as trackers by F-Droid/Exodus. The app does not use
// any telemetry or remote observability — excluding these has no runtime effect.
configurations.all {
    exclude(group = "io.opencensus")
}

dependencies {
    implementation("androidx.appcompat:appcompat:1.6.1")
    implementation("androidx.webkit:webkit:1.8.0")
}