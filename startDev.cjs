const { spawn } = require('child_process');

const platform = process.platform;
const signal = platform === 'win32' ? 'SIGINT' : 'SIGUSR2';

const command = 'nodemon';
const args = [];

const nodemonProcess = spawn(command, args);

nodemonProcess.stdout.on('data', (data) => {
  console.log(`Nodemon: ${data}`);
});

nodemonProcess.stderr.on('data', (data) => {
  console.error(`Nodemon error: ${data}`);
});

nodemonProcess.on('close', (code) => {
  console.log(`Nodemon exited with code ${code}`);
});