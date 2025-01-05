import app from './server.js';
import { config } from 'dotenv';

// Load environment variables;
config();

const PORT = process.env.PORT || 8000;

app.listen(PORT: unknown, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Health check available at http://localhost:${PORT}/health`);
  console.log(`API documentation available at http://localhost:${PORT}/api-docs`);
});
