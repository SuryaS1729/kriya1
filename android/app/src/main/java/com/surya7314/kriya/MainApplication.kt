package com.surya7314.kriya
import com.facebook.react.common.assets.ReactFontManager

import android.app.Application
import android.content.res.Configuration

import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.ReactPackage
import com.facebook.react.ReactHost
import com.facebook.react.common.ReleaseLevel
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint

import expo.modules.ApplicationLifecycleDispatcher
import expo.modules.ExpoReactHostFactory

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    ExpoReactHostFactory.getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // Packages that cannot be autolinked yet can be added manually here, for example:
          // add(MyReactNativePackage())
        }
    )
  }

  override fun onCreate() {
    super.onCreate()
    // @generated begin xml-fonts-init - expo prebuild (DO NOT MODIFY) sync-3d6e05e97b4c8fa17138046c2628df5f7f554c53
    ReactFontManager.getInstance().addCustomFont(this, "Alegreya", R.font.xml_alegreya)
    ReactFontManager.getInstance().addCustomFont(this, "Dancing Script", R.font.xml_dancing_script)
    ReactFontManager.getInstance().addCustomFont(this, "Story", R.font.xml_story)
    ReactFontManager.getInstance().addCustomFont(this, "Cedarville Cursive", R.font.xml_cedarville_cursive)
    ReactFontManager.getInstance().addCustomFont(this, "Source Serif Pro", R.font.xml_source_serif_pro)
    ReactFontManager.getInstance().addCustomFont(this, "Space Mono", R.font.xml_space_mono)
    ReactFontManager.getInstance().addCustomFont(this, "Kalam", R.font.xml_kalam)
    ReactFontManager.getInstance().addCustomFont(this, "Instrument Serif", R.font.xml_instrument_serif)
    // @generated end xml-fonts-init
    DefaultNewArchitectureEntryPoint.releaseLevel = try {
      ReleaseLevel.valueOf(BuildConfig.REACT_NATIVE_RELEASE_LEVEL.uppercase())
    } catch (e: IllegalArgumentException) {
      ReleaseLevel.STABLE
    }
    loadReactNative(this)
    ApplicationLifecycleDispatcher.onApplicationCreate(this)
  }

  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
    ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig)
  }
}
