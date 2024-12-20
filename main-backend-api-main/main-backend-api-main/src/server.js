const Hapi = require('@hapi/hapi');
const routes = require('./routes');
const Inert = require('@hapi/inert');

const init = async () => {
  const server = Hapi.server({
    port: 443,
    host: '0.0.0.0',
    routes: {
      cors: {
        origin: ['*'],
      },
    },
  });

  server.route(routes);

  await server.start();
  console.log(`Server berjalan pada ${server.info.uri}`);
};

init();