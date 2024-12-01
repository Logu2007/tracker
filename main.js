import { app, BrowserWindow } from 'electron';
import { CronJob } from 'cron';
import mysql from 'mysql2/promise';
import psList from 'ps-list';
import activeWindow from 'active-win';
import path from 'path';

// Create a connection pool
const dbPool = mysql.createPool({
    host: '193.203.184.97',
    user: 'u258276423_tracking',
    password: 'Saba@1997',
    database: 'u258276423_tracking',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

console.log('Database connected successfully!');

// State to track app usage
let appUsage = {}; // { app_name: total_seconds }
let lastActiveApp = null;
let lastActiveTime = Date.now();

// List of apps to track individually
const trackedApps = [
    'chrome.exe', 'firefox.exe', 'devenv.exe', 'acrord32.exe', 'msedge.exe'
];

// Function to log active application usage
async function trackUsage() {
    try {
        const now = Date.now();
        const activeApp = await getActiveApplication();
        const elapsed = (now - lastActiveTime) / 1000; // Time in seconds

        if (lastActiveApp && trackedApps.includes(lastActiveApp)) {
            appUsage[lastActiveApp] = (appUsage[lastActiveApp] || 0) + elapsed;
        } else if (lastActiveApp && !trackedApps.includes(lastActiveApp)) {
            // Group non-tracked apps under "Other Applications"
            appUsage['Other Applications'] = (appUsage['Other Applications'] || 0) + elapsed;
        }

        lastActiveApp = activeApp ? activeApp.name : 'Idle';
        lastActiveTime = now;
    } catch (err) {
        console.error('Error tracking usage:', err);
    }
}

// Function to get the currently active application
async function getActiveApplication() {
    try {
        const window = await activeWindow();
        return window ? { name: window.owner.name.toLowerCase() } : null;
    } catch (err) {
        console.error('Error getting active application:', err);
        return null;
    }
}

// Track whether the database logging process is running
let isLogging = false;

// Function to log usage data to the database
async function logToDatabase(employeeId) {
    if (isLogging) {
        // Prevent concurrent executions
        return;
    }

    isLogging = true;

    try {
        const now = new Date();
        const entries = Object.entries(appUsage);

        // Ensure unique entries for each application
        const uniqueEntries = new Map();

        for (const [app, duration] of entries) {
            if (!uniqueEntries.has(app)) {
                uniqueEntries.set(app, duration);
            } else {
                uniqueEntries.set(app, uniqueEntries.get(app) + duration);
            }
        }

        // Insert usage data for each unique application
        const connection = await dbPool.getConnection();
        try {
            for (const [app, duration] of uniqueEntries) {
                const timestamp = now.toISOString().slice(0, 19).replace('T', ' ');

                // Insert only if a similar record doesn't already exist
                await connection.execute(
                    `INSERT INTO app_usage (employee_id, timestamp, apps)
                    SELECT ?, ?, ? 
                    FROM DUAL
                    WHERE NOT EXISTS (
                        SELECT 1 FROM app_usage
                        WHERE employee_id = ? AND timestamp = ? AND apps = ? 
                    )`,
                    [
                        employeeId,
                        timestamp,
                        JSON.stringify({ name: app, usage_time: duration.toFixed(3) }),
                        employeeId,
                        timestamp,
                        JSON.stringify({ name: app, usage_time: duration.toFixed(3) })
                    ]
                );
            }
        } finally {
            connection.release();
        }

        // Reset appUsage after logging
        appUsage = {};
    } catch (err) {
        console.error('Error logging to database:', err);
    } finally {
        isLogging = false;
    }
}

// Set up a Cron job to track usage every second and log data every 12 hours
const trackJob = new CronJob('* * * * * *', trackUsage); // Track every second
const logJob = new CronJob('0 */12 * * *', async () => {
    const employeeId = 1; // Example employee ID
    await logToDatabase(employeeId);
});

trackJob.start();
logJob.start();
console.log('Tracking and logging jobs started.');

// Define startSession and endSession functions
async function startSession() {
    try {
        // Add logic for session start here (e.g., log session start in the database)
        console.log('Session started.');
    } catch (err) {
        console.error('Error starting session:', err);
    }
}

async function endSession() {
    try {
        // Add logic for session end here (e.g., log session end in the database)
        console.log('Session ended.');
    } catch (err) {
        console.error('Error ending session:', err);
    }
}

// Function to create the main window
let mainWindow;


function createWindow() {
    // Create the browser window.
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true, // Allow node.js integration in the window
        },
    });

    // Load the index.html file using an absolute path
    mainWindow.loadFile(path.join(__dirname, 'index.html')); // Correct the file path

    // Open the DevTools (optional).
   // mainWindow.webContents.openDevTools();

    // Emit when the window is closed.
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// Application Lifecycle Events
app.on('ready', async () => {
    createWindow(); // Call createWindow here
    await startSession(); // Start session when the app is ready
});

app.on('window-all-closed', async () => {
    await endSession(); // End session when all windows are closed
    app.quit();
});
