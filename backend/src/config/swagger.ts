import swaggerJsdoc, { Options } from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import config from './index';

const swaggerOptions: Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Visión Max API',
      version: '1.0.0',
      description: 'API para el catálogo de películas Visión Max. Integración con TMDB.',
    },
    servers: [
      {
        url: `http://localhost:${config.port}`,
        description: 'Desarrollo local',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            error: { type: 'string' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.ts'],
};

export const specs = swaggerJsdoc(swaggerOptions);
export const swaggerDocs = swaggerUi.serve;
export const setupSwagger = swaggerUi.setup(specs, {
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info .title { color: #d4af37; }
  `,
  customSiteTitle: 'Visión Max API Docs',
});