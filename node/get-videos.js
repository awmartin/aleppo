var XLSX = require('xlsx');
var request = require('request');
var jsonfile = require('jsonfile')

// ---------------------------------------------------------------------------------

var filePath = "../data/HNN_Tags.xlsx";
var outputPath = "../data/hnn-xlsx.json";
var videoIdColumn = 0;

// ---------------------------------------------------------------------------------

var workbook = XLSX.readFile(filePath);

var first_sheet_name = workbook.SheetNames[0];
var worksheet = workbook.Sheets[first_sheet_name];


var getCellAddress = function(c, r) {
  let columns = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N",
    "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"];
  let addressColumn = columns[c];
  let addressRow = r + 1;
  return addressColumn + addressRow;
};


var i = 1;
var result = {};
var url = 'https://www.googleapis.com/youtube/v3/videos';

var sendRequest = function() {

  var address = getCellAddress(videoIdColumn, i);
  var videoId = worksheet[address];
  if (!videoId) {
    console.log("Writing file:", outputPath);
    jsonfile.writeFile(outputPath, result);
    return;
  }

  var options = {
    'key': "AIzaSyCp5aUBEFSWZIjOy7Q-OZA5A5PhLscZnN4",
    'part': 'snippet',
    'id': videoId.v,
  };

  request.get(url, {qs:options}, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      //console.log(body) // Show the HTML for the Google homepage. 
      console.log("Got video for:", videoId.v);
      result[videoId.v] = body;
    } else {
      console.error("Error", error);
    }
    i++;

    sendRequest();
  });
}

sendRequest();

