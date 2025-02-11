const express = require('express');
const fileUpload = require('express-fileupload');
const cors = require('cors');
const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const app = express();
const port = 3001;

// Middleware
app.use(cors());
app.use(fileUpload({
  debug: true,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max file size
  abortOnLimit: true
}));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.send('Backend server is running.');
});

app.post('/upload', async (req, res) => {
  let filePath = null;
  try {
    if (!req.files) {
      console.error('No files object in request');
      return res.status(400).json({
        error: 'No files uploaded',
        details: 'Request is missing files'
      });
    }

    const file = req.files.file;
    if (!file) {
      console.error('No file found in request');
      return res.status(400).json({
        error: 'No file uploaded',
        details: 'No file found in request'
      });
    }

    let uploadDir = path.join(__dirname, 'uploads');
    filePath = path.join(uploadDir, `temp_${Date.now()}_${file.name}`);

    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Move the file
    try {
      await file.mv(filePath);
      console.log('File saved successfully:', filePath);
    } catch (moveError) {
      console.error('Error moving file:', moveError);
      return res.status(500).json({
        error: 'File upload failed',
        details: moveError.message
      });
    }

    const pythonPath = 'C:/Users/Rahul/AppData/Local/Programs/Python/Python313/python.exe';
    const pythonScript = path.join(__dirname, 'guitar_tabs.py');

    if (!fs.existsSync(pythonPath)) {
      return res.status(500).json({
        error: 'Configuration error',
        details: 'Python executable not found'
      });
    }

    if (!fs.existsSync(pythonScript)) {
      return res.status(500).json({
        error: 'Configuration error',
        details: 'Python script not found'
      });
    }

    const pythonProcess = execFile(pythonPath, 
      [pythonScript, filePath], // ONLY passing filePath
      { 
        maxBuffer: 1024 * 1024 * 100,
        timeout: 300000
      }, 
      async (error, stdout, stderr) => {
        console.log('Python process completed');
        console.log('stderr:', stderr);
        console.log('stdout:', stdout);

        // Clean up file
        try {
          if (fs.existsSync(filePath)) {
            await fs.promises.unlink(filePath);
          }
        } catch (cleanupError) {
          console.error('Error cleaning up file:', cleanupError);
        }

        if (error) {
          console.error('Python execution error:', error);
          return res.status(500).json({
            error: 'Processing failed',
            details: error.message,
            stderr: stderr
          });
        }

        try {
          // Try to parse the last line of stdout as JSON
          const lines = stdout.trim().split('\n');
          const lastLine = lines[lines.length - 1];
          const data = JSON.parse(lastLine);
          
          if (data.error) {
            return res.status(500).json({
              error: 'Processing error',
              details: data.error
            });
          }

          res.json(data);
        } catch (parseError) {
          console.error('Parse error:', parseError);
          console.error('Raw stdout:', stdout);
          return res.status(500).json({
            error: 'Failed to parse output',
            details: parseError.message,
            stdout: stdout
          });
        }
    });

    pythonProcess.on('error', (procError) => {
      console.error('Process spawn error:', procError);
      res.status(500).json({
        error: 'Failed to start processing',
        details: procError.message
      });
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    if (filePath && fs.existsSync(filePath)) {
      try {
        await fs.promises.unlink(filePath);
      } catch (cleanupError) {
        console.error('Error cleaning up file:', cleanupError);
      }
    }
    res.status(500).json({
      error: 'Server error',
      details: error.message
    });
  }
});

app.listen(port, () => {
  console.log(`Backend server running at http://localhost:${port}`);
});