let connection = createWebSocket();
let heartbeatInterval; // Interval for sending pings
let lastPongTime = Date.now(); // Tracks the last pong response time

// Cache DOM elements
const pumpButton1 = document.getElementById("pump1-button");
const pumpButton2 = document.getElementById("pump2-button");
const autoButtonSwitch = document.getElementById("auto-button");
const pumpLogo = document.getElementById("pumpIcon");
const tempValueElement = document.getElementById("temperature-value");
const humidityValueElement = document.getElementById("humidity-value");
const moisture1ValueElement = document.getElementById("moisture1-value");
const moisture2ValueElement = document.getElementById("moisture2-value");
const thermoIcon = document.getElementById("thermoIcon");
const sensorChartCtx = document.getElementById('sensorChart').getContext('2d');
const connectionStatus = document.getElementById("connection-status");

// WebSocket creation and reconnection logic
function createWebSocket() {
    const ws = new WebSocket('wss://' + location.hostname + '/ws/');

    ws.onopen = () => {
        console.log('WebSocket connected.');
        updateConnectionStatus('Connected', 'connected');
        startHeartbeat(ws); // Start heartbeat when connected
    };

    ws.onclose = () => {
        console.error('WebSocket closed. Reconnecting...');
        updateConnectionStatus('Reconnecting...', 'disconnected');
        stopHeartbeat(); // Stop heartbeat when disconnected
        setTimeout(() => {
            connection = createWebSocket();
        }, 3000);
    };

    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        updateConnectionStatus('Error', 'error');
    };

    ws.onmessage = (event) => {
        if (event.data === "pong") {
            // Reset pong timer on receiving a pong
            lastPongTime = Date.now();
        } else {
            try {
                const data = JSON.parse(event.data);
                updateUI(data);
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        }
    };

    return ws;
}

// Update connection status display
function updateConnectionStatus(statusText, state) {
    if (connectionStatus) {
        connectionStatus.classList.remove('connected','disconnected','error');
        connectionStatus.textContent = statusText;
        connectionStatus.classList.add(state);
    }
}

// Heartbeat mechanism
function startHeartbeat(ws) {
    lastPongTime = Date.now();

    // Send a ping every 5 seconds
    heartbeatInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send("ping");
        }

        // Check if the last pong was received more than 10 seconds ago
        if (Date.now() - lastPongTime > 10000) {
            console.warn('Heartbeat failed. Connection seems lost.');
            updateConnectionStatus('Disconnected', 'red');
            ws.close(); // Force close the WebSocket
        }
    }, 5000);
}

function stopHeartbeat() {
    clearInterval(heartbeatInterval);
}

// Update UI elements
function updateUI(data) {
    requestAnimationFrame(() => {
        tempValueElement.textContent = `${data.temp} °C`;
        humidityValueElement.textContent = `${data.hum}%`;
        moisture1ValueElement.textContent = `${data.moisOne}%`;
        moisture2ValueElement.textContent = `${data.moisTwo}%`;

        updateButtonState(pumpButton1, data.pump1);
        updateButtonState(pumpButton2, data.pump2);
        updateButtonState(autoButtonSwitch, data.autoSwitch);

        updateMeter('moisture1-meter', data.moisOne);
        updateMeter('moisture2-meter', data.moisTwo);
        updateTemperatureIcon(data.temp);

        updatePumpLogo(data.pump1 || data.pump2);
        fetchAndUpdateChart(data);
    });
}

function updateButtonState(button, isActive) {
    button.classList.toggle('active', isActive);
}

function updateMeter(id, value) {
    const meter = document.getElementById(id);
    const percentage = Math.min(100, Math.max(0, value));

    meter.style.width = `${percentage}%`;
    meter.style.background =
        percentage <= 10
            ? 'linear-gradient(to right, red, darkred)'
            : percentage >= 80
            ? 'linear-gradient(to right, #00D4FF, #0961FB)'
            : 'linear-gradient(to right, #0EA5E9, #0077B6)';
}

function updateTemperatureIcon(tempValue) {
    if (tempValue <= 20) {
        thermoIcon.src = "./resources/temperature-empty.svg";
        tempValueElement.style.color = "#74C0FC";
    } else if (tempValue >= 35) {
        thermoIcon.src = "./resources/temperature-full-solid.svg";
        tempValueElement.style.color = "red";
    } else {
        thermoIcon.src = "./resources/temperature-half-solid.svg";
        tempValueElement.style.color = "orange";
    }
}

function updatePumpLogo(isActive) {
    const newSrc = isActive
        ? "./resources/faucet-drip-solid.svg"
        : "./resources/faucet-solid.svg";
    if (pumpLogo.src !== newSrc) pumpLogo.src = newSrc;
}

// Initialize Chart.js
const sensorChart = new Chart(sensorChartCtx, {
    type: 'line',
    data: {
        labels: [],
        datasets: [
            {
                label: 'Temperature (°C)',
                data: [],
                borderColor: 'red',
                fill: false,
            },
            {
                label: 'Humidity (%)',
                data: [],
                borderColor: 'blue',
                fill: false,
            },
            {
                label: 'Moisture 1 (%)',
                data: [],
                borderColor: '#AF58BE',
                fill: false,
            },
            {
                label: 'Moisture 2 (%)',
                data: [],
                borderColor: '#01CCC9',
                fill: false,
            },
        ],
    },
    options: {
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: 2,
        scales: {
            x: {
                title: {
                    display: true,
                    text: 'Time',
                },
                ticks: {
                    padding: 10,
                },
            },
            y: {
                title: {
                    display: true,
                    text: 'Values',
                },
                min: 0,
                max: 100,
            },
        },
    },
});

let tempSum = 0,
    humSum = 0,
    moisOneSum = 0,
    moisTwoSum = 0,
    count = 0;
let lastUpdateTime = Date.now();

function fetchAndUpdateChart(data) {
    tempSum += data.temp;
    humSum += data.hum;
    moisOneSum += data.moisOne;
    moisTwoSum += data.moisTwo;
    count++;

    const now = Date.now();
    if (now - lastUpdateTime >= 1500) {
        lastUpdateTime = now;

        const avgTemp = tempSum / count;
        const avgHum = humSum / count;
        const avgMoisOne = moisOneSum / count;
        const avgMoisTwo = moisTwoSum / count;

        tempSum = humSum = moisOneSum = moisTwoSum = count = 0;

        const timestamp = new Date().toLocaleTimeString();

        sensorChart.data.labels.push(timestamp);
        sensorChart.data.datasets[0].data.push(avgTemp);
        sensorChart.data.datasets[1].data.push(avgHum);
        sensorChart.data.datasets[2].data.push(avgMoisOne);
        sensorChart.data.datasets[3].data.push(avgMoisTwo);

        if (sensorChart.data.labels.length > 50) {
            sensorChart.data.labels.shift();
            sensorChart.data.datasets.forEach((dataset) => dataset.data.shift());
        }

        sensorChart.update();
    }
}

// Handle toggle button clicks
const toggleButtons = document.querySelectorAll('.toggle-button');
toggleButtons.forEach((button) => {
    button.addEventListener('click', () => {
        button.classList.toggle('active');
        sendData();
    });
});

function sendData() {
    const full_data = JSON.stringify({
        pump1: pumpButton1.classList.contains('active') ? 1 : 0,
        pump2: pumpButton2.classList.contains('active') ? 1 : 0,
        autoSwitch: autoButtonSwitch.classList.contains('active') ? 1 : 0,
    });

    connection.send(full_data);
}
