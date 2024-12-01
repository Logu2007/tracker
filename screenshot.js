const express = require('express');
const screenshot = require('screenshot-desktop');
const { CronJob } = require('cron');
const mysql = require('mysql2/promise'); // Ensure you're using promise version
const cors = require('cors');

const app = express();
const PORT = 4000;

(async function () {
    try {
        // Connect to the database using promise-based connection
        const db = await mysql.createConnection({
            host: '193.203.184.97',
            user: 'u258276423_tracking',
            password: 'Saba@1997',
            database: 'u258276423_tracking',
        });

        console.log('Connected to database successfully!');

        app.use(express.json());
        app.use(cors());

        async function captureScreenshot(employeeId) {
            const now = new Date();
            const filename = `screenshots/${employeeId}_${now.getTime()}.jpg`;

            try {
                await screenshot({ filename });
                console.log(`Screenshot saved: ${filename}`);
            } catch (err) {
                console.error('Screenshot failed:', err);
            }

            // Insert screenshot details into the database
            await db.execute(
                'INSERT INTO screenshots (employee_id, timestamp, file_path) VALUES (?, ?, ?)',
                [employeeId, now, filename]
            );
        }

        // Set up a CronJob to run every 30 seconds
        new CronJob('*/30 * * * * *', () => {
            const employeeId = 1; // Example employee ID
            captureScreenshot(employeeId);
        }).start();

        app.listen(PORT, () => {
            console.log(`Server running at http://localhost:${PORT}`);
        });

    } catch (err) {
        console.error('Error connecting to the database:', err);
    }
})();
