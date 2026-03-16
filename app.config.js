// Dynamic config that injects environment variables into extra
const appJson = require('./app.json');

module.exports = ({ config }) => {
  const merged = {
    ...config,
    ...appJson.expo,
    extra: {
      ...appJson.expo.extra,
      mapboxToken: process.env.MAPBOX_TOKEN || '',
    },
  };
  return merged;
};
