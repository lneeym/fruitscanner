let canvas;
let webcam;
let model;
let scanSound;
let spicyRiceFont;
let barlowFont;
let isScanning = false;
let scannedItems = [];
let lastScannedItem = null;
let noDetectionCounter = 0;
let lastScanTime = 0;
const SCAN_COOLDOWN = 1000; // 1 second cooldown between scans

// Price and display information
const items = {
    'banana': {
        displayName: 'Banana',
        price: 0.75,
        dotLine: '.........................'
    },
    'ppl': {
        displayName: 'Apple',
        price: 1.25,
        dotLine: '.........................'
    },
    'lemon': {
        displayName: 'Lemon',
        price: 1.99,
        dotLine: '.........................'
    }
};

function preload() {
    // Load fonts
    spicyRiceFont = loadFont('SpicyRice-Regular.ttf');
    barlowFont = loadFont('Barlow-Regular.ttf');
    
    soundFormats('mp3');
    // Replace 'your-sound-file.mp3' with your actual sound file name
    scanSound = loadSound('beep.mp3');
}

function setup() {
    canvas = createCanvas(windowWidth, windowHeight);
    canvas.parent('display-container');
    
    const webcamContainer = document.getElementById('webcam-container');
    webcamContainer.style.display = 'none';
    
    drawInitialScreen();
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    drawInitialScreen();
}

async function startScanning() {
    try {
        scannedItems = [];
        lastScannedItem = null;
        noDetectionCounter = 0;
        
        webcam = new tmImage.Webcam(640, 480, true);
        await .setup();
        await webcam.play();

        const URL = "https://teachablemachine.withgoogle.com/models/PQw1Sq1v8/";
        model = await tmImage.load(URL + "model.json", URL + "metadata.json");
        
        isScanning = true;
        loop();
        
        document.querySelector('.start-btn').style.display = 'none';
        document.querySelector('.checkout-btn').style.display = 'block';
    } catch (error) {
        console.error('Setup error:', error);
        alert('Error starting scanner. Please try again.');
    }
}

function draw() {
    background(255,225,0);
    drawHeader();
    
    // Draw vertical divider line
    stroke(0, 166, 81);
    line(width * 0.6, 80, width * 0.6, height - 50);
    
    drawTransactionList();
    if (!isScanning) {
        drawBillSection();
    }

    if (isScanning && webcam && webcam.canvas && model) {
        webcam.update();
        predict();
    }
}

async function predict() {
    try {
        const predictions = await model.predict(webcam.canvas);
        const bestPrediction = predictions.reduce((a, b) => 
            a.probability > b.probability ? a : b
        );

        const currentTime = millis();
        if (bestPrediction.probability > 0.85) {
            handleDetection(bestPrediction.className, currentTime);
            noDetectionCounter = 0;
        } else {
            noDetectionCounter++;
            if (noDetectionCounter > 10) {
                lastScannedItem = null;
            }
        }
    } catch (error) {
        console.error('Prediction error:', error);
    }
}

function handleDetection(itemClass, currentTime) {
    if (currentTime - lastScanTime < SCAN_COOLDOWN) return;
    
    if (items[itemClass]) {
        if (scanSound.isLoaded()) {
            scanSound.play();
        }
        lastScanTime = currentTime;
        
        scannedItems.push({
            name: items[itemClass].displayName,
            price: items[itemClass].price,
            timestamp: new Date()
        });
        
        redraw();
    }
}

function drawInitialScreen() {
    background(255);
    drawHeader();
    
    textFont(barlowFont);
    textAlign(CENTER, CENTER);
    textSize(24);
    fill(0, 166, 81);
    text('Click "Start Checkout" to begin scanning', width/2, height/2);
}

function drawHeader() {
    textFont(spicyRiceFont);
    textSize(55);
    textAlign(LEFT, TOP);
    fill(0, 166, 81);
    text('The  Fruit  Shop', 50,20);
    
    stroke(0, 166, 81);
    strokeWeight(4);
    line(50, 80, width - 50, 80);
}

function drawTransactionList() {
    const leftSectionWidth = width * 0.55;
    textFont(barlowFont);
    textSize(28);
    noStroke();
    fill(0, 166, 81);
    
    let yPos = 120;
    
    scannedItems.forEach((item, index) => {
        if (yPos < height - 100) {
            // Item name
            textAlign(LEFT, TOP);
            text(item.name, 50, yPos);
            
            // Dotted line
            let xPos = textWidth(item.name) + 70;
            const remainingWidth = leftSectionWidth - textWidth(item.name) - 120;
            
            stroke(0, 166, 81);
            strokeWeight(1);
            for (let i = 0; i < remainingWidth; i += 8) {
                point(xPos + i, yPos + 12);
            }
            
            // Price
            noStroke();
            textAlign(RIGHT, TOP);
            text('$' + item.price.toFixed(2), leftSectionWidth - 20, yPos);
            
            yPos += 40;
        }
    });
}

function drawBillSection() {
    const rightStart = width * 0.65;
    const rightWidth = width * 0.3;
    
    // Bill title with Spicy Rice font
    textFont(spicyRiceFont);
    textSize(32);
    fill(0, 166, 81);
    textAlign(LEFT, TOP);
    text('Bill Summary', rightStart, 120);
    
    // Switch to Barlow font for items
    textFont(barlowFont);
    let yPos = 170;
    let total = 0;
    
    textSize(28);
    scannedItems.forEach((item, index) => {
        text(item.name, rightStart, yPos);
        textAlign(RIGHT, TOP);
        text('$' + item.price.toFixed(2), rightStart + rightWidth, yPos);
        textAlign(LEFT, TOP);
        
        total += item.price;
        yPos += 40;
    });
    
    if (scannedItems.length > 0) {
        stroke(0, 166, 81);
        strokeWeight(2);
        line(rightStart, yPos, rightStart + rightWidth, yPos);
        
        noStroke();
        yPos += 20;
        textSize(32);
        text('Total:', rightStart, yPos);
        textAlign(RIGHT, TOP);
        text('$' + total.toFixed(2), rightStart + rightWidth, yPos);
    }
}

function startCheckout() {
    if (scannedItems.length === 0) {
        alert('Please scan some items first!');
        return;
    }
    
    isScanning = false;
    if (webcam) {
        webcam.stop();
    }
}

function startNew() {
    scannedItems = [];
    lastScannedItem = null;
    noDetectionCounter = 0;
    isScanning = false;
    
    if (webcam) {
        webcam.stop();
    }
    
    clear();
    drawInitialScreen();
    
    document.querySelector('.start-btn').style.display = 'block';
    document.querySelector('.checkout-btn').style.display = 'none';
}