//http://beaglebone.cameon.net/home/using-pwm-outputs
// Works OOTB with pins: P8_13, P9_14, P9_21, P9_42
// TODO:::: echo enable-uart5 > /sys/devices/bone_capemgr.*/slots
// PER TESTARE:
// loopback tra Rx e Px e poi:
// echo 0xa0b025 > /dev/ttyO4
var b = require('bonescript');

// setup starting conditions
// RGB pins
var redPin = "P9_14";
var greenPin = "P9_16";
var bluePin = "P9_42";

var awr = 0.000001;
var awg = 0.000001;
var awb = 0.000001;
var freq = 2000;
var color = 0;
var colorold = -1;
// colors
var green = 0x00FF00;
var blue = 0x0000FF;
var yellow = 0xFFFF00;
var red = 0xFF0000;
var INVERTED = 0;


// RS232 pins
var rxdPin = "P9_11"; //<-
var txdPin = "P9_13"; //->
var rtsPin = "P8_33"; //->
var ctsPin = "P8_35"; //<-
// serial port setup
var SerialPort = require("serialport").SerialPort;
var radioUart = new SerialPort("/dev/ttyO4", {
    baudrate: 115200
});
var Open = false;
var RxBuffer = new Buffer(64);
var rxChars = 0;
var SaveBuffer = new Buffer(64);
var SaveLen = 0;

// configure pin
b.pinMode(redPin, b.ANALOG_OUTPUT);
b.pinMode(greenPin, b.ANALOG_OUTPUT);
b.pinMode(bluePin, b.ANALOG_OUTPUT);

b.analogWrite(redPin, awr);
b.analogWrite(greenPin, awg);
b.analogWrite(bluePin, awb);

clear(RxBuffer);
setInterval(powerset, 1000);

function powerset() {
    //color = 0x4d5e3F; //html #color 24bit
    freq = 2000;
    switch (color) {
    case 0:
        //off 
        awr = 0.00;
        awg = 0.00;
        awb = 0.00;
        //console.log("OFF"); //log to remember lamp is OFF
        break;
    case 1:
        //white
        awr = 1.00;
        awg = 1.00;
        awb = 1.00;
        break;
    case 2:
        //red
        awr = 0.9991;
        awg = 0.0001;
        awb = 0.0001;
        break;
    case 3:
        //green
        awr = 0.0001;
        awg = 0.9991;
        awb = 0.0001;
        break;
    case 4:
        //blue
        awr = 0.0001;
        awg = 0.0001;
        awb = 0.9991;
        break;
    default:
        //#RRGGBB 
        awr = ((color & 0xFF0000) >> 16) / 0xFF;
        awg = ((color & 0x00FF00) >> 8) / 0xFF;
        awb = ((color & 0x0000FF)) / 0xFF;
        break;
    }

    if (color != colorold) {
        b.analogWrite(redPin, awr, freq);
        b.analogWrite(greenPin, awg, freq);
        b.analogWrite(bluePin, awb, freq);
        colorold = color;
        console.log('POWER=0x' + color.toString(16).toUpperCase() + ' R=' + awr.toFixed(2) + ' G=' + awg.toFixed(2) + ' B=' + awb.toFixed(2) + ' freq=' + freq);
    }
}


function now() {
    var date = new Date();
    return new Buffer(date.toUTCString());
}
//**** serial port events */
radioUart.on("open", function() {
    console.log('Opening radioUart ' + now());
    Open = true;
});

radioUart.on("data", function(data) {
    //var rxdata = data.toString('hex');
    //console.log('RX radioUart data (at ' + now() + '): ' + rxdata);
    var rxPower = 0;
    var TmpBuffer = new Buffer(data);
    TmpBuffer.copy(RxBuffer, rxChars);
    rxChars += TmpBuffer.length;
    if (rxChars > 20) rxChars = 0;
    //console.log(RxBuffer.toString('hex'));

    if (RxBuffer[17] == 0x0d && RxBuffer[18] == 0x0a) {
        SendAck();

        //console.log('RX OK!! ' + RxBuffer.slice(0,19).toString('hex'));
        //console.log(' id sensore='+ RxBuffer.slice(0,4).toString('hex'));
        rxPower = '0x' + RxBuffer.slice(10, 12).toString('hex'); //potenziometro lato saldature
        //console.log(' DAC1=0x'+ RxBuffer.slice(8,10).toString('hex')+' DAC2=0x'+RxBuffer.slice(10,12).toString('hex')+' DAC3=0x'+RxBuffer.slice(12,14).toString('hex'));
        clear(RxBuffer);
        rxChars = 0;
    
        var rxcolor = parseInt(rxPower);
        rxcolor &= 0x03FE; //1 bit hysteresys
        console.log('rxcolor=0x' + rxcolor.toString(16).toUpperCase());
        color = 0x00FF00; //green;
        if (rxcolor > 0x00FF) {
            color = 0x0000FF; //blue;
            if (rxcolor > 0x01FE) {
                color = 0xFFFF00; //yellow;
                if (rxcolor > 0x02FD) {
                    color = 0xFF0000; //red;
                }
            }
        }
        console.log('--rxPower=' + rxPower + ' => color = 0x' + color.toString(16));
    }
});

radioUart.on("close", function(data) {
    console.log('Close radioUart');
});

//invia il carattere ascii '0' (0x30) per ack
function SendAck() {
    SaveBuffer.write("0");
    SaveLen = 1;
    //console.log('SaveBuffer = ' + SaveBuffer.slice(0, SaveLen));
    //console.log('open, sending buffered data ' + SaveLen);
    radioUart.write(SaveBuffer.slice(0, SaveLen), function(err, results) {
        if (results < 0) console.log('err ' + err + ' results ' + results);
    });
    SaveLen = 0;
}

function clear(BufferP) {
    var i = 0;
    while (i < BufferP.length) {
        BufferP[i] = 0x00;
        i++;
    }
}
