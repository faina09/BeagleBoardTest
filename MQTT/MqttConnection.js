var sys = require('sys');
var net = require('net');
var mqtt = require('mqtt');
var url = require('url');
/**************  https://www.npmjs.org/package/node-protobuf **********************/
var fs = require("fs");
var path = require('path');
var p = require("node-protobuf");

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

// incoming acks  var acks = ['puback', 'pubrec', 'pubcomp', 'suback', 'unsuback'];
var events = ['connect', 'connack', 'puback', 'pubrec', 'pubcomp', 'suback', 'unsuback', 'error', 'close', 'secureConnect', 'publish', 'pingresp'];
for (var i = 0; i < events.length; i++) {
    client.on(events[i], function(packet) {
        console.log('event#' + i + 'pkt@' + events[i] + '=' + packet); //JSON.stringify(packet));
    });
}

client.on('connect', function() {
    //SendBithCertificate
    var topic = "$EDC/" + acc_name + "/" + cliId + "/MQTT/BIRTH";
    var message = MsgEdcBirth();
    client.publish(topic, message);
    console.log('BithCertificate published @ ' + now() + ' topic=' + topic);
    ParseEdc(message);
    
    //publish DAC data every 10 seconds
    setInterval(function() {
        topic = acc_name + "/" + cliId + "/DAC";
        message = MsgEdc();
        client.publish(topic, message);
        console.log('Message published @ ' + now() + ' topic=' + topic);
        ParseEdc(message);
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

function MsgEdc() {
    console.log("try to encode EDC...");
    try {
        var pb = new p(fs.readFileSync(path.resolve(__dirname, "EDCPayload.desc")));

        var MyEdcMetric = [1];
        MyEdcMetric.push({
            name: "DAC1",
            type: "FLOAT",
            float_value: getRandomArbitrary(1, 200)
        });
        
        //test
        //var dbuf = pb.serialize(MyEdcMetric[1],"EdcMetric");

	    var MyEdcPosition = {latitude:getRandomArbitrary(46, 46.50), longitude:getRandomArbitrary(13.6, 13.987)};

        var MyEdcPayload = {
            timestamp: new Date().getTime(),
            metric: MyEdcMetric,
            position: MyEdcPosition
        };
        var buf = pb.serialize(MyEdcPayload, "EdcPayload");
        return buf;
    }
    catch (e) {
        console.log(" EdcPayload encode error: " + e);
    }
    return null;
}

function MsgEdcBirth() {
    console.log("encode EDC Birth Cert...");
    try {
        var schema = new p(fs.readFileSync(path.resolve(__dirname, "EDCPayload.desc")));
        var schemas = schema.info();
        console.log("Schema: " + schemas);

        //var dn = [ {name: "display_name", type: 5, string_value: "Kelikap01"} ];
        var MyBirth = [];
        
        MyBirth.push({name: "display_name", type: 5, string_value: "Kelikap01"});
        MyBirth.push({name: "model_name", type: "STRING", string_value: "BeagleBoard"});
        MyBirth.push({name: "uptime", type: "INT64", long_value: 3601020});
        MyBirth.push({name: "model_id", type: "STRING", string_value: "BBB"});
        MyBirth.push({name: "serial_number", type: "STRING", string_value: "BN122743"});
        MyBirth.push({name: "available_processors", type: "STRING", string_value: "1"});
        MyBirth.push({name: "total_memory", type: "STRING", string_value: "512MB RAM"});
        MyBirth.push({name: "firmare_version", type: "STRING", string_value: "0.2"});
        MyBirth.push({name: "os", type: "STRING", string_value: "LinuxBBB"});
        MyBirth.push({name: "connection_interface", type: "STRING", string_value: "Ethernet"});
        MyBirth.push({name: "connection_ip", type: "STRING", string_value: getIPAddress()});

	    var MyEdcPosition = {latitude:46.002, longitude:13.987456};
	    
        var buf = schema.serialize({
            timestamp: new Date().getTime(),
            metric: MyBirth,
            position: MyEdcPosition
        }, "EdcPayload"); // you get Buffer here, send it via socket.write, etc.
        return buf;
    }
    catch (e) {
        console.log(" EdcPayload encode error: " + e);
    }
    return null;
}

function ParseEdc(buf) {
    console.log("try to decode EDC...");
    try {
        var pb = new p(fs.readFileSync(path.resolve(__dirname, "EDCPayload.desc")));
        var newObj = pb.parse(buf, "EdcPayload"); // you get plain object here, it should be exactly the same as obj
        console.log(newObj);
    }
    catch (e) {
        console.log(" invalid buffer or EdcPayload does not exist: " + e);
    }
}

function TestPoints() {
    //var schema = p(path.resolve(__dirname, "EDCPayload.desc"));

    var desc = fs.readFileSync("points.desc");
    var pb = new p(desc);

    var points = [];
    for (var i = 0; i < 500; i++) {
        points.push({
            i: 1388534400000,
            j: 1388534400000
        });
    }

    var t1 = Date.now();
    var serJSON = JSON.stringify({
        points: points
    });
    var deserJSON = JSON.parse(serJSON);
    var t2 = Date.now();
    console.log("Time JSON:", t2 - t1);
    console.log(deserJSON);

    var t3 = Date.now();
    var serPB = pb.serialize({
        points: points
    }, 'Points');
    var deserPB = pb.parse(serPB, 'Points');
    var t4 = Date.now();
    console.log("Time PB:", t4 - t3);
    console.log(deserPB);
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