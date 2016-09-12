function YoutubeMapbox(options) {
  this.options = options;

  this.videos = {};
  this.neighborhoods = {};

  this.map = null;
  this.neighborhoodsLayer = null;
  this.neighborhoodMap = {}; // Map from neighborhood id to arrays of videos.
  this.markers = []; // Hold references to all the markers so we can manage them directly.

  this.dateFilter = new DateFilter();
}

// The entry point for the object.
YoutubeMapbox.prototype.render = function() {
  $('#close-button').click(this.closeSidebar.bind(this));
  this.dateFilter.initializeGui(this.onDatePick.bind(this));

  this.makeMap()
    .then(this.getNeighborhoodsFromMap.bind(this))
    .then(this.getNeighborhoodNameTable.bind(this))
    .then(this.retrieveCachedVideos.bind(this))
    .then(this.retrieveNewVideos.bind(this))
    .then(this.groupVideosByNeighborhood.bind(this))
    .then(this.placeVideosOnMap.bind(this));
};


YoutubeMapbox.prototype.makeMap = function() {
  return new Promise(function(resolve, reject) {
    L.mapbox.accessToken = this.options.mapboxAccessToken;

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
      var popupContent = '<strong>' + e.layer.feature.properties.title + '</strong>';
      e.layer.bindPopup(popupContent);
    });

    resolve();
  }.bind(this));
};

// Get the neighborhoods from the mapbox data.
YoutubeMapbox.prototype.getNeighborhoodsFromMap = function() {
  return new Promise(function(resolve, reject) {

    this.neighborhoodsLayer.on('ready', function(e) {

      e.target.eachLayer(function(layer) {
        var neighborhood = new Neighborhood(layer.feature);
        var id = neighborhood.getId();
        this.neighborhoods[id] = neighborhood;
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
      for (var id in this.neighborhoods) {
        var neighborhood = this.neighborhoods[id];
        var nameTable = data[id];
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

        var videoId = video.getId();
        this.videos[videoId] = video;
      } // end videos for loop

      resolve();
    }.bind(this));
  }.bind(this));
};


// Get all the most recent videos.
YoutubeMapbox.prototype.retrieveNewVideos = function() {
  return new Promise(function(resolve, reject) {
    var yt = new YouTube(this.options.youtubeApiKey);
    var numRequests = this.options.requests.length;
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
        var videoId = video.getId();
        this.videos[videoId] = video;
      } // end videos for loop

      state.numSuccessfulRequests += 1;
      if (state.numSuccessfulRequests === numRequests) {
        resolve();
      }
    }.bind(this);

    for (var request of this.options.requests) {
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

YoutubeMapbox.prototype.groupVideosByNeighborhood = function() {
  return new Promise(function(resolve, reject) {
    var map = {};

    for (var key in this.videos) {
      var video = this.videos[key];

      if (this.videoPassesFilters(video)) {
        var videoHasNeighborhood = !!video.neighborhood;

        if (videoHasNeighborhood) {
          var neighborhood = video.neighborhood;
          var id = neighborhood.getId();

          if (!map[id]) {
            map[id] = [video];
          } else {
            map[id].push(video);
          }
        }
      } // end filter check
    } // end loop

    this.neighborhoodMap = map;

    resolve();
  }.bind(this));
};


// Produce mapbox markers for each neighborhood's videos.
YoutubeMapbox.prototype.placeVideosOnMap = function() {
  return new Promise(function(resolve, reject) {
    this.removeAllMarkers();
    this.closeSidebar();

    var list = $('#' + this.options.videosListId);
    var content = $('#' + this.options.videosListId + ' .content');
    var header = $('#' + this.options.videosListId + ' .header');

    for (var id in this.neighborhoodMap) {
      var numVideos = this.neighborhoodMap[id].length;
      var size = Math.min(80, numVideos / 3.0 + 20.0);

      var neighborhood = this.neighborhoods[id];
      var location = neighborhood.getMarkerLocation();

      // https://www.mapbox.com/mapbox.js/example/v1.0.0/divicon/
      var icon = L.divIcon({
        className: 'icon',
        iconSize: [size, size],
        html: '<div>' + String(numVideos) + '</div>',
      });

      var marker = L.marker([location.lat, location.lng], {
          icon: icon
        })
        .addTo(this.map)
        .on('click', this.getMarkerClickFunc(neighborhood).bind(this));

      this.markers.push(marker);
    } // end of neighborhoodMap loop

    resolve();
  }.bind(this));
};


YoutubeMapbox.prototype.removeAllMarkers = function() {
  for (var marker of this.markers) {
    // https://www.mapbox.com/mapbox.js/api/v2.4.0/l-map-class/
    this.map.removeLayer(marker);
  }
  this.markers = [];
};


YoutubeMapbox.prototype.closeSidebar = function() {
  var list = $('#' + this.options.videosListId);
  var content = $('#' + this.options.videosListId + ' .content');
  var header = $('#' + this.options.videosListId + ' .header');

  list.hide();
  header.empty();
  content.empty();
};


YoutubeMapbox.prototype.getMarkerClickFunc = function(neighborhood) {
  return function(e) {
    var list = $('#' + this.options.videosListId);
    var content = $('#' + this.options.videosListId + ' .content');
    var header = $('#' + this.options.videosListId + ' .header');

    header.html(neighborhood.getEnglishName() + '<br>' + neighborhood.getArabicName());
    content.empty();

    var videos = this.neighborhoodMap[neighborhood.getId()];
    this.sortByPublishedDate(videos);

    for (var video of videos) {
      var thumbnail = video.getThumbnail();
      content.append(thumbnail);
    }

    list.show();
  }
};


// Not used, but handy if you need to generate a bunch of markers on a feature layer with one operation.
YoutubeMapbox.prototype.computeGeoJsonForNeighborhoods = function() {
  var geoJson = [];

  for (var id in this.neighborhoods) {
    var neighborhood = this.neighborhoods[id];

    var neighborhoodVideos = this.neighborhoodMap[id] || [];
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

YoutubeMapbox.prototype.videoPassesFilters = function(video) {
  return this.dateFilter.passes(video);
};

// Applies the new filter settings to the videos.
YoutubeMapbox.prototype.updateFilteredVideos = function() {
  this.groupVideosByNeighborhood()
    .then(this.placeVideosOnMap.bind(this));
};

YoutubeMapbox.prototype.onDatePick = function(afterDate, beforeDate) {
  this.dateFilter.setBeforeDate(beforeDate);
  this.dateFilter.setAfterDate(afterDate);
  this.updateFilteredVideos();
};
