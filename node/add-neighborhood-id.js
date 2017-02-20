var XLSX = require('xlsx');
var request = require('request');
var jsonfile = require('jsonfile')

// ---------------------------------------------------------------------------------

var xlsFile = "../xlsx/Video_Tags_SyrianCivilDefense-edit.xlsx";
var videosFile = "../data/whitehelmets-xlsx.json";
var neighborhoodsFile = "../data/neighborhoods-name-to-id.json";
var idColumn = 0;
var videoColumns = [21, 22, 23];
var outputFile = "../data/scd.json";

// ---------------------------------------------------------------------------------

// Get the neighborhood names.
var neighborhoodsJson = jsonfile.readFileSync(neighborhoodsFile);
var getNeighborhoodId = function(name) {
  for (var neighborhoodName in neighborhoodsJson) {
    if (name.includes(neighborhoodName) || neighborhoodName.includes(name)) {
      return neighborhoodsJson[neighborhoodName];
    }
  }
  return null;
};

// Open the xls file
var workbook = XLSX.readFile(xlsFile);
var firstSheetName = workbook.SheetNames[0];
var worksheet = workbook.Sheets[firstSheetName];

var getCellAddress = function(c, r) {
  const columns = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N",
    "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"];
  const addressColumn = columns[c];
  const addressRow = r + 1;
  return addressColumn + addressRow;
};


var getNeighborhoodIdsForRow = function(row) {
  var v = 0,
    numColumns = videoColumns.length,
    neighborhoods = [];

  for (; v < numColumns; v++) {
    var neighborhoodNameAddress = getCellAddress(videoColumns[v], row);
    var neighborhoodName = worksheet[neighborhoodNameAddress];

    if (neighborhoodName && neighborhoodName.v !== "") {
      var neighborhoodId = getNeighborhoodId(neighborhoodName.v);
      if (neighborhoodId) {
        neighborhoods.push(neighborhoodId);
      }
    }
  } // loop through name columns

  return neighborhoods;
}


var videosJson = jsonfile.readFileSync(videosFile),
  i = 0,
  outputJson = {};

while (true) {
  var idAddress = getCellAddress(idColumn, i);
  var videoId = worksheet[idAddress];

  if (videoId) {
    var videoStr = videosJson[videoId.v];
    if (videoStr) {
      var videoJson = JSON.parse(videoStr);

      // Set the neighborhood ids.
      var neighborhoods = getNeighborhoodIdsForRow(i);
      videoJson.neighborhoods = neighborhoods;

      outputJson[videoId.v] = videoJson;

      // Warning in case something goes wrong.
      if (neighborhoods.length == 0) {
        console.warn("WHOOPS! Found no neighborhoods for", videoId.v);
      }

      // Progress in case it's useful.
      //console.log("Video", videoId.v, "has", neighborhoods.length, "known neighborhoods.", numFound);
    }
  } else {
    // DONE!
    break;
  }

  i++;
}

jsonfile.writeFileSync(outputFile, outputJson);

