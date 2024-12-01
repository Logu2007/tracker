const { ipcRenderer } = require('electron');

// Display Productive and Idle Hours
function displayData(data) {
    const productiveTime = data.productive;
    const idleTime = data.idle;
    document.getElementById('productiveTime').innerText = `${productiveTime} hrs`;
    document.getElementById('idleTime').innerText = `${idleTime} hrs`;
}

// Request Data
setInterval(() => {
    ipcRenderer.invoke('get-data').then(displayData);
}, 5000); // Refresh every 5 seconds
