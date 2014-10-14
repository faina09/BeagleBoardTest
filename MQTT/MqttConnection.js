var sys = require('sys');
var net = require('net');
var mqtt = require('mqtt');
var url = require('url');


//var broker = 'tcp://broker-sandbox.everyware-cloud.com';
var broker = 'mqtt://test.mosquitto.org';
var clientname = 'kelikap';
var uname = "StefanoCott";
var upass="pwdSt3f@no123";
var mqtt_url = url.parse(process.env.CLOUDMQTT_URL || 'mqtt://broker-sandbox.everyware-cloud.com:1883');
var auth = (mqtt_url.auth || ':').split(':');
//uname = '';
//upass='';
//mqtt_url = url.parse(process.env.CLOUDMQTT_URL || 'mqtt://test.mosquitto.org:1883');

var client = mqtt.createClient(mqtt_url.port, mqtt_url.hostname, {
  username: uname,
  password: upass,
  clientId: "kelikap_test"
},
  function (err, client){
      console.log("ddd");
    if (err) {
        console.log(JSON.stringify(err));
        return process.exit(-1);
    }
    else {
        console.log("ooo");
    }
    client.connect({
        keepalive: 1000,
        client: "kelikap_test_client"
    })
  });
  
    var events = ['connect', 'connack', 'puback', 'pubrec', 'pubcomp'];
    for (var i = 0; i < events.length; i++) {
        client.on(events[i], function(packet) {
            console.log('pkt@'+events[i]+'='+JSON.stringify(packet));
        });
    }; 

    client.on('connect', function(){ 
        // publish 4 messages to a topic
        client.publish('kelikap/sensors/DateTime', now());
        console.log('connected req send');
    });
    client.on('connack', function(packet) {
        console.log('connack: '+packet);
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
        console.log('pubrec: '+packet);
        client.pubrel({
            messageId: 2
        });
    });

function now() {
    var date = new Date();
    return new Buffer(date.toUTCString());
}