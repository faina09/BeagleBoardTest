//Mosquitto test
// C:\Program Files (x86)\mosquitto>mosquitto_sub -h test.mosquitto.org -t "kelikap/#" -v
// C:\Program Files (x86)\mosquitto>mosquitto_pub -h test.mosquitto.org -t "kelikap/sensors" -l
// oppure installare mosquitto su BBB:  apt-get install mosquitto (broker!)
//Packages node.js
// npm install mqtt
// npm install url
// npm install node-protobuf (la compilazione da degli errori)
// git clone https://github.com/google/protobuf.git
// protoc EDCPayload.proto -o EDCPayload.desc
var mqtt = require('mqtt'), url = require('url');

// Parse 
var mqtt_url = url.parse(process.env.CLOUDMQTT_URL || 'mqtt://test.mosquitto.org:1883');
var auth = (mqtt_url.auth || ':').split(':');
var count = 0;

// Create a client connection
var client = mqtt.createClient(mqtt_url.port, mqtt_url.hostname, {
  username: auth[0],
  password: auth[1] 
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
});

// incoming acks  var acks = ['puback', 'pubrec', 'pubcomp', 'suback', 'unsuback'];
//var events = ['connect', 'connack', 'puback', 'pubrec', 'pubcomp', 'suback', 'unsuback', 'error', 'close', 'secureConnect', 'publish', 'pingresp'];
//for (var i = 0; i < events.length; i++) {
    client.on(events[i], function(packet) {
        console.log('event#' + i + 'pkt@' + events[i] + '=' + packet); //JSON.stringify(packet));
    });
}
/*
client.on('connack', function(packet){
    console.log('event Connackt pkt=' + packet);
});

client.on('puback', function(packet){
    console.log('event Puback pkt=' + packet);
});

client.on('error', function(packet){
    console.log('event ERROR pkt=' + packet);
});

client.on('close', function(packet){
    console.log('event close pkt=' + packet);
});*/

client.on('message', function(topic, message, packet) {
      console.log("Received '" + message + "' on '" + topic + "'");
    });

client.on('connect', function() { 
  client.subscribe('kelikap/world');
  console.log("connected and subscribed");
  setInterval(function() {
    publishMsg(), 10000
  });
});

function publishMsg() {
  if (count++>10) return;
   // publish a message to a topic
  var rnd=getRandomArbitrary(1,2);
  client.publish('kelikap/world', 'my message:' + rnd, function() {
      console.log("Message is published");
    })
}

//client.end(); // Close the connection when published

function getRandomArbitrary(min, max) {
  return Math.random() * (max - min) + min;
}