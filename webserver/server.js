// https://github.com/lgxlogic/BoneScript-SocketIO
// install socket.io etc: terminal, goto /var/lib/cloud9 and enter:
// npm install socket.io
// npm install onecolor
// npm install colorjoe
// npm install mqtt
// npm install protobufjs
// @@@SC20141004 remember:
//  $ echo BB-UART2 > /sys/devices/bone_capemgr.9/slots
//  $ echo BB-UART4 > /sys/devices/bone_capemgr.9/slots
//  $ protoc --decode=EdcPayload EDCPayload.proto < EDCReceived.bin
// RUN: $ node /var/lib/cloud9/BeagleBoardTest/webserver/server.js 
// @@@SC20141004 TODO:
//  multiple EDC metric (Birth)
//  save colore settato per i livelli di power e 'restore default'

var b = require('bonescript');
// http e socket
var app = require('http').createServer(handler);
var io = require('socket.io').listen(app);
// file system
var fs = require('fs');
var path = require('path');
// serial port
var SerialPort = require("serialport").SerialPort;
// color picker
var onecolor = require('onecolor');
var colorjoe = require('colorjoe');
// mqtt
var mqtt = require('mqtt');
var url = require('url');
// protocol buffers google --> https://github.com/dcodeIO/ProtoBuf.js
var ProtoBuf = require("protobufjs");
var builder = ProtoBuf.loadProtoFile(path.resolve(__dirname, 'EDCPayload.proto'));

var EDCcliId = 'kelikap_test';
var EDCuname = "StefanoCott";
var EDCupass = "pwdSt3f@no123";
var EDCacc_name = "Techsigno";
//var EDCupass = "We!come12345";
var EDCmqtt_url = url.parse(process.env.CLOUDMQTT_URL || 'mqtt://broker-sandbox.everyware-cloud.com:1883');

var port = 8090;
app.listen(port);

console.log('* Server running on: http://' + getIPAddress() + ':' + port);


// blue leds on board OFF
b.pinMode('USR0', b.OUTPUT);
b.pinMode('USR1', b.OUTPUT);
b.pinMode('USR2', b.OUTPUT);
b.pinMode('USR3', b.OUTPUT);
b.digitalWrite('USR0', b.LOW);
b.digitalWrite('USR1', b.LOW);
b.digitalWrite('USR2', b.LOW);
b.digitalWrite('USR3', b.LOW);
var state3 = b.LOW;
var cntmsg = 0;
setInterval(toggle, 1000);
// flash led USR3 where running ok
function toggle() {
    if (state3 == b.LOW) state3 = b.HIGH;
    else state3 = b.LOW;
    b.digitalWrite("USR3", state3);
}

// RGB pins
var redPin = "P9_14";
var greenPin = "P9_16";
var bluePin = "P9_42";

var powerMode = true;
var powermax = 100; //scala al 100%
var MqttMode = false;
var demoMode = false;
var demoStep = 0;
var demoCount = 0;
var ledDir = 0;
var ledBright = 0.99999;
var ledOff = 0.000001;

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
//default power colors
var colorL = 0x00FF00; //green:  low
var colorM = 0x0000FF; //blue:   mediun
var colorH = 0xFFFF00; //yellow: high
var colorVH = 0xFF0000; //red:   very high

var INVERTED = 0;
var CRLF = new Buffer(2);
CRLF[0] = 13;
CRLF[1] = 10;


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

setInterval(runDemo, 10);
setInterval(setColor, 500);
//setInterval(mqttDemo, 5000);

function handler(req, res) {
    if (req.url == "/favicon.ico") { // handle requests for favico.ico
        res.writeHead(200, {
            'Content-Type': 'image/x-icon'
        });
        res.end();
        console.log('* favicon requested');
        return;
    }
    var filereq = req.url;
    console.log('* requested: ' + filereq);
    if (filereq == '/') {
        filereq = 'index.html';
        powerMode = true;
        demoMode = false;
        MqttMode = false;
    }
    fs.readFile(path.resolve(__dirname, filereq),

    function(err, data) {
        if (err) {
            res.writeHead(500);
            console.log('* Error loading ' + filereq);
            return res.end('Error loading ' + filereq);
        }
        res.writeHead(200);
        res.end(data);
    });
}

