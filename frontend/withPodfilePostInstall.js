const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfilePath, 'utf8');

      // Add post_install hook if not already present
      if (!contents.includes('# allow non-modular includes for react-native-maps')) {
        const postInstallHook = `
post_install do |installer|
  # allow non-modular includes for react-native-maps
  installer.pods_project.targets.each do |target|
    # react-native-maps target names can vary; use a broad match
    if target.name.include?('react-native-maps') || target.name.include?('react_native_maps')
      target.build_configurations.each do |config|
        config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
      end
    end
  end
end
`;
        contents += postInstallHook;
        fs.writeFileSync(podfilePath, contents);
      }
      return config;
    },
  ]);
};