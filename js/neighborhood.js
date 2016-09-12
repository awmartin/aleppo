function Neighborhood(feature) {
  this.feature = feature; // {properties:..., geometry:...}
  this.nameTable = null;
  this.geometry = null;

  this.processFeatureData();
}

Neighborhood.prototype.processFeatureData = function() {
  // Find the center of the neighborhood outline.
  var neighborhoodCenter = Util.averageLatLng(this.feature.geometry.coordinates[0]);

  this.geometry = {
    type: "Point",
    coordinates: [neighborhoodCenter.lng, neighborhoodCenter.lat]
  };
};

Neighborhood.prototype.getArabicName = function() {
  return this.feature.properties.NAME_A;
};

Neighborhood.prototype.getEnglishName = function() {
  return this.feature.properties.title; // NAME?
};

Neighborhood.prototype.getId = function() {
  return this.feature.id;
}

Neighborhood.prototype.setNameTable = function(table) {
  this.nameTable = table;
};

Neighborhood.prototype.getNameTable = function() {
  return this.nameTable;
};


// Provide the number of videos the marker for this neighborhood should represent.
//
// If the number of videos in the neighborhood is greater than 0, then
// add a marker to the map. This effectively hides the "empty"
// neighborhoods from the map.
//
// This further colors and sizes markers based on the number of videos
// in the neighborhood.
Neighborhood.prototype.setMarkerData = function(numVideos) {
  if (numVideos > 0 && numVideos < 5) {
    this.feature.properties['marker-symbol'] = numVideos;
    this.feature.properties['marker-size'] = 'small';
    this.feature.properties['marker-color'] = '#FF0096';

  } else if (numVideos >= 5 && numVideos < 10) {
    this.feature.properties['marker-symbol'] = numVideos;
    this.feature.properties['marker-size'] = 'medium';
    this.feature.properties['marker-color'] = '#FF006C';

  } else if (numVideos >= 10 && numVideos < 15) {
    this.feature.properties['marker-symbol'] = numVideos;
    this.feature.properties['marker-size'] = 'large';
    this.feature.properties['marker-color'] = '#FF004A';

  } else if (numVideos >= 15 && numVideos < 18) {
    this.feature.properties['marker-symbol'] = numVideos;
    this.feature.properties['marker-size'] = 'large';
    this.feature.properties['marker-color'] = '#FF002C';

  } else if (numVideos >= 18 && numVideos < 100) {
    this.feature.properties['marker-symbol'] = numVideos;
    this.feature.properties['marker-size'] = 'large';
    this.feature.properties['marker-color'] = '#FF0000';

  } else if (numVideos >= 100) {
    this.feature.properties['marker-symbol'] = 'x'; // TODO Fix the mapbox error when numbers > 100.
    this.feature.properties['marker-size'] = 'large';
    this.feature.properties['marker-color'] = '#FF0000';

  }
};

Neighborhood.prototype.getSizeTier = function(numVideos) {
  if (numVideos > 0 && numVideos < 5) {
    return 'xs';
  } else if (numVideos >= 5 && numVideos < 10) {
    return 's';
  } else if (numVideos >= 10 && numVideos < 15) {
    return 'm';
  } else if (numVideos >= 15 && numVideos < 18) {
    return 'l';
  } else if (numVideos >= 18 && numVideos < 100) {
    return 'xl'
  } else if (numVideos >= 100) {
    return 'xxl';
  }
};

Neighborhood.prototype.getGeoJson = function() {
  // This data is available in e.layer.feature in the click event on the marker.
  return {
    geometry: this.geometry,
    type: 'Feature',
    properties: this.feature.properties,
    id: this.feature.id,
    neighborhood: this,
  };
};

Neighborhood.prototype.getMarkerLocation = function() {
  return {
    lng: this.geometry.coordinates[0],
    lat: this.geometry.coordinates[1],
  };
};
