const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

function withSwiftConcurrencyFix(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let podfile = fs.readFileSync(podfilePath, 'utf8');

      const snippet = `
    # Fix Swift 6 strict concurrency for widget-related pods
    installer.pods_project.targets.each do |target|
      if ['ExpoModulesCore', 'expo-widgets', 'ExpoUI'].include?(target.name)
        target.build_configurations.each do |build_config|
          build_config.build_settings['SWIFT_STRICT_CONCURRENCY'] = 'minimal'
          build_config.build_settings['SWIFT_COMPILATION_MODE'] = 'singlefile'
        end
      end
    end`;

      if (podfile.includes('post_install do |installer|')) {
        podfile = podfile.replace(
          /post_install do \|installer\|/,
          `post_install do |installer|${snippet}`
        );
      }

      fs.writeFileSync(podfilePath, podfile);
      return config;
    },
  ]);
}

module.exports = withSwiftConcurrencyFix;
