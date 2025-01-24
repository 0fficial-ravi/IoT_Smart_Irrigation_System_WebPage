var connection = new WebSocket('wss://' + location.hostname + '/ws/');


var pumpButton1 = document.getElementById("pump1-button");
var pumpButton2 = document.getElementById("pump2-button");
var autoButtonSwitch = document.getElementById("auto-button");
var pumpLogo = document.getElementById("pumpIcon");

connection.onmessage = function (event) {
    var full_data = event.data;
    console.log(full_data);
    var data = JSON.parse(full_data);

    // Update sensor values
    document.getElementById("temperature-value").innerHTML = data.temp + " °C";
    document.getElementById("humidity-value").innerHTML = data.hum + "%";
    document.getElementById("moisture1-value").innerHTML = data.moisOne + "%";
    document.getElementById("moisture2-value").innerHTML = data.moisTwo + "%";

    // Update button states
    updateButtonState(pumpButton1, data.pump1);
    updateButtonState(pumpButton2, data.pump2);
    updateButtonState(autoButtonSwitch, data.autoSwitch);

    // Update dynamic elements
    updateMeter('moisture1-meter', data.moisOne);
    updateMeter('moisture2-meter', data.moisTwo);
    updateTemperatureIcon(data.temp);
    fetchAndUpdateChart(data);

    // Update pump logo based on active buttons
    if (data.pump1 || data.pump2) {
        pumpLogo.src = "./resources/faucet-drip-solid.svg";
    } else {
        pumpLogo.src = "./resources/faucet-solid.svg";
    }
};

// Function to update button states
function updateButtonState(button, isActive) {
    if (isActive) {
        button.classList.add('active');
    } else {
        button.classList.remove('active');
    }
}



// Initialize the chart
const ctx = document.getElementById('sensorChart').getContext('2d');

const sensorChart = new Chart(ctx, {
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
        maintainAspectRatio: true, // Keep a fixed aspect ratio
        aspectRatio: 2, // Chart width to height ratio
        scales: {
            x: {
                title: {
                    display: true,
                    text: 'Time',
                },
            },
            x: {
                ticks: {
                    padding: 10 // Increase the padding between labels
                }
            },
            y: {
                title: {
                    display: true,
                    text: 'Values',
                },
                min:0,
                max:100,
            },
        },
    },
});

let lastUpdateTime = Date.now();
let tempSum = 0,
    humSum = 0,
    moisOneSum = 0,
    moisTwoSum = 0;
let count = 0;

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


// Function to send data back to the server
function send_data() {
    const pumpOneStatus = pumpButton1.classList.contains('active') ? 1 : 0;
    const pumpTwoStatus = pumpButton2.classList.contains('active') ? 1 : 0;
    const autoModeValue = autoButtonSwitch.classList.contains('active') ? 1 : 0;

    const full_data = JSON.stringify({
        pump1: pumpOneStatus,
        pump2: pumpTwoStatus,
        autoSwitch: autoModeValue,
    });

    console.log(full_data);
    connection.send(full_data);
}

// Handle toggle button clicks
const toggleButtons = document.querySelectorAll('.toggle-button');
toggleButtons.forEach(button => {
    button.addEventListener('click', () => {
        button.classList.toggle('active');
        send_data();
    });
});

// Update meter fills dynamically
function updateMeter(id, value) {
    const meter = document.getElementById(id);
    const percentage = Math.min(100, Math.max(0, value));
    meter.style.width = percentage + '%';

    if (percentage <= 10) {
        meter.style.background = 'linear-gradient(to right, red, darkred)';
    } else if (percentage >= 80) {
        meter.style.background = 'linear-gradient(to right, #00D4FF, #0961FB)';
    } else {
        meter.style.background = 'linear-gradient(to right, #0EA5E9, #0077B6)';
    }
}

// Update temperature icon dynamically
function updateTemperatureIcon(tempValue) {
    const tempLogo = document.getElementById("thermoIcon");
    const tempValueElement = document.getElementById("temperature-value");

    if (tempValue <= 20) {
        tempLogo.src = "./resources/temperature-empty.svg";
        tempValueElement.style.color = "#74C0FC";
    } else if (tempValue >= 35) {
        tempLogo.src = "./resources/temperature-full-solid.svg";
        tempValueElement.style.color = "red";
    } else {
        tempLogo.src = "./resources/temperature-half-solid.svg";
        tempValueElement.style.color = "orange";
    }
    tempValueElement.textContent = tempValue + ' °C';
}
