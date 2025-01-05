// Configuration settings
const config = {
    development: {
        apiUrl: 'http://localhost:5000',
        wsUrl: 'ws://localhost:5000',
        environment: 'development'
    },
    beta: {
        apiUrl: 'https://beta.getmedminder.com',
        wsUrl: 'wss://beta.getmedminder.com',
        environment: 'beta'
    },
    production: {
        apiUrl: 'https://getmedminder.com',
        wsUrl: 'wss://getmedminder.com',
        environment: 'production'
    }
};

export default config[process.env.NODE_ENV || 'development'];
