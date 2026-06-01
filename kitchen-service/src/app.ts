import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import { connectDatabase } from './config/database';
import { connectMqtt } from './config/mqtt';
import kitchenRoutes from './routes/kitchen.routes';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['*'],
  credentials: true
}));

app.use(express.json());

app.use('/api/kitchen', kitchenRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'UP', service: 'kitchen-service' });
});

app.use(errorHandler);

const startServer = async () => {
  try {
    await connectDatabase();

    connectMqtt();

    app.listen(port, () => {
      console.log(`Microservicio de Cocina escuchando en el puerto ${port}`);
    });
  } catch (error) {
    console.error('Error al iniciar el servidor de cocina:', error);
    process.exit(1);
  }
};

startServer();
