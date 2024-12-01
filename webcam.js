const express = require('express');
const app = express();
const Webcam = require('node-webcam');
const multer = require('multer');
const fs = require('fs');

const upload = multer({ dest: './uploads/' });

app.get('/photo', (req, res) => {
  const opts = {
    width: 640,
    height: 480,
    quality: 100,
    saveShots: true,
    output: 'jpeg',
    device: false,
    callbackReturn: true,
    verbose: false
  };

  Webcam.capture('photo', opts, (err, data) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error capturing photo');
    } else {
      const photoBuffer = data;
      const photoName = `photo_${Date.now()}.jpg`;
      const uploadPath = `./uploads/${photoName}`;

      fs.writeFile(uploadPath, photoBuffer, (err) => {
        if (err) {
          console.error(err);
          res.status(500).send('Error saving photo');
        } else {
          console.log('Photo saved successfully!');
          res.send(`Photo saved successfully! ${photoName}`);
        }
      });
    }
  });
});

app.listen(4000, () => {
  console.log('Server started on port 3000!');
});