io.sockets.on('connection', function(socket) {
    socket.on('msg', function(data) {
        console.log('§msg: ' + data);
    });
    // listen to sockets and write analog values to LED's
    socket.on('redPin', function(data) {
        b.analogWrite(redPin, (data / 100));
        console.log('§Red: ' + data / 100);
        //clear(SaveBuffer);
        //sendBT('** Red: ' + parseInt(data).toPrecision(3) + '%' + CRLF + ' ', 8 + 3 + 1 + 3);
    });
    socket.on('greenPin', function(data) {
        b.analogWrite(greenPin, (data / 100));
        console.log('§Green: ' + data / 100);
        //clear(SaveBuffer);
        //sendBT('** Green: ' + parseInt(data).toPrecision(3) + '%' + CRLF + ' ', 10 + 3 + 1 + 3);
    });
    socket.on('bluePin', function(data) {
        b.analogWrite(bluePin, (data / 100));
        console.log('§Blue: ' + data / 100);
        //clear(SaveBuffer);
        //sendBT('** Blue: ' + parseInt(data).toPrecision(3) + '%' + CRLF + ' ', 9 + 3 + 1 + 3);
    });
    socket.on('mqtt', function(data) {
        console.log("§Mqtt: " + data);
        //powerMode = true;
        demoMode = false;
        // switch mode
        if (data == 'on') {
            MqttMode = true;
        }
        else if (data == 'off') {
            MqttMode = false;
        }
    });
    socket.on('demo', function(data) {
        console.log("§Demo: " + data);
        powerMode = false;
        // switch mode
        if (data == 'on') {
            demoMode = true;
            runDemo();
        }
        else if (data == 'off') {
            demoMode = false;
            led(ledOff, ledOff, ledOff);
        }
    });
    socket.on('powermax', function(data) {
        console.log("§Powermax: " + data);
        colorold = -1;
        powermax = data;
    });
    socket.on('power', function(data) {
        console.log("§Power: " + data);
        colorold = -1;
        demoMode = false;
        // switch mode
        if (data == 'on') {
            powerMode = true;
            colorold = -1;
            setColor();
        }
        else if (data == 'off') {
            powerMode = false;
            led(ledOff, ledOff, ledOff);
            color = 0;
            setColor();
        }
    });
    socket.on('colorL', function(data) {
        console.log("§colorL: " + data);
        colorL = data.replace('#', '0x');
    });
    socket.on('colorM', function(data) {
        console.log("§colorM: " + data);
        colorM = data.replace('#', '0x');
    });
    socket.on('colorH', function(data) {
        console.log("§colorH: " + data);
        colorH = data.replace('#', '0x');
    });
    socket.on('colorVH', function(data) {
        console.log("§colorVH: " + data);
        colorVH = data.replace('#', '0x');
    });
});

// Get server IP address on LAN
function getIPAddress() {
    var interfaces = require('os').networkInterfaces();
    for (var devName in interfaces) {
        var iface = interfaces[devName];
        for (var i = 0; i < iface.length; i++) {
            var alias = iface[i];
            if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) return alias.address;
        }
    }
    return '0.0.0.0';
}

function mqttDemo() {
    if (MqttMode) {
        var DAC1 = Math.floor((Math.random() * 100) + 1);
        var DAC2 = Math.floor((Math.random() * 100) + 1);
        var DAC3 = Math.floor((Math.random() * 100) + 1);
        b.digitalWrite('USR0', b.HIGH);
        MqttPublish(DAC1, DAC2, DAC3);
    }
}

function runDemo() {
    if (demoMode === true) {
        switch (demoStep) {
        case 0:
            console.log("* Demo mode loop start");
            led(ledBright, ledOff, ledOff);
            break;
        case 1:
            led(ledOff, ledBright, ledOff);
            break;
        case 2:
            led(ledOff, ledOff, ledBright);
            break;
        case 3:
            led(ledBright, ledOff, ledOff);
            break;
        case 4:
            led(ledOff, ledBright, ledOff);
            break;
        case 5:
            led(ledOff, ledOff, ledBright);
            break;
        case 6:
            led(ledBright, ledBright, ledBright);
            break;
        case 7:
            led(ledBright, ledBright, ledBright);
            break;
        case 8:
            demoStep = 0;
            break;
        }

        demoCount++;
        if (demoCount > 100) {
            demoStep++;
            demoCount = 0;
        }
        if (ledDir === 0) ledBright = ledBright + 0.02;
        else ledBright = ledBright - 0.02;
        if (ledBright > 1) ledDir = 1;
        if (ledBright < 0) ledDir = 0;
    }
}

