const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const activeWindow = require('active-win');
const screenshot = require('screenshot-desktop');
const mysql = require('mysql2/promise');
const schedule = require('node-schedule');

// MySQL Connection Pool
const dbPool = mysql.createPool({
    host: '193.203.184.97',
    user: 'u258276423_tracking',
    password: 'Saba@1997',
    database: 'u258276423_tracking',
    waitForConnections: true,
    connectionLimit: 10,
});

// Create Employee Window
let mainWindow;
app.on('ready', () => {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'renderer.js'),
        },
    });
    mainWindow.loadFile('index.html');
});

// State Variables
let appUsage = {};
let screenshots = [];

// Track Active Window
async function trackActiveWindow() {
    try {
        const currentWindow = await activeWindow();
        const now = Date.now();

        // Log idle time if no active window
        const activeApp = currentWindow ? currentWindow.owner.name : 'Idle';
        if (!appUsage[activeApp]) appUsage[activeApp] = { duration: 0 };
        appUsage[activeApp].duration += 1; // Increment duration by 1 second
    } catch (err) {
        console.error('Error tracking active window:', err);
    }
}

// Capture Screenshots (not shown to employees)
async function captureScreenshot() {
    try {
        const screenshotPath = path.join(__dirname, `screenshots/screenshot_${Date.now()}.png`);
        await screenshot({ filename: screenshotPath });
        screenshots.push(screenshotPath);
    } catch (err) {
        console.error('Error capturing screenshot:', err);
    }
}

// Sync Data with Server
async function syncData(employeeId) {
    const now = new Date();
    const connection = await dbPool.getConnection();
    try {
        // Insert app usage data
        for (const [app, data] of Object.entries(appUsage)) {
            await connection.execute(
                'INSERT INTO app_usage (employee_id, timestamp, apps) VALUES (?, ?, ?)',
                [
                    employeeId,
                    now.toISOString().slice(0, 19).replace('T', ' '),
                    JSON.stringify({ name: app, usage_time: data.duration }),
                ]
            );
        }

        // Upload screenshots
        for (const screenshot of screenshots) {
            // Code to upload to server or save locally
        }

        // Clear state
        appUsage = {};
        screenshots = [];
    } finally {
        connection.release();
    }
}

// Schedule Tasks
setInterval(trackActiveWindow, 1000); // Track every second
schedule.scheduleJob('*/15 * * * *', captureScreenshot); // Capture every 15 minutes
schedule.scheduleJob('0 */12 * * *', () => syncData(1)); // Sync every 12 hours
