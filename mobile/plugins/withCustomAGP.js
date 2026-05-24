const { withProjectBuildGradle, withSettingsGradle } = require('@expo/config-plugins');

/**
 * Expo Config Plugin to pin the Android Gradle Plugin (AGP) version
 * in both build.gradle and the settings.gradle version catalog.
 */
const withCustomAGP = (config, version = '8.7.3') => {
  // 1. Modify project-level build.gradle
  config = withProjectBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      config.modResults.contents = config.modResults.contents.replace(
        /classpath\(['"]com\.android\.tools\.build:gradle['"]\)/g,
        `classpath('com.android.tools.build:gradle:${version}')`
      );
      config.modResults.contents = config.modResults.contents.replace(
        /classpath\(['"]com\.android\.tools\.build:gradle:[\d\.]+['"]\)/g,
        `classpath('com.android.tools.build:gradle:${version}')`
      );
    }
    return config;
  });

  // 2. Modify settings.gradle to override the version catalog
  config = withSettingsGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      config.modResults.contents = config.modResults.contents.replace(
        /expoAutolinking\.useExpoVersionCatalog\(\)/g,
        `expoAutolinking.useExpoVersionCatalog {\n  version("agp", "${version}")\n}`
      );
    }
    return config;
  });

  return config;
};

module.exports = withCustomAGP;
