function YoutubeMapbox(options) {
  this.options = options;

  this.videos = {};
  this.neighborhoods = {};

  this.map = null;
  this.neighborhoodMap = {}; // Map from neighborhood id to arrays of videos.
  this.markers = []; // Hold references to all the markers so we can manage them directly.

  this.dateFilter = new DateFilter();
}

// The entry point for the object.
YoutubeMapbox.prototype.render = function() {
  $('#close-button').click(this.closeSidebar.bind(this));
  this.dateFilter.initializeGui(this.onDatePick.bind(this));

  this.makeMap()
    //.then(this.getNeighborhoodNameTable.bind(this))
    .then(this.retrieveCsvVideos.bind(this))
    .then(this.retrieveCachedVideos.bind(this))
    .then(this.retrieveNewVideos.bind(this))
    .then(this.groupVideosByNeighborhood.bind(this))
    .then(this.placeVideosOnMap.bind(this));
};

YoutubeMapbox.prototype.displayNeighborhoods = function() {
  var displayThem = function() {
    $('.map').remove();
    var json = {};
    for (var key in this.neighborhoods){
      var obj = this.neighborhoods[key];
      json[key] = obj;
    }
    $('body').html(JSON.stringify(json));
  }.bind(this);

  this.makeMap()
    .then(displayThem);
};

YoutubeMapbox.prototype.buildVideosCache = function(channelId, startDateStr, endDateStr, intervalNumDays) {
  var displayVideosJson = function() {
    console.log("Printing the retrieved videos", this.videos.length);
    $('.map').remove();

    var json = {};
    for (var key in this.videos) {
      json[key] = this.videos[key].data;
    }
    console.log(json);
    $('body').html(JSON.stringify(json));
  }.bind(this);


  var buildTableOfRequests = function() {
    var startDate = new Date(startDateStr);
    var endDate = new Date(endDateStr);

    var after = new Date(startDate);
    var before = new Date((new Date(after)).setDate(after.getDate() + intervalNumDays));

    while (after <= endDate) {
      var request = {
        channel: channelId,
        publishedAfter: after.toISOString(),
        publishedBefore: before.toISOString(),
      };

      this.options.requests.push(request);

      after = before;
      before = new Date((new Date(after)).setDate(after.getDate() + intervalNumDays));
      if (endDate < before) {
        before = endDate;
      }
      if (before === after) { break; }
    }
    console.log('Done building requests', this.options.requests);
  };

  //{channel: 'UCesBL01BgmHzdp1GZT2ltJw', publishedAfter: '2016-08-21T00:00:00Z'},

  buildTableOfRequests();

  //$('.map').empty();
  //$('.map').html(JSON.stringify(this.options.requests));
  this.makeMap()
    .then(this.getNeighborhoodNameTable.bind(this))
    .then(this.retrieveNewVideos.bind(this))
    .then(displayVideosJson);
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

    this.neighborhoodsLayer = L.mapbox.featureLayer(this.options.mapboxMapId);

    // On click, show the name of the neighborhood.
    this.neighborhoodsLayer.on('layeradd', function(e) {
      var popupContent = '<strong>' + e.layer.feature.properties.title + '</strong>';
      e.layer.bindPopup(popupContent);
    }.bind(this));

    // Add the neighborhoods to the map. When ready, record the neighborhood records.
    this.neighborhoodsLayer.addTo(this.map).on('ready', function(e) {
      this.neighborhoodsLayer.eachLayer(function(layer) {
        var neighborhood = new Neighborhood(layer.feature);
        var id = neighborhood.getId();
        this.neighborhoods[id] = neighborhood;
      }.bind(this));
      resolve();
    }.bind(this));

  }.bind(this));
};

