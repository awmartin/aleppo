function YoutubeMapbox(options) {
  this.options = options;

  this.videos = {};
  this.neighborhoods = [];

  this.map = null;
  this.neighborhoodsLayer = null;
}

// The entry point for the object.
YoutubeMapbox.prototype.render = function() {
  this.makeMap()
    .then(this.getNeighborhoodsFromMap.bind(this))
    .then(this.getNeighborhoodNameTable.bind(this))
    .then(this.retrieveCachedVideos.bind(this))
    .then(this.retrieveNewVideos.bind(this))
    .then(this.placeVideosOnMap.bind(this));
};


YoutubeMapbox.prototype.makeMap = function() {
  return new Promise(function(resolve, reject) {
    L.mapbox.accessToken = this.options.accessToken;

    var map = L.mapbox.map(this.options.mapId, 'mapbox.streets')
      .setView(this.options.mapCenter, this.options.mapZoom);
    this.map = map;
    this.map.touchZoom.disable();
    this.map.doubleClickZoom.disable();
    this.map.scrollWheelZoom.disable();
    this.map.keyboard.disable();

    L.mapbox.styleLayer(this.options.mapboxStyle).addTo(this.map);

    this.neighborhoodsLayer = L.mapbox.featureLayer(this.options.mapboxMapId).addTo(this.map);

    // On click, show the name of the neighborhood.
    this.neighborhoodsLayer.on('layeradd', function(e) {
      const popupContent = '<strong>' + e.layer.feature.properties.title + '</strong>';
      e.layer.bindPopup(popupContent);
    });

    resolve();
  }.bind(this));
};

// Get the neighborhoods from the mapbox data.
YoutubeMapbox.prototype.getNeighborhoodsFromMap = function() {
  return new Promise(function(resolve, reject) {

    this.neighborhoodsLayer.on('ready', function(e) {

      e.target.eachLayer(function addMarker(layer) {
        this.neighborhoods.push(new Neighborhood(layer.feature));
      }.bind(this));

      resolve();

    }.bind(this)); // end ready

  }.bind(this));
};

// Get the neighborhood name equivalency data.
YoutubeMapbox.prototype.getNeighborhoodNameTable = function(next) {
  return new Promise(function(resolve, reject) {
    if (!this.options.nameEquivalencyTableUrl) {
      resolve();
      return;
    }

    $.get(this.options.nameEquivalencyTableUrl, function(data) {
      for (var neighborhood of this.neighborhoods) {
        const nameTable = data[neighborhood.getId()];
        if (nameTable) {
          neighborhood.setNameTable(nameTable);
        }
      }

      resolve();

    }.bind(this));
  }.bind(this));
};

YoutubeMapbox.prototype.retrieveCachedVideos = function() {
  return new Promise(function(resolve, reject) {
    if (!this.options.cachedVideosUrl) {
      resolve();
      return;
    }

    $.get(this.options.cachedVideosUrl, function(videosJson) {
      // Loop over all the videos and tag them with their neighborhood.
      for (var key in videosJson) {
        var video = new Video(videosJson[key]);
        video.locate(this.neighborhoods);

        const videoId = video.getId();
        this.videos[videoId] = video;
      } // end videos for loop

      resolve();
    }.bind(this));
  }.bind(this));
};


// Get all the most recent videos.
YoutubeMapbox.prototype.retrieveNewVideos = function() {
  return new Promise(function(resolve, reject) {
    const yt = new YouTube(this.options.youtubeApiKey);
    const numRequests = this.options.requests.length;
    var state = {
      numSuccessfulRequests: 0
    };

    var onYouTubeDone = function(videoData) {
      var i = 0,
        numVideos = videoData.length;

      // Loop over all the videos and tag them with their neighborhood.
      for (; i < numVideos; i++) {
        var video = new Video(videoData[i]);
        video.locate(this.neighborhoods);
        const videoId = video.getId();
        this.videos[videoId] = video;
      } // end videos for loop

      state.numSuccessfulRequests += 1;
      if (state.numSuccessfulRequests === numRequests) {
        resolve();
      }
    }.bind(this);

    for (const request of this.options.requests) {
      var requestOptions = {};
      if (request.publishedAfter) {
        requestOptions.publishedAfter = request.publishedAfter;
      }
      if (request.publishedBefore) {
        requestOptions.publishedBefore = request.publishedBefore;
      }
      yt.getAllVideosFromChannel(request.channel, onYouTubeDone, requestOptions);
    }

  }.bind(this));
};

// Produce mapbox markers for each neighborhood's videos.
YoutubeMapbox.prototype.placeVideosOnMap = function() {
  return new Promise(function(resolve, reject) {

    const list = $('#' + this.options.videosListId);
    const neighborhoodMap = this.groupVideosByNeighborhood();
    const geoJson = this.computeGeoJsonForNeighborhoods(neighborhoodMap);

    var placedVideos = L.mapbox.featureLayer().setGeoJSON(geoJson).addTo(this.map);

    placedVideos.on('click', function(e) {
      list.empty();

      var neighborhoodId = e.layer.feature.id,
        videos = neighborhoodMap[neighborhoodId];

      this.sortByPublishedDate(videos);

      for (const video of videos) {
        const thumbnail = video.getThumbnail();
        list.append(thumbnail);
      }

      list.show();

      resolve();
    }.bind(this));
  }.bind(this));
};

YoutubeMapbox.prototype.groupVideosByNeighborhood = function() {
  var neighborhoodMap = {};

  for (var key in this.videos) {
    const video = this.videos[key];
    const videoHasNeighborhood = !!video.neighborhood;

    if (videoHasNeighborhood) {
      const neighborhood = video.neighborhood;
      const id = neighborhood.getId();

      if (!neighborhoodMap[id]) {
        neighborhoodMap[id] = [video];
      } else {
        neighborhoodMap[id].push(video);
      }
    }
  }

  return neighborhoodMap;
};

YoutubeMapbox.prototype.computeGeoJsonForNeighborhoods = function(neighborhoodMap) {
  var geoJson = [];

  for (var neighborhood of this.neighborhoods) {
    const id = neighborhood.getId();
    const neighborhoodVideos = neighborhoodMap[id] || [];
    neighborhood.setMarkerData(neighborhoodVideos.length);

    if (neighborhoodVideos.length > 0) {
      geoJson.push(neighborhood.getGeoJson());
    }
  } // end of neighborhood loop

  return geoJson;
};

// Sort the videos by snippet.publishedAt.
YoutubeMapbox.prototype.sortByPublishedDate = function(videos) {
  videos.sort(function(a, b) {
    if (a.getPublishedDate() < b.getPublishedDate()) {
      return 1;
    } else if (a.getPublishedDate() > b.getPublishedDate()) {
      return -1;
    } else {
      return 0;
    }
  });
};
