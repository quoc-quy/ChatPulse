const { withProjectBuildGradle, withSettingsGradle } = require('@expo/config-plugins');

/**
 * Expo Config Plugin to pin the Android Gradle Plugin (AGP) version
 * in both build.gradle and all version catalogs (libs and expoLibs) in settings.gradle.
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

  // 2. Modify settings.gradle to override both version catalogs
  config = withSettingsGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      // First, replace the standard expoAutolinking line
      config.modResults.contents = config.modResults.contents.replace(
        /expoAutolinking\.useExpoVersionCatalog\(\)/g,
        `expoAutolinking.useExpoVersionCatalog {\n  version("agp", "${version}")\n}`
      );

      // Next, append the global dependencyResolutionManagement block at the end of the file to force-override 'libs' and 'expoLibs'
      const overrideBlock = `
// Force AGP version override for both 'libs' and 'expoLibs' catalogs
dependencyResolutionManagement {
  versionCatalogs {
    libs {
      version("agp", "${version}")
    }
    expoLibs {
      version("agp", "${version}")
    }
  }
}
`;
      // Append it if not already present
      if (!config.modResults.contents.includes('dependencyResolutionManagement')) {
        config.modResults.contents += overrideBlock;
      }
    }
    return config;
  });

  return config;
};

module.exports = withCustomAGP;
