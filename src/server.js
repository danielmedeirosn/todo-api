const app = require('./app');
const { migrate, pool } = require('./db');

const port = Number(process.env.PORT || 3000);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  // Aguarda o MySQL ficar disponível (até 60 s) antes de subir a API
  for (let i = 1; i <= 30; i++) {
    try {
      await migrate();
      break;
    } catch (err) {
      if (i === 30) throw err;
      console.log(`aguardando MySQL (tentativa ${i})...`);
      await sleep(2000);
    }
  }
  const server = app.listen(port, () => console.log(`todo-api ouvindo na porta ${port}`));

  // Desligamento gracioso: o Kubernetes envia SIGTERM antes de matar o pod
  const shutdown = () => server.close(async () => {
    await pool.end();
    process.exit(0);
  });
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
})();
