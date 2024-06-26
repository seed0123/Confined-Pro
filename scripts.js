let scatterChart;
const deviceData = {};
const deviceIndexMap = {}; // Maps device index to original device name
let deviceNames = [];
let lastKnownTemperature = {}; // Track last known temperature for each device
let consecutiveSameTemperatureCount = {}; // Track consecutive same temperature counts
const shapes = ['circle', 'triangle', 'rect', 'cross', 'star', 'line', 'dash'];

document.addEventListener("DOMContentLoaded", function () {
    const urlParams = new URLSearchParams(window.location.search);
    const permit = urlParams.get('permit');

    if (permit) {
        document.getElementById('permitTitle').textContent = permit.charAt(0).toUpperCase() + permit.slice(1) + " Devices";
        initializeScatterPlot();
        fetchAndRenderDevices(permit); // Initial fetch and render
        setInterval(() => fetchAndRenderDevices(permit), 15000); // Auto update every 15 seconds
        updateLastUpdatedTime(); // Update initial last updated time
        setInterval(updateLastUpdatedTime, 1000); // Update last updated time every second
    }

    const deviceForm = document.getElementById('deviceForm');
    deviceForm.addEventListener('submit', function(event) {
        event.preventDefault();
        deviceNames = [];
        const formData = new FormData(deviceForm);
        for (let [key, value] of formData.entries()) {
            deviceNames.push(value || `Device ${deviceNames.length + 1}`);
        }
        fetchAndRenderDevices(permit); // Re-fetch and render with new names
    });
});

function initializeScatterPlot() {
    const ctx = document.getElementById('movementChart').getContext('2d');
    scatterChart = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'Devices',
                data: [], // Empty initially
                backgroundColor: function(context) {
                    const isMoving = context.raw?.isMoving;
                    return isMoving === 2 ? 'green' : (isMoving === 1 ? 'orange' : 'red');
                },
                pointStyle: function(context) {
                    return shapes[context.dataIndex % shapes.length]; // Assign a shape based on device index
                }
            }]
        },
        options: {
            scales: {
                x: {
                    type: 'linear',
                    position: 'bottom',
                    min: 15,
                    max: 18
                },
                y: {
                    type: 'linear',
                    min: 78,
                    max: 81
                }
            },
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        generateLabels: function(chart) {
                            const data = chart.data.datasets[0].data;
                            return data.map((device, index) => ({
                                text: deviceNames[index] || `Device ${index + 1}`,
                                fillStyle: chart.data.datasets[0].backgroundColor[index],
                                strokeStyle: chart.data.datasets[0].backgroundColor[index],
                                pointStyle: shapes[index % shapes.length]
                            }));
                        }
                    }
                }
            }
        }
    });
}

async function fetchAndRenderDevices(permit) {
    const channels = {
        kilns: ['2573701', '2581068'],
        preheaters: ['2581070', '2581071'],
        crushers: ['2581072', '2581073']
    };

    const channelIds = channels[permit] || [];

    for (let index = 0; index < channelIds.length; index++) {
        const channelId = channelIds[index];
        try {
            const response = await fetch(`https://api.thingspeak.com/channels/${channelId}/feeds.json?results=1`);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();
            const feeds = data.feeds;
            const originalDeviceName = `Device ${index + 1}`; // Use this as the key for deviceData
            const deviceName = deviceNames[index] || originalDeviceName;

            if (feeds.length > 0) {
                const lastFeed = feeds[0];
                const isMoving = mapMovementStatus(lastFeed.field2); // Map field2 to 0, 1, or 2
                const temperature = parseFloat(lastFeed.field1).toFixed(2);
                const xCoordinate = parseFloat(lastFeed.field3); // Assuming field1 is x-coordinate
                const yCoordinate = parseFloat(lastFeed.field4); // Assuming field2 is y-coordinate

                // Determine if device is powered off
                let powerOffStatus = false;
                if (lastKnownTemperature[originalDeviceName] === temperature) {
                    consecutiveSameTemperatureCount[originalDeviceName] = consecutiveSameTemperatureCount[originalDeviceName] ? consecutiveSameTemperatureCount[originalDeviceName] + 1 : 1;
                    if (consecutiveSameTemperatureCount[originalDeviceName] >= 3) {
                        powerOffStatus = true;
                    }
                } else {
                    lastKnownTemperature[originalDeviceName] = temperature;
                    consecutiveSameTemperatureCount[originalDeviceName] = 0;
                }

                // Update device data for scatter plot
                deviceData[originalDeviceName] = { x: xCoordinate, y: yCoordinate, isMoving };

                deviceIndexMap[index] = originalDeviceName; // Map index to original device name

                renderOrUpdateDevice(deviceName, isMoving, temperature, index, powerOffStatus);
            }
        } catch (error) {
            console.error('Error fetching device data:', error);
        }
    }
    updateScatterPlot();
}

