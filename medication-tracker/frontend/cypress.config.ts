import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    setupNodeEvents(on, config) {
      on('task', {
        // Add custom tasks here if needed
        log(message) {
          console.log(message);
          return null;
        },
      });
    },
    env: {
      // Add environment variables here
      apiUrl: 'http://localhost:3001',
    },
    experimentalStudio: true,
    viewportWidth: 1280,
    viewportHeight: 720,
    video: false,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
  },
  component: {
    devServer: {
      framework: 'create-react-app',
      bundler: 'webpack',
    },
  },
});
