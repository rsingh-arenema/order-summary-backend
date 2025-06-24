import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import orderRoutes from '../src/routes/orders.js';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';

const swaggerDocument = YAML.load('./docs/swagger.yaml');


dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
app.use('/orders', orderRoutes);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
const PORT = process.env.PORT || 5000;
export default () => app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
