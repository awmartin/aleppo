Util = {
  averageLatLng: function averageLatLng(latlngs) {
    var i = 0,
      numPoints = latlngs.length;

    var center = {
      lat: 0,
      lng: 0
    };

    for (; i < numPoints; i++) {
      var latlng = latlngs[i];
      center.lat += (latlng.lat || latlng[1]);
      center.lng += (latlng.lng || latlng[0]);
    }

    return {
      lat: center.lat / numPoints,
      lng: center.lng / numPoints
    };
  },
};
