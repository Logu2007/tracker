const { app, BrowserWindow } = require('electron');
const mysql = require('mysql2/promise');
const path = require('path');
const keyboardJS = require('keyboardjs');


let mainWindow;
let idleTime = 0;
let productiveTime = 0;
let lastActivityTime = Date.now();
let isIdle = false;
let sessionID = null; // Session ID for tracking
let employeeID = 1; // Example employee ID

// Database Pool
const dbPool = mysql.createPool({
    host: '193.203.184.97',
    user: 'u258276423_tracking',
    password: 'Saba@1997',
    database: 'u258276423_tracking',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

// Create Browser Window
const createWindow = () => {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    mainWindow.loadFile('index.html');
};

// Start a New Session
const startSession = async () => {
    const now = new Date();
    const [result] = await dbPool.execute(
        'INSERT INTO app_usage (employee_id, session_id, start_time) VALUES (?, ?, ?)',
        [employeeID, Date.now(), now.toISOString().slice(0, 19).replace('T', ' ')]
    );
    sessionID = result.insertId; // Get session ID
};

// End the Current Session
const endSession = async () => {
    if (sessionID) {
        const now = new Date();
        await dbPool.execute(
            'UPDATE app_usage SET end_time = ?, usage_time = usage_time + ?, is_idle = ? WHERE id = ?',
            [
                now.toISOString().slice(0, 19).replace('T', ' '),
                Math.floor((Date.now() - lastActivityTime) / 1000),
                isIdle,
                sessionID,
            ]
        );
    }
    sessionID = null;
};

let psList;

(async () => {
    // Dynamically import the ES Module
    psList = (await import('ps-list')).default;
})();

// Usage of psList after it's dynamically imported
const logApplications = async () => {
    try {
        const psList = await import('ps-list');
        const activeApps = await psList.default();
        const now = new Date();

        // Filter out common system processes
        const excludedApps = [
            'System', 'Idle', 'explorer.exe', 'Taskmgr.exe', 'svchost.exe', 
            'dwm.exe', 'conhost.exe', 'sihost.exe', 'RuntimeBroker.exe'
        ];
        
        const filteredApps = activeApps.filter(app => !excludedApps.includes(app.name));

        if (filteredApps.length === 0) return; // No relevant apps to log

        const connection = await dbPool.getConnection();
        try {
            for (const app of filteredApps) {
                await connection.execute(
                    'INSERT INTO app_usage (employee_id, timestamp, apps) VALUES (?, ?, ?)',
                    [
                        1, // Employee ID (example static value, replace with dynamic ID if needed)
                        now.toISOString().slice(0, 19).replace('T', ' '),
                        JSON.stringify({ name: app.name, memory: app.memory }) // Application name and memory usage
                    ]
                );
            }
        } finally {
            connection.release();
        }
    } catch (err) {
        console.error('Error logging applications:', err);
    }
};


// Update Activity
const updateActivity = () => {
    const now = Date.now();
    if (isIdle) {
        isIdle = false;
        lastActivityTime = now;
    } else {
        productiveTime += (now - lastActivityTime) / 1000;
        lastActivityTime = now;
    }
};

// Idle Checker
const checkIdleState = () => {
    const now = Date.now();
    if (!isIdle && now - lastActivityTime > 60 * 1000) { // 1 minute idle
        isIdle = true;
        idleTime += (now - lastActivityTime) / 1000;
        lastActivityTime = now;
    }
};

// Keyboard Activity Listener
keyboardJS.bind('*', () => {
    updateActivity();
    console.log('Keyboard activity detected');
});

// Periodically Log Applications
setInterval(logApplications, 30 * 1000);

// Periodically Check Idle State
setInterval(checkIdleState, 1000);

// Application Lifecycle Events
app.on('ready', async () => {
    createWindow();
    await startSession();
});

app.on('window-all-closed', async () => {
    await endSession();
    app.quit();
});
