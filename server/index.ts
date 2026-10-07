import express from "express";
import path from "path";
import { createServer } from "node:http";
import { createServer as createViteServer } from "vite";
import { setupMockApi } from "./dev/mockApi";

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
const httpServer = createServer(app);

  setupMockApi(app);

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: { server: httpServer },
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`\n  ➜  Local:   http://localhost:${PORT}/`);
    console.log(`  ➜  Network: http://127.0.0.1:${PORT}/\n`);
  });
}

startServer();
