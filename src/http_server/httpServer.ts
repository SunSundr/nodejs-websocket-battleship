import * as fs from 'node:fs';
import * as path from 'node:path';
import * as http from 'node:http';

export const httpServer = http.createServer((req, res) => {
  const __dirname = path.resolve(path.dirname(''));
  const filePath = path.join(__dirname, req.url === '/' ? 'front/index.html' : `front${req.url}`);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      console.log('ERROR', filePath);
      res.writeHead(404);
      res.end(JSON.stringify(err));

      return;
    }

    res.writeHead(200);
    res.end(data);
  });
});
