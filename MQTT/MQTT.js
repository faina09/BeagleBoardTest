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

// Create a client connection
var client = mqtt.createClient(mqtt_url.port, mqtt_url.hostname, {
  username: auth[0],
  password: auth[1] 
});

client.on('connect', function() { // When connected

  // subscribe to a topic
  client.subscribe('kelikap/world', function() {
    // when a message arrives, do something with it
    client.on('message', function(topic, message, packet) {
      console.log("Received '" + message + "' on '" + topic + "'");
    });
  });

  // publish a message to a topic
  client.publish('kelikap/world', 'my message', function() {
    console.log("Message is published");
    client.end(); // Close the connection when published
  });
});

/**************  https://www.npmjs.org/package/node-protobuf **********************/
var fs = require("fs");
//test1:
var path = require('path');
var a=fs.readFileSync(path.resolve(__dirname,"protocol.desc"));
//console.log(a);

var p = require("node-protobuf"); // note there is no .Protobuf part anymore

// WARNING: next call will throw if desc file is invalid
var pb = new p(fs.readFileSync(path.resolve(__dirname,"protocol.desc")));
// obviously you can use async methods, it's for simplicity reasons

var obj = {
    "name": "value",
    "id":123456,
    "email":"quest@mia.mail"
}

try {
    var buf = pb.serialize(obj, "MySchema") // you get Buffer here, send it via socket.write, etc.
} catch (e) {
    console.log(" MySchema does not exist");
}
try {
    var newObj = pb.parse(buf, "MySchema") // you get plain object here, it should be exactly the same as obj
    console.log(newObj.name);
    console.log(newObj.id);
    console.log(newObj.email);
} catch (e) {
    console.log(" invalid buffer or if MySchema does not exist");
}

console.log("ok");
