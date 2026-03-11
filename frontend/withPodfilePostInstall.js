const { withMod } = require('@expo/config-plugins');

module.exports = (config) => {
  return withMod(config, {
    platform: 'ios',
    mod: 'podfile',
    action: (config) => {
      let contents = config.modResults.contents;

      const heavyFix = `
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        # This is the "Magic" flag that stops the non-modular error
        config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
        # This ensures the compiler doesn't treat the warning as a hard error
        config.build_settings['OTHER_CFLAGS'] = '-Wno-error=non-modular-include-in-framework-module'
      end
    end
`;

      if (contents.includes('post_install do |installer|')) {
        contents = contents.replace(
          /post_install do \|installer\|/,
          `post_install do |installer|${heavyFix}`
        );
      } else {
        contents += `\npost_install do |installer|\n${heavyFix}\nend\n`;
      }

      config.modResults.contents = contents;
      return config;
    },
  });
};