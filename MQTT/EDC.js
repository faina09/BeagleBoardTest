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
var p = require("node-protobuf");

// tento con protobuf:
var Schema = require('protobuf').Schema;
// "schema" contains all message types defined in feeds.proto|desc.
var schema = new Schema(fs.readFileSync(path.resolve(__dirname,'EDCPayload.desc')));
// The "EdcPayload" message.
var EdcPayload = schema['EdcPayload'];

main();

function main(){
  var topic = "BIRTH";
  var message = MsgEdcBirth();
  //client.publish(topic, message);
  console.log('BithCertificate published @ ' + now() + ' topic=' + topic);
  ParseEdc(message);

  topic = "MSG";
  message = MsgEdc();
  //client.publish(topic, message);
  console.log('Message published @ ' + now() + ' topic=' + topic);
  ParseEdc(message);
  
  MsgEdc_proto();
  var serialized =  MsgEdc_proto();
  // Parses a protocol message in a node buffer into a JS object
  // according to the protocol message schema.
  var aEdcPayload = EdcPayload.parse(serialized);
  console.log("Message after roundtrip: " + JSON.stringify(aEdcPayload, null, 2));
  console.log("Message decoded: " + aEdcPayload);

}

function MsgEdc_proto(){
  
  var MyEdcMetric = [];
  MyEdcMetric.push({
      name: "DAC1",
      type: 1,//"INT32",
      double_value: 20 //getRandomArbitrary(1, 200)
  });

  var MyEdcPosition = {latitude:getRandomArbitrary(46, 46.50), longitude:getRandomArbitrary(13.6, 13.987), precision:4};

  var MyEdcPayload = {
      timestamp: new Date().getTime(),
      metric: MyEdcMetric,
      position: MyEdcPosition
  };
  
  return EdcPayload.serialize(MyEdcPayload);
}

function MsgEdc() {
    console.log("try to encode EDC...");
    try {
        var pb = new p(fs.readFileSync(path.resolve(__dirname, "EDCPayload.desc")));

        var MyEdcMetric = [];
        MyEdcMetric.push({
            name: "DAC1",
            type: "DOUBLE",
            double_value: 20 //getRandomArbitrary(1, 200)
        });

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