YoutubeMapbox.prototype.populateNeighborhoodTable = function() {
  return new Promise(function(resolve, reject){

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
      console.log("neighborhood name table", data);
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


YoutubeMapbox.prototype.retrieveCsvVideos = function() {
  return new Promise(function(resolve, reject){
    if (!this.options.csvVideosUrl) {
      resolve();
      return;
    }

    var url = this.options.csvVideosUrl;
    var oReq = new XMLHttpRequest();
    oReq.open("GET", url, true);
    oReq.responseType = "arraybuffer";

    oReq.onload = function(e) {
      var arraybuffer = oReq.response;

      /* convert data to binary string */
      var data = new Uint8Array(arraybuffer);
      var arr = new Array();
      for(var i = 0; i != data.length; ++i) arr[i] = String.fromCharCode(data[i]);
      var bstr = arr.join("");

      /* Call XLSX */
      var options = {
        type: "binary",
        cellFormula: false,
        cellHTML: false,
      };

      var workbook = XLSX.read(bstr, options);

      /* DO SOMETHING WITH workbook HERE */
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
      while (true) {

        var videoId = worksheet[getCellAddress(this.options.csvOptions.videoIdColumn, i)];
        var title = worksheet[getCellAddress(this.options.csvOptions.titleColumn, i)];
        var description = worksheet[getCellAddress(this.options.csvOptions.descriptionColumn, i)];
        var publishedAt = worksheet[getCellAddress(this.options.csvOptions.publishedAtColumn, i)];

        if (!videoId || !title || !description || !publishedAt) { break; }

        var videoJson = {
          "id": {
            "videoId": videoId.v,
          },
          "snippet": {
            "title": title.v,
            "description": description.v,
            "publishedAt": publishedAt.v,
            "thumbnails": {
              "default":{"url":"https://i.ytimg.com/vi/"+videoId.v+"/default.jpg","width":120,"height":90},
              "medium":{"url":"https://i.ytimg.com/vi/"+videoId.v+"/mqdefault.jpg","width":320,"height":180},
              "high":{"url":"https://i.ytimg.com/vi/"+videoId.v+"/hqdefault.jpg","width":480,"height":360}
            },
          },
        };

        var parsedJson = Video.parse(videoJson);
        if (parsedJson) {
          var video = new Video(parsedJson);
          //video.locate(this.neighborhoods);
          this.videos[videoId.v] = video;
        }
        
        i++;
      }

      resolve();

    }.bind(this);

    oReq.send();

  }.bind(this));
};

YoutubeMapbox.prototype.retrieveCachedVideos = function() {
  return new Promise(function(resolve, reject) {
    if (!this.options.cachedVideosUrl) {
      console.log("no cached videos url provided.");
      resolve();
      return;
    }

    $.get(this.options.cachedVideosUrl, function(videosJson) {
      console.log("cached videos json", videosJson);

      // Loop over all the videos and tag them with their neighborhood.
      for (var key in videosJson) {
        var videoJson = videosJson[key];
        var parsedJson = Video.parse(videoJson);
        if (parsedJson) {
          var video = new Video(parsedJson);
          //video.locate(this.neighborhoods);

          var videoId = video.getId();
          this.videos[videoId] = video;
        }
      } // end videos for loop

      //console.log("Videos are", this.videos);

      //var videosText = "videoId,videoTitle,neighborhoodId,neighborhoodName\n";
      //for (var key in this.videos) {
      //  var video = this.videos[key];
      //  videosText += video.getId() + ", " + video.getTitle() + ", " + video.getNeighborhoodId() + ", " + video.getNeighborhoodName() + "\n";
      //}
      //console.log(videosText);

      resolve();
    }.bind(this))
    .fail(function(err) {
      console.error("error", err);
      resolve();
    });
  }.bind(this));
};


// Get all the most recent videos.
YoutubeMapbox.prototype.retrieveNewVideos = function() {
  return new Promise(function(resolve, reject) {
    // No requests to service, so abort!
    if (this.options.requests.length === 0) {
      resolve();
      return;
    }

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
        //video.locate(this.neighborhoods);
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
    var mapping = {};

    for (var key in this.videos) {
      var video = this.videos[key];

      if (this.videoPassesFilters(video)) {
        var videoHasNeighborhoods = !!video.data.neighborhoods;

        if (videoHasNeighborhoods) {
          var neighborhoodIds = video.data.neighborhoods;

          for (var id of neighborhoodIds) {
            if (!mapping[id]) {
              mapping[id] = [video];
            } else {
              mapping[id].push(video);
            }
          }
        }
      } // end filter check
    } // end loop

    this.neighborhoodMap = mapping;

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
    var total = 0;

    for (var id in this.neighborhoodMap) {
      var numVideos = this.neighborhoodMap[id].length;
      total += numVideos;
      var size = Math.min(80, numVideos / 3.0 + 20.0);

      var neighborhood = this.neighborhoods[id];
      var location = neighborhood.getMarkerLocation();
      var sizeTier = neighborhood.getSizeTier(numVideos);

      // https://www.mapbox.com/mapbox.js/example/v1.0.0/divicon/
      var icon = L.divIcon({
        className: 'icon ' + sizeTier,
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

    console.log("Placing", total, "videos");

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
