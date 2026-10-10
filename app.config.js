// Android maps use OpenStreetMap; no Google Maps API key is required.
module.exports = ({ config }) => ({
  ...config,
  plugins: (config.plugins || []).filter(
    (plugin) =>
      (Array.isArray(plugin) ? plugin[0] : plugin) !== "react-native-maps",
  ),
});
