const fs = require("fs");
const path = require("path");

const { expo } = require("./app.json");

function loadLocalEnv() {
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) return {};

  return fs
    .readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .reduce((values, line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return values;

      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex === -1) return values;

      const key = trimmed.slice(0, separatorIndex).trim();
      const value = trimmed.slice(separatorIndex + 1).trim();
      values[key] = value.replace(/^["']|["']$/g, "");
      return values;
    }, {});
}

const localEnv = loadLocalEnv();
const googleMapsApiKey =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ??
  localEnv.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ??
  process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ??
  localEnv.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;

module.exports = {
  expo: {
    ...expo,
    android: {
      ...expo.android,
      ...(googleMapsApiKey
        ? {
            config: {
              ...expo.android?.config,
              googleMaps: {
                ...expo.android?.config?.googleMaps,
                apiKey: googleMapsApiKey,
              },
            },
          }
        : {}),
    },
  },
};
