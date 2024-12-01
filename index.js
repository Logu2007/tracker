const express = require('express');
const app = express();
const { record } = require('node-record-lpcm16');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
app.use(cors({
    origin: 'http://127.0.0.1:8080', // Replace with your frontend's local URL
  }));

// Create a directory to store recordings
const recordingsDir = path.join(__dirname, 'recordings');
fs.mkdirSync(recordingsDir, { recursive: true });

let recordingProcess; // To handle the recording process globally

app.get('/button-click', (req, res) => {
  const buttonState = req.query.buttonState;
  if (buttonState === 'on') {
    const fileName = `recording-${Date.now()}.wav`;
    const filePath = path.join(recordingsDir, fileName);
    const file = fs.createWriteStream(filePath);

    recordingProcess = record({
      sampleRate: 44100,
      channels: 2,
    }).stream();

    recordingProcess.pipe(file);
    res.send('Recording started');
  } else if (buttonState === 'off' && recordingProcess) {
    recordingProcess.unpipe();
    recordingProcess = null;
    res.send('Recording stopped');
  } else {
    res.status(400).send('Invalid button state or no active recording');
  }
});

// Start the server
app.listen(5000, () => {
  console.log('Server started on port 5000');
});
