const { app, BrowserWindow, ipcMain } = require('electron');
const mysql = require('mysql2/promise');
const path = require('path');
const ioHook = require('iohook');

let mainWindow;
let idleTime = 0;
let productiveTime = 0;
let lastActivityTime = Date.now();
let isIdle = false;

// MySQL Database Connection
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

// Log Active Applications to MySQL
const logApplications = async () => {
    try {
        // Dynamically import `ps-list` when needed
        const psList = await import('ps-list');
        const activeApps = await psList.default(); // Use `default()` for default export
        const now = new Date();
        const connection = await dbPool.getConnection();

        try {
            for (const app of activeApps) {
                await connection.execute(
                    'INSERT INTO app_usage (employee_id, timestamp, apps) VALUES (?, ?, ?)',
                    [
                        1, // Example Employee ID
                        now.toISOString().slice(0, 19).replace('T', ' '),
                        JSON.stringify({ name: app.name, memory: app.memory }),
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

// Idle and Productive Time Tracking
ioHook.on('mousemove', () => updateActivity());
ioHook.on('keydown', () => updateActivity());
ioHook.on('mousedown', () => updateActivity());

// Update Activity State
const updateActivity = () => {
    const now = Date.now();
    if (isIdle) {
        isIdle = false;
        lastActivityTime = now;
        mainWindow.webContents.send('state-update', { isIdle, productiveTime, idleTime });
    } else {
        productiveTime += (now - lastActivityTime) / 1000;
        lastActivityTime = now;
    }
};

// Idle Checker
setInterval(() => {
    const now = Date.now();
    if (!isIdle && now - lastActivityTime > 60 * 1000) {
        isIdle = true;
        idleTime += (now - lastActivityTime) / 1000;
        lastActivityTime = now;
        mainWindow.webContents.send('state-update', { isIdle, productiveTime, idleTime });
    }
}, 1000);

// Periodically Log Applications
setInterval(logApplications, 30 * 1000);

app.on('ready', () => {
    createWindow();
    ioHook.start();
});

app.on('window-all-closed', () => app.quit());
