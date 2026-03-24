const readRequiredEnv = (name) => {
  const value = process.env[name];
  return typeof value === 'string' ? value.trim() : '';
};

const config = {
  port: Number(process.env.PORT) || 3001,
  unofficialApiBaseUrl: readRequiredEnv('NETEASE_UNOFFICIAL_BASE_URL') || 'http://127.0.0.1:3000'
};

module.exports = { config };
