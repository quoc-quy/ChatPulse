const { withProjectBuildGradle } = require('@expo/config-plugins');

/**
 * Expo Config Plugin to pin the Android Gradle Plugin (AGP) version.
 */
const withCustomAGP = (config, version = '8.7.3') => {
  return withProjectBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      // Replace classpath('com.android.tools.build:gradle') with the pinned version
      config.modResults.contents = config.modResults.contents.replace(
        /classpath\(['"]com\.android\.tools\.build:gradle['"]\)/g,
        `classpath('com.android.tools.build:gradle:${version}')`
      );
      // Also handle cases where a version might already be specified
      config.modResults.contents = config.modResults.contents.replace(
        /classpath\(['"]com\.android\.tools\.build:gradle:[\d\.]+['"]\)/g,
        `classpath('com.android.tools.build:gradle:${version}')`
      );
    }
    return config;
  });
};

module.exports = withCustomAGP;
