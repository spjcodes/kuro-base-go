const fs = require('fs');
const path = require('path');

const { IOSConfig, withAppDelegate, withInfoPlist, withPodfile } = require('expo/config-plugins');

/**
 * Keeps the fixes this project needs for Xcode 27 / iOS 26+ applied to `ios/`, which
 * `expo prebuild` regenerates from the SDK 54 template (and deletes outright with
 * `--clean`). Without this plugin every prebuild silently reintroduces them, and the app
 * either fails to build or traps on launch before any JavaScript runs. See
 * `ios/<project>/SceneDelegate.swift` for the long version of the scene change.
 *
 * 1. **Deployment target** — Xcode 27 refuses to build anything below iOS 15.0, but
 *    ~22 pods still declare 13.0/13.4/12.4/9.0. `platform :ios` does not reach them;
 *    CocoaPods applies it to the Pods project and leaves each pod target on its
 *    podspec's value. A `post_install` loop is the only place it can be raised.
 * 2. **Scene lifecycle** — apps that still create their window in
 *    `application(_:didFinishLaunchingWithOptions:)` are killed at launch by
 *    `_UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption` (EXC_BREAKPOINT).
 *    SDK 54 has no scene support in `node_modules/expo/ios/` (it lands in 57.0.23),
 *    so we supply our own `SceneDelegate` and point the scene manifest at it.
 *
 * A fix to a dependency's own source does not belong here: `expo prebuild` never
 * touches a patched package, so that belongs in `patches/` and pnpm's
 * `patchedDependencies` instead.
 */

// ---------------------------------------------------------------------------
// 1. Podfile: raise every pod target's deployment target to 15.1
// ---------------------------------------------------------------------------

/** Doubles as the idempotency check — the loop is only inserted once. */
const PODFILE_MARKER = '# Xcode 27 dropped every deployment target below iOS 15.0';
const PODFILE_LOOP = `
    ${PODFILE_MARKER} and refuses to
    # build one: a handful of pods still declare 13.0, 13.4, 12.4 and even 9.0
    # (resource bundles, SDWebImage, RNSVG's filter extension,
    # RNCAsyncStorage's bundle), and the build stops on them before compiling
    # anything. The \`platform :ios\` above does not help - CocoaPods applies it
    # to the Pods project and leaves each pod target on its podspec's own value,
    # which is why 228 of them are already 15.1 and these 22 are not. Raising
    # them here is the only place it can be done.
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |build_configuration|
        build_configuration.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.1'
      end
    end
`;

/** Index just past the `)` that closes the call whose `(` is at `openIndex`. */
function findClosingParen(contents, openIndex) {
  let depth = 0;
  for (let i = openIndex; i < contents.length; i++) {
    if (contents[i] === '(') depth++;
    else if (contents[i] === ')' && --depth === 0) return i;
  }
  throw new Error('unbalanced parentheses');
}

function addDeploymentTargetLoop(contents) {
  if (contents.includes(PODFILE_MARKER)) {
    return contents;
  }

  const call = 'react_native_post_install(';
  const callIndex = contents.indexOf(call);
  if (callIndex === -1) {
    throw new Error(
      `Could not find \`${call}\` in the Podfile. The plugin anchors the deployment-target ` +
        'loop inside `post_install`, right after that call.'
    );
  }

  // Insert after the closing paren's line, so the loop lands inside `post_install`
  // (which owns the `installer` the loop iterates) rather than after `end`.
  const closeIndex = findClosingParen(contents, callIndex + call.length - 1);
  const lineEnd = contents.indexOf('\n', closeIndex);
  if (lineEnd === -1) {
    throw new Error('Unexpected end of Podfile after `react_native_post_install(`.');
  }

  return contents.slice(0, lineEnd + 1) + PODFILE_LOOP + contents.slice(lineEnd + 1);
}

// ---------------------------------------------------------------------------
// 2. AppDelegate.swift: hand the window over to the scene delegate
// ---------------------------------------------------------------------------

const SCENE_NOTE_MARKER = 'started by `SceneDelegate`';
const WINDOW_STATEMENT = /^[ \t]*window = UIWindow\(frame: UIScreen\.main\.bounds\)\r?\n/m;
// `[^)]*` spans newlines, so this swallows the whole multi-line call.
const START_STATEMENT = /^[ \t]*factory\.startReactNative\([^)]*\)\r?\n/m;
const EMPTY_OS_WRAPPER = /^[ \t]*#if os\(iOS\) \|\| os\(tvOS\)\r?\n[ \t]*#endif\r?\n/m;
const FACTORY_BIND = /^([ \t]*)bindReactNativeFactory\(factory\)\r?\n/m;