function mapMovementStatus(field2) {
    switch (field2) {
        case '0':
            return 0; // No Movement
        case '1':
            return 1; // Warning
        case '2':
            return 2; // Movement Detected
        default:
            return 0; // Default to No Movement
    }
}

function renderOrUpdateDevice(deviceName, isMoving, temperature, index, powerOffStatus) {
    const container = document.getElementById('deviceContainer');
    let deviceElement = document.querySelector(`.device[data-index="${index}"]`);

    if (!deviceElement) {
        deviceElement = document.createElement('div');
        deviceElement.classList.add('device');
        deviceElement.setAttribute('data-index', index);

        const trafficLightDiv = document.createElement('div');
        trafficLightDiv.classList.add('traffic-light', trafficLightClass(isMoving));

        // Add unique classes or IDs to identify child elements
        deviceElement.innerHTML = `
            <strong class="device-name">${deviceName}</strong><br>
            <span class="device-temperature">Temperature: ${temperature}°C</span><br>
            <span class="device-movement">Movement: ${movementText(isMoving)}</span>
        `;

        deviceElement.appendChild(trafficLightDiv);
        container.appendChild(deviceElement);
    } else {
        updateDevice(deviceElement, deviceName, isMoving, temperature, powerOffStatus);
    }
}

function updateDevice(deviceElement, deviceName, isMoving, temperature, powerOffStatus) {
    const trafficLightDiv = deviceElement.querySelector('.traffic-light');
    trafficLightDiv.className = 'traffic-light ' + trafficLightClass(isMoving);

    // Use class names to select the correct elements
    const deviceNameEl = deviceElement.querySelector('.device-name');
    const temperatureEl = deviceElement.querySelector('.device-temperature');
    const movementEl = deviceElement.querySelector('.device-movement');

    deviceNameEl.textContent = deviceName;
    if (powerOffStatus) {
        temperatureEl.textContent = `Device Powered Off`;
        movementEl.textContent = ''; // Clear movement text if powered off
    } else {
        temperatureEl.textContent = `Temperature: ${temperature}°C`;
        movementEl.textContent = `Movement: ${movementText(isMoving)}`;
    }
}

function trafficLightClass(isMoving) {
    switch (isMoving) {
        case 0:
            return 'red'; // No Movement - Red light
        case 1:
            return 'orange'; // Warning - Orange light
        case 2:
            return 'green'; // Movement Detected - Green light
        default:
            return 'red'; // Default to Red light
    }
}

function movementText(isMoving) {
    switch (isMoving) {
        case 0:
            return 'No Movement';
        case 1:
            return 'Warning';
        case 2:
            return 'Movement Detected';
        default:
            return 'No Movement';
    }
}

function updateScatterPlot() {
    if (!scatterChart) {
        console.error('scatterChart is not initialized');
        return;
    }

    const data = Object.values(deviceData).map(device => ({
        x: device.x,
        y: device.y,
        isMoving: device.isMoving
    }));

    scatterChart.data.datasets[0].data = data.map((device, index) => ({
        ...device,
        label: deviceNames[index] || `Device ${index + 1}`
    }));
    scatterChart.update();
}

function updateLastUpdatedTime() {
    const now = new Date();
    document.getElementById('lastUpdated').textContent = `Last Updated: ${now.toLocaleTimeString()}`;
}