function led(red, green, blue) {
    freq = 2000;
    red = Math.abs(red.toFixed(6));
    if (red > 1.0) {
        red = 1.0;
    }
    green = Math.abs(green.toFixed(6));
    if (green > 1.0) {
        green = 1.0;
    }
    blue = Math.abs(blue.toFixed(6));
    if (blue > 1.0) {
        blue = 1.0;
    }
    b.analogWrite(redPin, red, freq);
    b.analogWrite(greenPin, green, freq);
    b.analogWrite(bluePin, blue, freq);
    console.log("* R=" + red + " G=" + green + " B=" + blue);
}

function setColor() {
    //color = 0x4d5e3F; //html #color 24bit
    freq = 2000;
    //#RRGGBB
    awr = ((color & 0xFF0000) >> 16) / 0xFF;
    awg = ((color & 0x00FF00) >> 8) / 0xFF;
    awb = ((color & 0x0000FF)) / 0xFF;

    if (color != colorold) {
        b.analogWrite(redPin, awr, freq);
        b.analogWrite(greenPin, awg, freq);
        b.analogWrite(bluePin, awb, freq);
        colorold = color;
        console.log('* ColorPOWER=0x' + decimalToHex(color, 6).toUpperCase() + ' R=' + awr.toFixed(2) + ' G=' + awg.toFixed(2) + ' B=' + awb.toFixed(2) + ' freq=' + freq);
        sendBT('** ColorPOWER=0x' + decimalToHex(color, 6).toUpperCase() + ' @' + now() + CRLF, 16 + 6 + 2 + 29 + 2);
    }
    else
    {
        if ((cntmsg++) % 50 == 0) {
        console.log('* no changes in Color...');
        sendBT('** no changes in Color @' + now() + CRLF, 24 + 29 + 2);
        }
    }

    timeoutBT++;
    if (timeoutBT > 2 && rxCharsBT > 0) {
        console.log('* RxBufferBT=' + RxBufferBT.slice(0, rxCharsBT));
        if (initOKBT == 2) {
            //fine inizializzazione, interpreto la stringa ricevuta come comando per i colori
            color = parseInt(RxBufferBT.slice(0, rxCharsBT));
            if (isNaN(color)) {
                color = 0;
            }
            console.log('* --BTcolor=0x' + color.toString(16).toUpperCase());
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
    console.log('* Opening radioUart ' + now());
    Open = true;
});

radioUart.on("data", function(data) {
    //console.log('* RX radioUart data (at ' + now() + '): ' + data.toString('hex'));
    var rxPower = 0;
    var TmpBuffer = new Buffer(data);
    TmpBuffer.copy(RxBuffer, rxChars);
    rxChars += TmpBuffer.length;
    if (rxChars > 20) rxChars = 0;
    //console.log(* RxBuffer.toString('hex'));

    if (RxBuffer[17] == 0x0d && RxBuffer[18] == 0x0a) {
        SendAck();

        console.log('* RX OK!! ' + RxBuffer.slice(0, 19).toString('hex'));
        //console.log('* id sensore='+ RxBuffer.slice(0,4).toString('hex'));
        var DAC1 = RxBuffer.slice(8, 10).toString('hex');
        var DAC2 = RxBuffer.slice(10, 12).toString('hex'); //potenziometro lato saldature
        var DAC3 = RxBuffer.slice(12, 14).toString('hex');
        rxPower = '0x' + DAC1;
        //console.log('* DAC1=0x'+ RxBuffer.slice(8,10).toString('hex')+' DAC2=0x'+RxBuffer.slice(10,12).toString('hex')+' DAC3=0x'+RxBuffer.slice(12,14).toString('hex'));
        sendBT('** RX OK from sensor=' + RxBuffer.slice(0, 4).toString('hex') + '0x' + DAC1 + CRLF, 21 + 8 + 6 + 2);
        if (MqttMode) {
            MqttPublish(DAC1, DAC2, DAC3);
        }
        clear(RxBuffer);
        rxChars = 0;

        if (powerMode == true) {
            var rxcolor = parseInt(rxPower);
            rxcolor *= (100.0 / powermax);
            rxcolor &= 0x03FE; //1 bit hysteresys
            console.log('* rxPower=' + rxPower + ' powermax=' + powermax + ' rxcolor=0x' + rxcolor.toString(16).toUpperCase());
            color = colorL; //0x00FF00; //green;
            if (rxcolor > 0x00BF) {
                color = colorM; //0x0000FF; //blue;
                if (rxcolor > 0x017E) {
                    color = colorH; //0xFFFF00; //yellow;
                    if (rxcolor > 0x023D) {
                        color = colorVH; //0xFF0000; //red;
                    }
                }
            }
            console.log('* --rxcolor = 0x' + rxcolor.toString(16) + ' => color = 0x' + color.toString(16));
        }
    }
});

radioUart.on("close", function(data) {
    console.log('* Close radioUart');
});

//invia il carattere ascii '0' (0x30) per ack
function SendAck() {
    //SaveBuffer.write("?");
    // ?rx default: 7e7e7e7e667303fb010b013d039c00b0550d0a
    // provo a cambiare id sensore e polling ogni 5"
    // id sens  id cont  C  P                    LED        polling    
    // 98765432 7e7e7e7e 00 00 FF 03 00 00 00 64 00 01 0000 000005 00 0d0a
    //SaveBuffer.write("S987654327e7e7e7e0000FF03000000640001000000000500");
    //SaveLen = 49;
    SaveBuffer.write("0");
    SaveLen = 1;
    //console.log('* SaveBuffer = ' + SaveBuffer.slice(0, SaveLen));
    //console.log('* open, sending buffered data ' + SaveLen);
    radioUart.write(SaveBuffer.slice(0, SaveLen), function(err, results) {
        if (results < 0) console.log('* err ' + err + ' results ' + results);
    });
    SaveLen = 0;
}


//**** serial port events BTUart */
BTUart.on("open", function() {
    console.log('* Opening BTUart ' + now());
    OpenBT = true;
});

BTUart.on("data", function(data) {
    var TmpBuffer = new Buffer(data);
    TmpBuffer.copy(RxBufferBT, rxCharsBT);
    rxCharsBT += TmpBuffer.length;
    if (rxCharsBT > 50) rxCharsBT = 0;
    timeoutBT = 0;
    var rxdata = data.toString('hex');
    console.log('* RX BTUart data (at ' + now() + '): ' + rxdata);
    if (rxCharsBT == 8) {
        if (RxBufferBT[0] == '0' && RxBufferBT[1] == 'x') {
            // received 0x+6 bytes representing rgb values
            color = RxBufferBT.slice(2, 8).toString('hex');
            console.log('* RX BTUart color: 0x' + color);
            clear(RxBufferBT);
            rxCharsBT = 0;
        }
    }
});

BTUart.on("close", function(data) {
    console.log('* Close BTUart');
});

//send to BT
function sendBT(cmd, len) {
    SaveBuffer.write(cmd);
    SaveLen = len;
    if (len > 0) {
        BTUart.write(SaveBuffer.slice(0, SaveLen), function(err, results) {
            //if (results < 0)
            console.log('* BTUart write N.' + results + ' characters');
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

//**** Mqtt */
function MqttPublish(DAC1, DAC2, DAC3) {
    // mosquitto mqtt : connect/publish/disconnect at each group of messages published
    // Parse
    var mqtt_url = url.parse(process.env.CLOUDMQTT_URL || 'mqtt://test.mosquitto.org:1883');
    var auth = (mqtt_url.auth || ':').split(':');

    // Create a client connection
    var client = mqtt.createClient(mqtt_url.port, mqtt_url.hostname, {
        username: auth[0],
        password: auth[1]
    });

    client.on('connect', function() { // When connected
        // publish 4 messages to a topic
        client.publish('kelikap/sensors/DateTime', now());
        client.publish('kelikap/sensors/DAC1', DAC1.toString());
        client.publish('kelikap/sensors/DAC2', DAC2.toString());
        client.publish('kelikap/sensors/DAC3', DAC3.toString(), function() {
            console.log("* Mqtt Messages are published");
            sendBT("** Mqtt Messages are published" + CRLF, 30 + 2);
            client.end(); // Close the connection when published
        });
    });
}

//**** Protocol buffers */
var EDCclient = mqtt.createClient(EDCmqtt_url.port, EDCmqtt_url.hostname, {
    username: EDCuname,
    password: EDCupass,
    clientId: EDCcliId
    },
    function(err, EDCclient) {
        console.log("* ERROR creating client");
        if (err) {
            //console.log(JSON.stringify(err));
            console.log("error");
            return process.exit(-1);
        }
        else {
            console.log("* client created no errors");
        }
        EDCclient.connect({
            keepalive: 1000,
            client: EDCcliId
        });
    });

EDCclient.on('connect', function() {
    //SendBithCertificate
    var topic = "$EDC/" + EDCacc_name + "/" + EDCcliId + "/MQTT/BIRTH";
    var message = MsgEdcBirth();
    EDCclient.publish(topic, message);
    console.log('* BithCertificate published @ ' + now() + ' topic=' + topic);
    MsgDecode(message);
    //Subscribe to all messages
    topic = EDCacc_name + "/" + EDCcliId + "/#";
    EDCclient.subscribe(topic);

    //publish DAC data every 10 seconds
    setInterval(function() {
        topic = EDCacc_name + "/" + EDCcliId + "/DAC/read";
        message = MsgEdc();
        EDCclient.publish(topic, message);
        console.log('* Message published @ ' + now() + ' topic=' + topic);
        MsgDecode(message);
    }, 10000);
});

EDCclient.on('message', function(topic, message, packet) {
    console.log("* Edc message received @ " + now() + "on topic=" + topic );
    console.log(packet);
    var payload = new Buffer(packet.payload);
    try {
        console.log("* Received: " + MsgDecode(payload));
    }
    catch (e) {
        console.log("* EdcPayload decode error: " + e);
        console.log(payload);
    }
});

function MsgDecode(buf) {
    var YourMessage = builder.build("EdcPayload");
    var myMessage = YourMessage.decode(buf);
    console.log(myMessage);
}

function MsgEdc() {
    //console.log("encode EDC Message...");
    try {
        var MyEdcPosition = {latitude: 46.03071, longitude: 13.24165};
        var EdcPayload = builder.build("EdcPayload");
        var MyEdcPayload = new EdcPayload({
            timestamp: new Date().getTime(),
            metric: {
                name: "DAC1",
                type: "INT32",
                int_value: getRandomArbitraryInt(1, 200) //@@@TODO: inserire il valore parseInt(DAC1)
                //int_value: getRandomArbitraryInt(1, parseInt(DAC1))
            },
            position: MyEdcPosition
        });
        var buffer = MyEdcPayload.encode();
        console.log(buffer);
        return buffer.toBuffer();
    }
    catch (e) {
        console.log("* EdcPayload encode error: " + e);
    }
    return null;
}

function MsgEdcBirth() {
    //console.log("encode EDC Birth Cert...");
    try {
        var MyEdcPosition = {latitude: 46.03071, longitude: 13.24165};
        var EdcPayload = builder.build("EdcPayload");
        var MyEdcPayload = new EdcPayload({
            timestamp: new Date().getTime(),
            metric: {name:"display_name",  type: "STRING", string_value: "Kelikap01"},/*
            {name: "model_name", type: "STRING", string_value: "BeagleBoard"},
            {name: "uptime", type: "INT64", long_value: 3601020},
            {name: "model_id", type: "STRING", string_value: "BBB"},
            {name: "serial_number", type: "STRING", string_value: "BN122743"},
            {name: "available_processors", type: "STRING", string_value: "1"},
            {name: "total_memory", type: "STRING", string_value: "512MB RAM"},
            {name: "firmare_version", type: "STRING", string_value: "0.2"},
            {name: "os", type: "STRING", string_value: "LinuxBBB"},
            {name: "connection_interface", type: "STRING", string_value: "Ethernet"},
            {name: "connection_ip", type: "STRING", string_value: getIPAddress()}],*/
            position: MyEdcPosition
        });
        var buffer = MyEdcPayload.encode();
        console.log(buffer);
        return buffer.toBuffer();
    }
    catch (e) {
        console.log("* EdcPayload encode error: " + e);
    }
    return null;
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
    padding = typeof(padding) === "undefined" || padding === null ? padding = 2 : padding;
    while (hex.length < padding) {
        hex = "0" + hex;
    }
    return hex;
}

function getRandomArbitraryInt(min, max) {
    return Math.ceil(Math.random() * (max - min) + min);
}

function WriteFileAssistant(filename, data) {
  var fileName = path.resolve(__dirname, filename);
  
  var fd =  fs.openSync(filename, 'w');
  var buff = new Buffer(data, 'base64');
  fs.write(fd, buff, 0, buff.length, 0, function(err,written){
    console.log("bytes written on " + filename + ": " + written);
  });
}