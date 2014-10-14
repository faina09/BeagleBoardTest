//EDC test
//Packages node.js
// npm install mqtt
// npm install url
/*######### google proto buffers
$ git clone https://github.com/google/protobuf.git
$ cd protobuf
$ ./autogen.sh
$ ./configure
$ make
$ make check
$ make install
https://www.npmjs.org/package/node-protobuf
"Make sure you have node, node-gyp, compiler and libprotobuf binary and development files. Then install:"
ldconfig -v
(...)
/usr/local/lib:
        libprotoc.so.9 -> libprotoc.so.9.0.0
        libprotobuf.so.9 -> libprotobuf.so.9.0.0
        libprotobuf-lite.so.9 -> libprotobuf-lite.so.9.0.0
a questo punto:
 npm install node-protobuf
*/

var mqtt = require('mqtt')
var url = require('url');
/**************  https://www.npmjs.org/package/node-protobuf **********************/
var fs = require("fs");
var path = require('path');
var p = require("node-protobuf"); // note there is no .Protobuf part anymore


// WARNING: next call will throw if desc file is invalid
var pb = new p(fs.readFileSync(path.resolve(__dirname, "EDCPayload.desc")));
// obviously you can use async methods, it's for simplicity reasons

var MyEdcMetric = {
  "name": "DAC1",
  "ValueType": "2",
  "float_value": 4.5643
}

var MyEdcPayload = {
  "timestamp": 1412707544,
  "metric": MyEdcMetric
}

console.log(MyEdcPayload.metric.float_value);
console.log(MyEdcPayload.metric.name);
console.log("try to encode..")
try {
  var buf = pb.serialize(MyEdcPayload, "EdcPayload") // you get Buffer here, send it via socket.write, etc.
}
catch (e) {
  console.log(" EdcPayload does not exist");
}

console.log("try to decode...")
try {
  var newObj = pb.parse(buf, "EdcPayload") // you get plain object here, it should be exactly the same as obj
  console.log(newObj.timestamp);
  console.log(newObj.metric.name);
  console.log(newObj.metric.float_value);
}
catch (e) {
  console.log(" invalid buffer or EdcPayload does not exist");
}

console.log("ok");

/*
// CON QUESTI parametri funziona @@@@SC20140624:
#define TEST_ACCOUNT_NAME	"StefanoCott"//"Techsigno" //"myEdcAccount"	// Your Account name in Cloud
#define TEST_BROKER_URL		"tcp://broker-sandbox.everyware-cloud.com:1883/"		// URL address of broker
#define TEST_CLIENT_ID		"123122DDEEFF"		// Unique Client ID of this client device
#define TEST_ASSET_ID		"334455AABBCC"		// Unique Asset ID of this client device
#define TEST_USERNAME		"StefanoCott"//"Techsigno"//"myEdcUserName_broker" // Username in account, to use for publishing
#define TEST_PASSWORD		"pwdSt3f@no123"//"We!come12345"//"myEdcPassword3#"	// Password associated with Username
*/

/*
// Parse mqtt connection
var mqtt_url = url.parse(process.env.CLOUDMQTT_URL || 'tcp://broker-sandbox.everyware-cloud.com:1883');
var auth = (mqtt_url.auth || ':').split(':');

// Create a client connection
var client = mqtt.createClient(mqtt_url.port, mqtt_url.hostname, {
  username: "StefanoCott",
  password: "pwdSt3f@no123"
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
  client.publish('kelikap/world', buf, function() {
    console.log("Message is published");
    client.end(); // Close the connection when published
  });
});

*/