/** Reindented to match the surrounding code, and ends with a blank line. */
function sceneNote(indent) {
  return (
    `${indent}// The window and React Native itself are started by \`SceneDelegate\`, which iOS 26+\n` +
    `${indent}// requires: creating the window here as well would give it no scene to attach to.\n` +
    `${indent}// See SceneDelegate.swift.\n\n`
  );
}

function adoptSceneLifecycle(contents) {
  if (contents.includes(SCENE_NOTE_MARKER)) {
    return contents;
  }

  if (!WINDOW_STATEMENT.test(contents) || !START_STATEMENT.test(contents)) {
    throw new Error(
      'AppDelegate.swift is not the expected SDK 54 template: it no longer has both the ' +
        '`window = UIWindow(frame: UIScreen.main.bounds)` and `factory.startReactNative(...)` ' +
        'statements to remove. Re-check this plugin against the new template before removing it.'
    );
  }

  return contents
    .replace(WINDOW_STATEMENT, '')
    .replace(START_STATEMENT, '')
    .replace(EMPTY_OS_WRAPPER, '')
    // Removing the statements leaves a run of blank lines where they were.
    .replace(/(bindReactNativeFactory\(factory\)\r?\n)(?:[ \t]*\r?\n)+/, '$1')
    .replace(FACTORY_BIND, (line, indent) => line + '\n' + sceneNote(indent));
}

// ---------------------------------------------------------------------------
// 3. Info.plist: point UIKit at the scene delegate
// ---------------------------------------------------------------------------

const SCENE_MANIFEST = {
  UIApplicationSupportsMultipleScenes: false,
  UISceneConfigurations: {
    UIWindowSceneSessionRoleApplication: [
      {
        UISceneConfigurationName: 'Default Configuration',
        // Resolved against the target, so it survives a module rename.
        UISceneDelegateClassName: '$(PRODUCT_MODULE_NAME).SceneDelegate',
      },
    ],
  },
};

function isOwnedManifest(manifest) {
  return JSON.stringify(manifest) === JSON.stringify(SCENE_MANIFEST);
}

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

const withIosXcode27Fixes = (config) => {
  config = withPodfile(config, (config) => {
    config.modResults.contents = addDeploymentTargetLoop(config.modResults.contents);
    return config;
  });

  config = withAppDelegate(config, (config) => {
    if (config.modResults.language !== 'swift') {
      throw new Error(
        'This plugin edits AppDelegate.swift, but the project has an AppDelegate in ' +
          `${config.modResults.language}.`
      );
    }
    config.modResults.contents = adoptSceneLifecycle(config.modResults.contents);
    return config;
  });

  config = withInfoPlist(config, (config) => {
    const manifest = config.modResults.UIApplicationSceneManifest;
    if (manifest !== undefined && !isOwnedManifest(manifest)) {
      throw new Error(
        'This app already declares UIApplicationSceneManifest (in Info.plist or via another ' +
          'plugin), so this plugin will not overwrite it. Point that manifest at ' +
          '`$(PRODUCT_MODULE_NAME).SceneDelegate` and drop the definition here.'
      );
    }
    config.modResults.UIApplicationSceneManifest = SCENE_MANIFEST;
    return config;
  });

  return withBuildSourceFile(config);
};

/**
 * Writes `ios/<project>/SceneDelegate.swift` from `plugins/ios/SceneDelegate.swift` and
 * links it into the Xcode project. The template is the source of truth: edits belong
 * there, not in the generated copy.
 */
function withBuildSourceFile(config) {
  const templatePath = path.join(__dirname, 'ios', 'SceneDelegate.swift');
  if (!fs.existsSync(templatePath)) {
    throw new Error(
      `This plugin generates SceneDelegate.swift from ${templatePath} and it is missing. ` +
        'Restore it (it is checked in next to this file) - without it the app will trap on ' +
        'launch with `_UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption`.'
    );
  }

  return IOSConfig.XcodeProjectFile.withBuildSourceFile(config, {
    filePath: 'SceneDelegate.swift',
    contents: fs.readFileSync(templatePath, 'utf8'),
    overwrite: true,
  });
}

module.exports = withIosXcode27Fixes;
