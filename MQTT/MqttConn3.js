//var sys = require('sys');
//var net = require('net');
var mqtt = require('mqtt');
var url = require('url');
/**************  https://www.npmjs.org/package/node-protobuf **********************/
var fs = require("fs");
var path = require('path');
// *********** tento con https://github.com/dcodeIO/ProtoBuf.js
// npm install protobufjs
var ProtoBuf = require("protobufjs");
var builder = ProtoBuf.loadProtoFile(path.resolve(__dirname, 'EDCPayload.proto'));

var cliId = 'kelikap_test';
var uname = "StefanoCott";
var upass = "pwdSt3f@no123";
var acc_name = "Techsigno";
//var upass = "We!come12345";
var mqtt_url = url.parse(process.env.CLOUDMQTT_URL || 'mqtt://broker-sandbox.everyware-cloud.com:1883');
//var auth = (mqtt_url.auth || ':').split(':');

var client = mqtt.createClient(mqtt_url.port, mqtt_url.hostname, {
    username: uname,
    password: upass,
    clientId: cliId
},

function(err, client) {
    console.log("ERROR creating client");
    if (err) {
        //console.log(JSON.stringify(err));
        console.log("error");
        return process.exit(-1);
    }
    else {
        console.log("client created no errors");
    }
    client.connect({
        keepalive: 1000,
        client: cliId
    });
});

/*
// incoming acks  var acks = ['puback', 'pubrec', 'pubcomp', 'suback', 'unsuback'];
var events = ['connect', 'connack', 'puback', 'pubrec', 'pubcomp', 'suback', 'unsuback', 'error', 'close', 'secureConnect', 'publish', 'pingresp'];
for (var i = 0; i < events.length; i++) {
    client.on(events[i], function(packet) {
        console.log('event#' + i + 'pkt@' + events[i] + '=' + packet); //JSON.stringify(packet));
    });
}
*/

client.on('connack', function(packet) {
    console.log('event Connackt pkt=' + packet);
});

client.on('puback', function(packet) {
    console.log('event Puback pkt=' + packet);
});

client.on('error', function(packet) {
    console.log('event ERROR pkt=' + packet);
});

client.on('close', function(packet) {
    console.log('event close pkt=' + packet);
});

client.on('message', function(topic, message, packet) {
    console.log(packet);
    var payload = new Buffer(packet.payload);
    WriteFileAssistant('EDCReceived.bin', payload);
    try {
        console.log("Received '" + MsgDecode(payload) + "' on '" + topic + "'");
    }
    catch (e) {
        console.log(" EdcPayload decode error: " + e);
        console.log(payload);
    }
});

client.on('connect', function() {
    //SendBithCertificate
    var topic = "$EDC/" + acc_name + "/" + cliId + "/MQTT/BIRTH";
    var message = MsgEdcBirth();
    client.publish(topic, message);
    console.log('BithCertificate published @ ' + now() + ' topic=' + topic);
    //var aEdcPayload = EdcPayload.parse(message);
    //console.log("Message after roundtrip: " + JSON.stringify(aEdcPayload, null, 2));
    MsgDecode(message);
    WriteFileAssistant('EDCBirth.bin', message);
    
    topic = acc_name + "/" + cliId + "/#";
    client.subscribe(topic);

    //publish DAC data every 10 seconds
    setInterval(function() {
        topic = acc_name + "/" + cliId + "/DAC/read";
        message = MsgEdc();
        console.log(message);
        client.publish(topic, message);
        MsgDecode(message);
        WriteFileAssistant('EDCPublish.bin', message);
    }, 10000);
    /*
    setInterval(function() {
        client.pingreq();
    }, 1000);*/
});
/*
client.on('connack', function(packet) {
    console.log('connack: ' + packet);
    setInterval(function() {
        client.publish({
            topic: 'kelikap/test0',
            payload: 'test',
            qos: 0
        });
        client.publish({
            topic: 'kelikap/test1',
            payload: 'test',
            qos: 1,
            messageId: 1
        });
        client.publish({
            topic: 'kelikap/test2',
            payload: 'test',
            qos: 2,
            messageId: 2
        });
    }, 10000);
    setInterval(function() {
        client.pingreq();
    }, 1000);
});

client.on('pubrec', function(packet) {
    console.log('pubrec: ' + packet);
    client.pubrel({
        messageId: 2
    });
});
/***************/

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
                int_value: getRandomArbitraryInt(1, 200)
            },
            position: MyEdcPosition
        });
        var buffer = MyEdcPayload.encode();
        console.log(buffer);
        return buffer.toBuffer();
    }
    catch (e) {
        console.log(" EdcPayload encode error: " + e);
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
            metric:[{name: "display_name",  type: "STRING", string_value: "Kelikap01"},
            {name: "model_name", type: "STRING", string_value: "BeagleBoard"},
            {name: "uptime", type: "INT64", long_value: 3601020},
            {name: "model_id", type: "STRING", string_value: "BBB"},
            {name: "serial_number", type: "STRING", string_value: "BN122743"},
            {name: "available_processors", type: "STRING", string_value: "1"},
            {name: "total_memory", type: "STRING", string_value: "512MB RAM"},
            {name: "firmare_version", type: "STRING", string_value: "0.2"},
            {name: "os", type: "STRING", string_value: "LinuxBBB"},
            {name: "connection_interface", type: "STRING", string_value: "Ethernet"},
            {name: "connection_ip", type: "STRING", string_value: getIPAddress()}],
            position: MyEdcPosition
        });
        var buffer = MyEdcPayload.encode();
        console.log(buffer);
        return buffer.toBuffer();
    }
    catch (e) {
        console.log(" EdcPayload encode error: " + e);
    }
    return null;
}

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

function now() {
    var date = new Date();
    return new Buffer(date.toUTCString());
}

function getRandomArbitrary(min, max) {
    return Math.random() * (max - min) + min;
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