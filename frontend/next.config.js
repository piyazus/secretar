const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // lib/ лежит на уровень выше frontend/ (общий код для frontend и будущих сервисов)
  experimental: {
    externalDir: true,
  },
  webpack: (config) => {
    // Чтобы импорты из ../lib (googleapis, pg и т.д.) резолвились
    // из frontend/node_modules
    config.resolve.modules = [
      path.resolve(__dirname, "node_modules"),
      ...(config.resolve.modules ?? ["node_modules"]),
    ];
    return config;
  },
};

module.exports = nextConfig;
