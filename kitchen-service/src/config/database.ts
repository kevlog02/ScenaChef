import mongoose from 'mongoose';

export const connectDatabase = async (): Promise<void> => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/kitchen_db';
  
  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('MongoDB conectado correctamente');
  } catch (error) {
    console.error('Error conectando a MongoDB:', error);
    process.exit(1);
  }

  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB desconectado, intentando reconectar...');
  });
};
