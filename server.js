const http = require('http');
const bodyParser = require('body-parser')
const express = require("express");
const querystring = require('querystring');
const handler = require("./handler");
const app = express();

const hostname = '127.0.0.1';
const port = 8080;



app.use(bodyParser.json({ limit: "50mb" }));


function sortStations(stationList) {

	var newStationList = stationList ,i=0,j=0,tempStation={};

	for (var i = 0; i < newStationList.length; i++) {
		for (var j = 0; j < newStationList.length-1; j++) {
			if(newStationList[j].limit<newStationList[j+1]){
				tempStation = newStationList[j];
				newStationList[j] = newStationList[j+1];
				newStationList[j+1] = tempStation
			}
		}
	}
	return newStationList;
}

app.get("/", (req, res) => {
    console.log("inside /");
    res.sendFile(__dirname + "/public/index.html")
});
app.post("/checkVehicleDestination", async (req, res) => {

    let currentChargingLevel = 0,
        totalDistance = 0,
        distance = 0 ;
    const { vin, source, destination } = req.body;
    console.log({ vin, source, destination });
    const result = await handler.sendPost('/merc/charge_level', { vin, source, destination })

    if (result.error)
        return res.send({
            "transactionId": 1,
            "errors": [{ "id": 9999, "description": "Technical Exception" }]
        })

    if (result && result.currentChargeLevel)
        currentChargingLevel = result.currentChargeLevel
    else
        return res.send({
            "transactionId": 1,
            "errors": [{ "id": 9999, "description": "Technical Exception" }]
        })


    const result2 = await handler.sendPost("/merc/distance", { source, destination });
    console.log(result2);


    if (result2 && result2.distance)
        distance =  totalDistance = result2.distance;
    else
        return res.send({
            "transactionId": 1,
            "errors": [{ "id": 9999, "description": "Technical Exception" }]
        })

    if (currentChargingLevel >= distance)
        return res.send({ "transactionId": 2, "vin": vin, "source": source, "destination": destination, "distance": distance, "currentChargeLevel": currentChargingLevel, "isChargingRequired": false })


    const getStationList = await handler.sendPost('/merc/charging_stations', { source, destination });

    if (getStationList.chargingStations && getStationList.chargingStations[0]) {

        let totalStations = getStationList.chargingStations;

        let chargeRequired = distance - currentChargingLevel;
        let tempStations = [];
        let currentDistance = distance;

        //check if anyone staisfies
      //   for (var i = 0; i < totalStations.length; i++) {
      //       if (totalStations[i].limit >= chargeRequired && totalStations[i].distance <= currentChargingLevel) {
      //           return res.send({ 
      //           		"transactionId": 5, 
						// "vin": vin, 
						// "source": source, 
						// "destination": destination, 
						// "distance": distance, 
      //           		"currentChargeLevel": currentChargingLevel, 
      //           		"isChargingRequired": true, 
      //           		"chargingStations": 
      //           		[
      //           			totalStations[i]
      //           		] 
      //           	}
      //           )
      //       }
      //   }

      	console.log("before ",totalStations,"\n\n");
      	totalStations = sortStations(totalStations);

      	console.log("after ",totalStations,"\n\n");

        for (var i = 0; i < totalStations.length; i++) {
        	let flag = false;



	        for (var j = 0; j < totalStations.length; j++) {
	            if (totalStations[j].limit >= chargeRequired && totalStations[i].distance <= currentChargingLevel) {
	        		currentChargingLevel -=  totalStations[j].distance;
	        		currentChargingLevel += totalStations[j].limit;
	        		currentDistance -= totalStations[j].distance;
	        		tempStations.push(totalStations[j]);
	        		flag = true;
	        		break;
	            }
	        }


	        if(flag){
	        	console.log("single stop sol found")
	        	break;
	        }
	        else
	        	console.log("single stop soln is not available")


        	if(totalStations[i].distance<=currentChargingLevel)
        	{
        		currentChargingLevel -=  totalStations[i].distance;
        		currentChargingLevel += totalStations[i].limit;
        		tempStations.push(totalStations[i]);
        		currentDistance -= totalStations[i].distance;
        	}

        	if(currentChargingLevel>=currentDistance)
        		break;

        }
    


    	if(currentChargingLevel<currentDistance){
    		return res.send(
    			{ 
						"vin": vin, 
						"source": source, 
						"destination": destination, 
						"distance": distance, 
                		"currentChargeLevel":result.currentChargeLevel, 
	    				"isChargingRequired": true, 
	    				"errors": [ { "id": 8888, "description": "Unable to reach the destination with the current fuel level" } ] }
    		)
    	}
    	else {

    		return res.send(
    			{ 
						"vin": vin, 
						"source": source, 
						"destination": destination, 
						"distance": distance, 
                		"currentChargeLevel":result.currentChargeLevel, 
	    				"isChargingRequired": true,
	    				"chargingStations" : tempStations
	    			}

    		)

    	}
	    
    } else {
        return res.send({
            "transactionId": 1,
            "errors": [{ "id": 9999, "description": "Technical Exception" }]
        })
    }


})

const server = http.createServer(app);

server.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
});