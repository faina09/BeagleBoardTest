//http://beaglebone.cameon.net/home/using-pwm-outputs
// Works OOTB with pins: P8_13, P9_14, P9_21, P9_42
//~# echo BB-UART4 > /sys/devices/bone_capemgr.9/slots
//~# echo BB-UART2 > /sys/devices/bone_capemgr.9/slots
/*  http://hipstercircuits.com/enable-serialuarttty-on-beaglebone-black/
    UART    RX       TX      RTS     CTS
    uart2   P9_26    P9_24   P9_20   P9_19   /dev/ttyO1     
    uart3   P9_22    P9_21   -----   -----   /dev/ttyO2
    uart4   P        -----   -----   -----   /dev/ttyO3
    uart5   P9_11	 P9_13	 P8_35	 P8_33	 /dev/ttyO4
    uart6   P8_38    P8_37   P8_32   P8_31   /dev/ttyO5
*/
var b = require('bonescript');
var SerialPort = require("serialport").SerialPort;
var CRLF = new Buffer(2);
CRLF[0]=13;
CRLF[1]=10;

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


// RS232 pins - ttyO4 radioUart - RTS and CTS not used/configured but tie CTS to GND!!!
var rxdPin = "P9_11"; //<-
var txdPin = "P9_13"; //->
var rtsPin = "P8_33"; //->
var ctsPin = "P8_35"; //<-
// serial port setup
var radioUart = new SerialPort("/dev/ttyO4", {
    baudrate: 115200
});
var Open = false;
var RxBuffer = new Buffer(64);
var rxChars = 0;
var SaveBuffer = new Buffer(64);
var SaveLen = 0;

// uart3 ttyO2 BTUart - no RTS nor CTS
var rxdPinBT = "P9_22"; //<-
var txdPinBT = "P9_21"; //->
var BTUart = new SerialPort("/dev/ttyO2", {
    baudrate: 9600
});
var OpenBT = false;
var RxBufferBT = new Buffer(64);
var rxCharsBT = 0;
var timeoutBT = 0;
var initOKBT = 2; //inizializzazione gia' OK @@@@@@@@@@@
var atcmd;

// configure PWM pin
b.pinMode(redPin, b.ANALOG_OUTPUT);
b.pinMode(greenPin, b.ANALOG_OUTPUT);
b.pinMode(bluePin, b.ANALOG_OUTPUT);

b.analogWrite(redPin, awr);
b.analogWrite(greenPin, awg);
b.analogWrite(bluePin, awb);

clear(RxBuffer);
setInterval(powerset, 1000);
setInterval(initBT, 5000);

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
        console.log('**ColorPOWER=0x' + decimalToHex(color,6).toUpperCase() + ' R=' + awr.toFixed(2) + ' G=' + awg.toFixed(2) + ' B=' + awb.toFixed(2) + ' freq=' + freq);
        sendBT('**ColorPOWER=0x' + decimalToHex(color,6).toUpperCase() + ' @' + now() + CRLF , 15 + 6 + 2 + 29 + 2 );
    }

    timeoutBT++;
    if (timeoutBT > 2 && rxCharsBT > 0) {
        console.log(' RxBufferBT=' + RxBufferBT.slice(0, 24));
        if (initOKBT == 2) {
            //fine inizializzazione, interpreto la stringa ricevuta come comando per i colori
            color = parseInt(RxBufferBT.slice(0, 24));
            if (isNaN(color)) {
                color = 0;
            }
            console.log('--BTcolor=0x' + color.toString(16).toUpperCase());
        }
        if (RxBufferBT.slice(0, 18) == "OK+Set:TechsignoBT") {
            initOKBT = 1;
        }
        if (RxBufferBT.slice(0, 8) == "OK+Set:1") {
            initOKBT = 2;
        }
        clear(RxBufferBT);
        rxCharsBT = 0;
    }
    atcmd = "";
}


//**** serial port events radioUart */
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


//**** serial port events BTUart */
BTUart.on("open", function() {
    console.log('Opening BTUart ' + now());
    OpenBT = true;
});

BTUart.on("data", function(data) {
    var TmpBuffer = new Buffer(data);
    TmpBuffer.copy(RxBufferBT, rxCharsBT);
    rxCharsBT += TmpBuffer.length;
    if (rxCharsBT > 50) rxCharsBT = 0;
    timeoutBT = 0;
    var rxdata = data.toString('hex');
    console.log('RX BTUart data (at ' + now() + '): ' + rxdata);
});

BTUart.on("close", function(data) {
    console.log('Close BTUart');
});

//send to BT 
function sendBT(cmd, len) {
    SaveBuffer.write(cmd);
    SaveLen = len;
    if (len > 0) {
        BTUart.write(SaveBuffer.slice(0, SaveLen), function(err, results) {
            //if (results < 0) 
            console.log('BTUart write N.' + results + ' characters');
        });
    }
}

//initialize BT module into master mode
function initBT() {
    //initOKBT=0;

    if (initOKBT == 0) {
    //    sendBT("---\r", 4); //command mode
        
        sendBT("AT+NAMETechsignoBT", 18);
    }
    if (initOKBT == 1) {
        sendBT("AT+ROLE1", 3 + 4 + 1); //def 0
    }
    if (initOKBT == 2) {
        atcmd = "";
        //atcmd="AT+ROLE?";
        //atcmd="AT+ADDR?";
        //atcmd ="AT+CON20CD397C11F8";
        sendBT(atcmd, atcmd.length);
    }
}


//**** utilities */
function clear(BufferP) {
    var i = 0;
    while (i < BufferP.length) {
        BufferP[i] = 0x00;
        i++;
    }
}

function now() {
    var date = new Date();
    return new Buffer(date.toUTCString());
}

function decimalToHex(d, padding) {
    var hex = Number(d).toString(16);
    padding = typeof (padding) === "undefined" || padding === null ? padding = 2 : padding;
    while (hex.length < padding) {
        hex = "0" + hex;
    }
    return hex;
}

var stdin = process.openStdin();

stdin.on("open", function() {
    console.log('Opening stdin ' + now());
    OpenBT = true;
});

stdin.addListener("data", function(d) {
    // note:  d is an object, and when converted to a string it will
    // end with a linefeed.  so we (rather crudely) account for that  
    // with toString() and then substring() 
    console.log("you entered: [" + d.toString().substring(0, d.length - 1) + "]");
});