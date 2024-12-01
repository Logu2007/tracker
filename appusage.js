import { CronJob } from 'cron';
import mysql from 'mysql2/promise';
import psList from 'ps-list';
import activeWindow from 'active-win';

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

// Function to log active application usage
async function trackUsage() {
    try {
        const now = Date.now();
        const activeApp = await getActiveApplication();
        const elapsed = (now - lastActiveTime) / 1000;

        if (lastActiveApp) {
            appUsage[lastActiveApp] = (appUsage[lastActiveApp] || 0) + elapsed;
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
        return window ? { name: window.owner.name } : null;
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
                // Use a key like employee ID + app name + timestamp to prevent duplicate inserts
                const timestamp = now.toISOString().slice(0, 19).replace('T', ' ');

                // Insert only if a similar record doesn't already exist
                await connection.execute(
                    `
                    INSERT INTO app_usage (employee_id, timestamp, apps)
                    SELECT ?, ?, ?
                    FROM DUAL
                    WHERE NOT EXISTS (
                        SELECT 1 FROM app_usage
                        WHERE employee_id = ? AND timestamp = ? AND apps = ?
                    )
                    `,
                    [
                        employeeId,
                        timestamp,
                        JSON.stringify({ name: app, usage_time: duration.toFixed(3) }),
                        employeeId,
                        timestamp,
                        JSON.stringify({ name: app, usage_time: duration.toFixed(3) }),
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
