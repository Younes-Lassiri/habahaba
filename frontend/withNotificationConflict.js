const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withNotificationConflict(config) {
  return withAndroidManifest(config, (config) => {
    const mainApplication = config.modResults.manifest.application[0];

    // Add the 'tools' namespace so we can use 'tools:replace'
    config.modResults.manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';

    if (mainApplication['meta-data']) {
      // Find the specific meta-data causing the crash
      const notificationColor = mainApplication['meta-data'].find(
        (item) => item.$['android:name'] === 'com.google.firebase.messaging.default_notification_color'
      );

      if (notificationColor) {
        // Tell Android: "If there's a conflict, use my project's value"
        notificationColor.$['tools:replace'] = 'android:resource';
      }
    }

    return config;
  });
};