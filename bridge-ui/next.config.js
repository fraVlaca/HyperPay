/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = config.resolve.alias || {};
    config.resolve.alias['@google-cloud/pino-logging-gcp-config'] = false;
    return config;
  },
};
module.exports = nextConfig;
