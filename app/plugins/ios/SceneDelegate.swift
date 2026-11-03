import Expo
import React
import UIKit

/**
 Adopts the UIKit scene life cycle, which iOS 26 and newer require of apps built with
 the current SDK: an app that still creates its window in
 `application(_:didFinishLaunchingWithOptions:)` is refused at launch and traps inside
 `_UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption`, before any JS runs.

 Expo ships `ExpoAppSceneDelegate` for this, but only since 57.0.23, so this mirrors
 what it does for SDK 54:

 - builds the window from the connecting `UIWindowScene` and starts React Native in it
   (a `UIWindow(frame:)` has no scene to attach to and never appears)
 - re-feeds scene events to the app delegate. Once a scene exists UIKit stops calling
   the app delegate's life-cycle, URL and user-activity methods, and `ExpoAppDelegate`
   is what forwards those to `ExpoAppDelegateSubscriberManager` - so without this every
   Expo subscriber (splash screen, linking, notifications) goes silent.
 - rebuilds the launch options from the scene's connection options, because
   `Linking.getInitialURL()` reads a cold-start link from there and would otherwise
   reach nobody.

 `Info.plist`'s `UIApplicationSceneManifest` is what points UIKit here. The class name
 there is module-qualified because this is a Swift class: `$(PRODUCT_MODULE_NAME).SceneDelegate`.
 */
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  private var appDelegate: AppDelegate? {
    UIApplication.shared.delegate as? AppDelegate
  }

  // MARK: - Connecting the scene

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene,
      let appDelegate,
      let factory = appDelegate.factory
    else {
      fatalError(
        "SceneDelegate couldn't start React Native. The app delegate must be an ExpoAppDelegate "
          + "that has bound its React Native factory in application(_:didFinishLaunchingWithOptions:)."
      )
    }

    let window = UIWindow(windowScene: windowScene)
    self.window = window
    // Mirror the window onto the app delegate: code reading
    // `UIApplication.shared.delegate?.window` keeps working (expo-system-ui among others).
    appDelegate.window = window

    // Under the scene life cycle a cold start delivers links and activities in the
    // connection options rather than in the app delegate's launch options.
    let browsingWebActivity = connectionOptions.userActivities.first {
      $0.activityType == NSUserActivityTypeBrowsingWeb
    }
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: Self.launchOptions(
        url: connectionOptions.urlContexts.first?.url,
        userActivity: browsingWebActivity
      )
    )

    connectionOptions.urlContexts.forEach {
      _ = appDelegate.application(
        UIApplication.shared, open: $0.url, options: Self.openURLOptions(from: $0.options))
    }
    connectionOptions.userActivities.forEach {
      _ = appDelegate.application(
        UIApplication.shared, continue: $0, restorationHandler: { _ in })
    }
  }

  func sceneDidDisconnect(_ scene: UIScene) {
    window = nil
  }

  // MARK: - Life cycle, forwarded to the app delegate

  func sceneDidBecomeActive(_ scene: UIScene) {
    appDelegate?.applicationDidBecomeActive(UIApplication.shared)
  }

  func sceneWillResignActive(_ scene: UIScene) {
    appDelegate?.applicationWillResignActive(UIApplication.shared)
  }

  func sceneWillEnterForeground(_ scene: UIScene) {
    appDelegate?.applicationWillEnterForeground(UIApplication.shared)
  }

  func sceneDidEnterBackground(_ scene: UIScene) {
    appDelegate?.applicationDidEnterBackground(UIApplication.shared)
  }

  // MARK: - Links and activities, forwarded to the app delegate

  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    guard let appDelegate else {
      return
    }
    URLContexts.forEach {
      _ = appDelegate.application(
        UIApplication.shared, open: $0.url, options: Self.openURLOptions(from: $0.options))
    }
  }

  func scene(_ scene: UIScene, willContinueUserActivityWithType userActivityType: String) {
    // The scene callback returns nothing, unlike its app-delegate counterpart; calling the
    // delegate still lets every subscriber prepare, so the aggregated result is dropped.
    _ = appDelegate?.application(
      UIApplication.shared, willContinueUserActivityWithType: userActivityType)
  }

  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    _ = appDelegate?.application(
      UIApplication.shared, continue: userActivity, restorationHandler: { _ in })
  }

  func scene(
    _ scene: UIScene,
    didFailToContinueUserActivityWithType userActivityType: String,
    error: Error
  ) {
    appDelegate?.application(
      UIApplication.shared,
      didFailToContinueUserActivityWithType: userActivityType,
      error: error
    )
  }

  func scene(_ scene: UIScene, didUpdate userActivity: NSUserActivity) {
    appDelegate?.application(UIApplication.shared, didUpdate: userActivity)
  }

  // MARK: - Launch options

  /// Rebuilds the launch options that `Linking.getInitialURL()` reads, from a scene's connection
  /// options. `nil` when the app wasn't cold-started by a link or a browsing-web activity, which is
  /// what `startReactNative` expects then.
  private static func launchOptions(
    url: URL?,
    userActivity: NSUserActivity?
  ) -> [UIApplication.LaunchOptionsKey: Any]? {
    // The keys are built from their raw constant strings rather than from the
    // `UIApplication.LaunchOptionsKey.url` / `.userActivityDictionary` accessors: those are
    // deprecated as of iOS 26 in favour of the scene APIs, while React Native's
    // `getInitialURL` still reads the launch options by these exact strings.
    var launchOptions: [UIApplication.LaunchOptionsKey: Any] = [:]
    if let url {
      let urlKey = UIApplication.LaunchOptionsKey(rawValue: "UIApplicationLaunchOptionsURLKey")
      launchOptions[urlKey] = url
    }
    if let userActivity {
      let userActivityDictionaryKey = UIApplication.LaunchOptionsKey(
        rawValue: "UIApplicationLaunchOptionsUserActivityDictionaryKey")
      launchOptions[userActivityDictionaryKey] = [
        "UIApplicationLaunchOptionsUserActivityTypeKey": userActivity.activityType,
        "UIApplicationLaunchOptionsUserActivityKey": userActivity,
      ]
    }
    return launchOptions.isEmpty ? nil : launchOptions
  }

  private static func openURLOptions(
    from sceneOptions: UIScene.OpenURLOptions
  ) -> [UIApplication.OpenURLOptionsKey: Any] {
    var options: [UIApplication.OpenURLOptionsKey: Any] = [:]
    if let sourceApplication = sceneOptions.sourceApplication {
      options[.sourceApplication] = sourceApplication
    }
    if let annotation = sceneOptions.annotation {
      options[.annotation] = annotation
    }
    options[.openInPlace] = sceneOptions.openInPlace
    return options
  }
}
