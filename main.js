//var sensor = function (id, pinNo, threshold, autoStatus, motorStatus) {
//    this.sensor_id = id;
//    this.sensor_value = 0;
//    this.pin_no = pinNo;
//    this.auto = autoStatus;
//    this.threshold = threshold;
//    this.motor_status = motorStatus;
//}
var mraa = require('mraa'); //require MRAA
console.log('MRAA Version: ' + mraa.getVersion()); //Log MRAA version
var aadhaarId = '123456789012'; //Aadhaar ID is hardcoded into the board
//var aadhaarId = '098765432112';
//var url = "http://192.168.43.193:8080"; //URL for the server
var url = "http://intelligation.azurewebsites.net";
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest; //For sending a http request to get initail setup configuration
var xmlHttp = new XMLHttpRequest();
var sensors = null;
xmlHttp.open( "GET", url + "/setup_config" + "?aadhaar_id=" + aadhaarId, false );
xmlHttp.send( null );
sensors = JSON.parse(xmlHttp.responseText);
console.log('Setup Complete');

function convertRange( value, r1, r2 ) { 
    return ( value - r1[ 0 ] ) * ( r2[ 1 ] - r2[ 0 ] ) / ( r1[ 1 ] - r1[ 0 ] ) + r2[ 0 ];
}

for (var i = 0; i < sensors.length; i++) {
    
    sensors[i]["sensor_value"] = 0;//setting all initial sensor values to zero
    sensors[i]["analog_pin"] = new mraa.Aio(sensors[i].pin_no);//mapping the sensor pins
    console.log(sensors[i].pin_no+', ');
    sensors[i]["motor_pin"] = new mraa.Gpio(sensors[i].pin_no); //mapping motor pins
    sensors[i].motor_pin.dir(mraa.DIR_OUT); //setting the motor pin to out
    sensors[i]["upper_threshold"] = ((sensors[i].threshold * 1.1) > 100)?100:sensors[i].threshold * 1.1;
    sensors[i]["lower_threshold"] = ((sensors[i].threshold * 0.9) < 0)?0:sensors[i].threshold * 0.9;
}

//sensors[0].motor_pin = new mraa.Gpio(13); //remove later
//sensors[0].motor_pin.dir(mraa.DIR_OUT);
console.log('Assigned Pins');
var sensorInterval = updatingSensors();
var serverInterval;
var socket = require('socket.io-client')(url);
socket.on('connect', function(){
    console.log("Connected to server");
    clearInterval(sensorInterval);
    serverInterval = setInterval(function () {
        for (var i = 0; i < sensors.length; i++)    {
               readCurrentSensorValue(i);
        }
        socket.emit('new_value',sensors);
    }, 10000);

});
socket.on('disconnect', function(){
    console.log("Disconnected from server");
    clearInterval(serverInterval);
    sensorInterval = updatingSensors();
});

socket.on('auto_toggle', function (data) {
    console.log(data);
    for(var i = 0; i < sensors.length; i++) {
        if(sensors[i].sensor_id == data.sensor_id){
            sensors[i].auto = data.state;
        }
    }
});

socket.on('motor_toggle', function (data) {
    console.log(data);
    for(var i = 0; i < sensors.length; i++) {
        if(sensors[i].sensor_id == data.sensor_id){
            sensors[i].motor_status = data.state;
            if(data.state == 1){
                sensors[i].motor_pin.write(1);
                console.log("Sensor "+i+" Motor On");
            }else if(data.state == 0){               
                sensors[i].motor_pin.write(0);
                console.log("Sensor "+i+" Motor off");
            }
        }
    }
});

function readCurrentSensorValue(i)  {
    //sensors[i].sensor_value = convertRange( sensors[i].analog_pin.read(), [ 490, 1024 ], [ 100, 0 ] );
    sensors[i].sensor_value = Math.floor(Math.random() * 100);
    console.log("Sensor "+i+" = "+sensors[i].sensor_value);
    if (sensors[i].auto == true) {
        if (!sensors[i].motor_status && (sensors[i].sensor_value < sensors[i].lower_threshold)) {
            sensors[i].motor_status = 1;
            sensors[i].motor_pin.write(1);
            console.log("Sensor "+i+" Motor On auto");
        } else if(sensors[i].motor_status && (sensors[i].sensor_value > sensors[i].upper_threshold)) {
            sensors[i].motor_status = 0;
            sensors[i].motor_pin.write(0);
            console.log("Sensor "+i+" Motor off auto");
        }
    }
}

function updatingSensors()  {
    setInterval(function()  {
        for (var i = 0; i < sensors.length; i++)    {
               readCurrentSensorValue(i);
        }
    },10000);
}