import swaggerJsdoc = require('swagger-jsdoc');

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'JobConnect API',
      version: '1.0.0',
      description: 'AI-Powered Job Portal REST API',
    },
    servers: [
      {
        url: 'http://localhost:4000/api/v1',
        description: 'Local',
      },
      {
        url: 'https://jc-backend-dxuw.onrender.com/api/v1',
        description: 'Production',
      },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'token',
        },
      },
    },
  },
  apis: ['./src/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);