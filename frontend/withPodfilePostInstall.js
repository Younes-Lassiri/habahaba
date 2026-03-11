const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfilePath, 'utf8');

      // The code to inject for react-native-maps
      const mapsFix = `
  # allow non-modular includes for react-native-maps
  installer.pods_project.targets.each do |target|
    if target.name.include?('react-native-maps') || target.name.include?('react_native_maps')
      target.build_configurations.each do |config|
        config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
      end
    end
  end
`;

      // Look for an existing post_install block
      const postInstallRegex = /(^\s*post_install\s+do\s*\|[^|]*\|.*?)(\n\s*end\b)/ms;
      const match = contents.match(postInstallRegex);

      if (match) {
        // Existing block found – insert our code before its 'end'
        const [fullBlock, blockStart, blockEnd] = match;
        const newBlock = blockStart + mapsFix + blockEnd;
        contents = contents.replace(fullBlock, newBlock);
      } else {
        // No post_install yet – append a new one at the end
        const newHook = `
post_install do |installer|${mapsFix}
end
`;
        contents += newHook;
      }

      fs.writeFileSync(podfilePath, contents);
      return config;
    },
  ]);
};