import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import { connectDatabase } from './config/database';
import { connectMqtt } from './config/mqtt';
import kitchenRoutes from './routes/kitchen.routes';
import { errorHandler } from './middleware/errorHandler';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Setup Middleware
app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['*'],
  credentials: true
}));

app.use(express.json());

// REST APIs
app.use('/api/kitchen', kitchenRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'UP', service: 'kitchen-service' });
});

// Error handling middleware
app.use(errorHandler);

// Connect databases & services, then start server
const startServer = async () => {
  try {
    // 1. Connect MongoDB
    await connectDatabase();

    // 2. Connect MQTT Broker
    connectMqtt();

    // 3. Listen on Port
    app.listen(port, () => {
      console.log(`Microservicio de Cocina escuchando en el puerto ${port}`);
    });
  } catch (error) {
    console.error('Error al iniciar el servidor de cocina:', error);
    process.exit(1);
  }
};

startServer();
