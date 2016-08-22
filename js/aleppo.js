(function() {
  // This function is called when the HTML page loads.
  window.onload = function() {
    var constants = {
      aleppoLocation: {
        lat: 36.198,
        lng: 37.1518
      },
      mapZoom: 13,
      accessToken: 'pk.eyJ1IjoibWljaGFlbGphbWVzc3Rvcm0iLCJhIjoiY2lrMWU2MTQ0M2EzeHdka2k1cTh5dXJreCJ9.YEng7E_ItjPExFDFnFTSQQ',
      mapboxMapId: 'violetwhitney.015226lm',
      mapboxStyle: 'mapbox://styles/mapbox/dark-v8',
      numTotalNeighborhoods: 136,
      numNeighborhoods: 0,
      neighborhoods: [],
      videos: {},
      map: null
    };

    // Gets the video id and accounts for different data structures
    // that YouTube may decide to send.
    var getVideoId = function getVideoId(video) {
      var resourceId = video.snippet.resourceId;
      if (resourceId) {
        return resourceId.videoId;
      }
      if (video.id && video.id.videoId) {
        return video.id.videoId;
      }
    };

    // This creates a new map of Aleppo using MapBox at the given HTML id.
    // e.g. <div id="test-map" class="map"></div>
    var makeMap = function(mapId, onDone) {
      L.mapbox.accessToken = constants.accessToken;
      var map = L.mapbox.map(mapId, 'mapbox.streets')
        .setView(constants.aleppoLocation, constants.mapZoom);
      constants.map = map;

      L.mapbox.styleLayer(constants.mapboxStyle).addTo(map);

      var tmp = {
        layerCount: 0
      };
      var neighborhoodsLayer = L.mapbox.featureLayer(constants.mapboxMapId).addTo(map);

      map.touchZoom.disable();
      map.doubleClickZoom.disable();
      map.scrollWheelZoom.disable();
      map.keyboard.disable();

      neighborhoodsLayer.on('layeradd', function(e) {
        var popupContent = '<strong>' + e.layer.feature.properties.title + '</strong>';
        e.layer.bindPopup(popupContent);
      });

      var averageLatLng = function averageLatLng(latlngs) {
        var i = 0,
          numPoints = latlngs.length;

        var center = {
          lat: 0,
          lng: 0
        };

        for (; i < numPoints; i++) {
          var latlng = latlngs[i];
          center.lat += latlng.lat;
          center.lng += latlng.lng;
        }

        return {
          lat: center.lat / numPoints,
          lng: center.lng / numPoints
        };
      };

      // Add the markers to the map.
      neighborhoodsLayer.on('ready', function onReady(e) {
        var clusterGroup = new L.MarkerClusterGroup();

        e.target.eachLayer(function addMarker(layer) {
          // Find the center of the neighborhood outline.
          var neighborhoodCenter = averageLatLng(layer._latlngs);
          layer.feature.geometry = {
            "type": "Point",
            "coordinates": [neighborhoodCenter.lng, neighborhoodCenter.lat]
          };

          // Store the neighborhood object for future use.
          constants.neighborhoods.push(layer.feature);
        });

        onDone(constants.neighborhoods);
      });

      return map;
    };

    var placeMarkersOnMap = function placeMarkersOnMap() {
      var neighborhoodMap = {};

      for (var key in constants.videos) {
        var video = constants.videos[key];

        var videoHasNeighborhood = video.neighborhood != null;
        if (videoHasNeighborhood) {
          var neighborhood = video.neighborhood;

          // Remember it for later.
          if (neighborhoodMap[neighborhood.id] == null) {
            neighborhoodMap[neighborhood.id] = [video];
          } else {
            neighborhoodMap[neighborhood.id].push(video);
          }
        }
      }

      var geoJson = [],
        n = 0,
        numNeighborhoods = constants.neighborhoods.length;

      for (; n < numNeighborhoods; n++) {
        var neighborhood = constants.neighborhoods[n];
        var neighborhoodVideos = neighborhoodMap[neighborhood.id] || [];

        // If the number of videos in the neighborhood is greater than 0, then
        // add a marker to the map. This effectively hides the "empty"
        // neighborhoods from the map.

        // This further colors and sizes markers based on the number of videos
        // in the neighborhood.

        if (neighborhoodVideos.length > 0 && neighborhoodVideos.length < 5) {
          neighborhood.properties['marker-symbol'] = neighborhoodVideos.length;
          neighborhood.properties['marker-size'] = 'small';
          neighborhood.properties['marker-color'] = '#FF0096';
          geoJson.push(neighborhood);

        } else if (neighborhoodVideos.length >= 5 && neighborhoodVideos.length < 10) {
          neighborhood.properties['marker-symbol'] = neighborhoodVideos.length;
          neighborhood.properties['marker-size'] = 'medium';
          neighborhood.properties['marker-color'] = '#FF006C';
          geoJson.push(neighborhood);

        } else if (neighborhoodVideos.length >= 10 && neighborhoodVideos.length < 15) {
          neighborhood.properties['marker-symbol'] = neighborhoodVideos.length;
          neighborhood.properties['marker-size'] = 'large';
          neighborhood.properties['marker-color'] = '#FF004A';
          geoJson.push(neighborhood);

        } else if (neighborhoodVideos.length >= 15 && neighborhoodVideos.length < 18) {
          neighborhood.properties['marker-symbol'] = neighborhoodVideos.length;
          neighborhood.properties['marker-size'] = 'large';
          neighborhood.properties['marker-color'] = '#FF002C';
          geoJson.push(neighborhood);

        } else if (neighborhoodVideos.length >= 18 && neighborhoodVideos.length < 100) {
          neighborhood.properties['marker-symbol'] = neighborhoodVideos.length;
          neighborhood.properties['marker-size'] = 'large';
          neighborhood.properties['marker-color'] = '#FF0000';
          geoJson.push(neighborhood);

        } else if (neighborhoodVideos.length >= 100) {
          neighborhood.properties['marker-symbol'] = 'x';
          neighborhood.properties['marker-size'] = 'large';
          neighborhood.properties['marker-color'] = '#FF0000';
          geoJson.push(neighborhood);

        }

      } // end of neighborhood loop



      // Count the videos placed in neighborhoods successfully.
      var numPlacedVideos = 0;
      for (var key in neighborhoodMap) {
        numPlacedVideos += neighborhoodMap[key].length;
      }
      console.log("Placed", numPlacedVideos, "videos in neighborhoods.");


      console.log("geoJson:", geoJson);
      var placedVideos = L.mapbox.featureLayer().setGeoJSON(geoJson).addTo(constants.map);

      placedVideos.on('click', function onMarkerClick(e) {
        $('#videos-list').empty();

        var neighborhood = e.layer.feature,
          videos = neighborhoodMap[neighborhood.id],
          i = 0,
          numVideos = videos.length;

        // Sort the videos by snippet.publishedAt.
        videos.sort(function(a, b) {
          if (a.snippet.publishedAt < b.snippet.publishedAt) {
            return 1;
          } else if (a.snippet.publishedAt > b.snippet.publishedAt) {
            return -1;
          } else {
            return 0;
          }
        });

        for (; i < numVideos; i++) {
          var video = videos[i];

          var thumbnail = video.snippet.thumbnails.default;
          if (thumbnail) {
            var div = $('<div>');
            div.addClass('video');

            var link = $('<a>');
            var videoId = getVideoId(video);

            if (videoId) {
              link.attr('href', "https://www.youtube.com/watch?v=" + videoId);
              link.attr('target', '_blank');
            } else {
              link.attr('href', '#');
            }

            var img = $('<img>');
            img.attr('src', thumbnail.url);
            link.append(img);

            div.append(link);

            var dateElt = $('<div>');
            dateElt.addClass('date');
            var date = String(video.snippet.publishedAt).split("T")[0];
            var dateText = document.createTextNode(date);
            dateElt.append(dateText);

            div.append(dateElt);

            $('#videos-list').append(div);
          }
        }

        $('#videos-list').show();
      });
    };

    // Utility function for formatting the neighborhoods from MapBox in JSON.
    // Place this as the first line in onMapDone below to use.
    constants.printedNeighborhoods = false;
    var dumpNeighbohoodsJson = function dumpNeighbohoodsJson() {
      if (!constants.printedNeighborhoods) {

        var result = {};

        var j = 0,
          numNeighborhoods = neighborhoods.length;

        for (; j < numNeighborhoods; j++) {
          var neighborhood = neighborhoods[j];
          var name_a = neighborhood.properties.NAME_A;
          var name = neighborhood.properties.NAME;

          console.log(name_a, name, neighborhood);

          var neighborhoodJson = {};

          neighborhoodJson.original_name_a = name_a;
          neighborhoodJson.original_name = name;
          neighborhoodJson.alternative_arabic = [name_a];
          neighborhoodJson.alternative_english = [name];

          result[neighborhood.id] = neighborhoodJson;
        }

        console.log(JSON.stringify(result));

        constants.printedNeighborhoods = true;
      }
    };

    var onMapDone = function(neighborhoods) {
      // Attempts to associate video titles with the known neighborhood names.
      var locateTheVideo = function(video) {
        var j = 0,
          numNeighborhoods = neighborhoods.length;

        for (; j < numNeighborhoods; j++) {
          var neighborhood = neighborhoods[j];
          var nameEquivalencyTable = constants.neighborhoodNames[neighborhood.id];

          if (nameEquivalencyTable) {

            var ar = 0,
              numArabic = nameEquivalencyTable.alternative_arabic.length,
              en = 0,
              numEnglish = nameEquivalencyTable.alternative_english.length;

            // Loop through all the equivalent arabic names. Stop if we find a name in the title.
            for (; ar < numArabic; ar++) {
              var arabicName = nameEquivalencyTable.alternative_arabic[ar];
              if (video.snippet.title.includes(arabicName)) {
                video.neighborhood = neighborhood;
                break;
              }
            }
            // Loop through all the equivalent english names too. Stop if we find one in the title.
            for (; en < numEnglish; en++) {
              var englishName = nameEquivalencyTable.alternative_english[en];
              if (video.snippet.title.includes(englishName)) {
                video.neighborhood = neighborhood;
                break;
              }
            }

          } else {
            // The default behavior. Needed if something is wrong with or missing from the
            // equivalency table.
            var name_a = neighborhood.properties.NAME_A;
            var title = neighborhood.properties.title;

            if (video.snippet.title.includes(name_a) || video.snippet.title.includes(title)) {
              video.neighborhood = neighborhood;
            }
          }

        }
      };


      // This function is essentially what you do when all the videos are retrieved.
      var onYouTubeDone = function(videos) {
        console.log("Got ", videos.length, " videos:", videos);

        var i = 0,
          numVideos = videos.length;

        // Loop over all the videos and tag them with their neighborhood.
        for (; i < numVideos; i++) {
          var video = videos[i];
          var videoId = getVideoId(video);

          locateTheVideo(video);

          constants.videos[videoId] = video;
        } // end videos for loop

        // Put the markers on the map.
        placeMarkersOnMap();
      };

      var yt = new YouTube("AIzaSyCp5aUBEFSWZIjOy7Q-OZA5A5PhLscZnN4");

      // Change to yt.getAllVideosFromChannelViaPlaylists to get all the videos
      // linked in playlists in a channel.

      // This request limits the results to 500 videos.
      // yt.getAllVideosFromChannel('UCALQlTUA8X31_af5f083yaw', onYouTubeDone);

      // Channel IDs:
      // - UCALQlTUA8X31_af5f083yaw : has videos only up until about 6 months ago.
      // - UCesBL01BgmHzdp1GZT2ltJw : has new videos.

      // Request videos in a date range like this:
      // yt.getAllVideosFromChannel('UCesBL01BgmHzdp1GZT2ltJw', onYouTubeDone, {
      //   publishedAfter: '2016-06-11T00:00:00Z',
      //   publishedBefore: '2016-06-27T00:00:00Z',
      // });

      // Get all the most recent videos.
      yt.getAllVideosFromChannel('UCesBL01BgmHzdp1GZT2ltJw', onYouTubeDone, {
        publishedAfter: '2016-08-21T00:00:00Z',
      });


      // Videos are cached in data/videos.json. Request that first and map them.

      var placeCachedVideos = function(videos) {
        // Loop over all the videos and tag them with their neighborhood.
        for (var key in videos) {
          var video = videos[key];
          var videoId = getVideoId(video);

          locateTheVideo(video);

          constants.videos[videoId] = video;
        } // end videos for loop

        // Put the markers on the map.
        placeMarkersOnMap();
      };

      $.get('data/videos.json', placeCachedVideos);



      // Get all the videos throughout the given data ranges in data/LandsatDateRangeBiweek.csv.
      // Use this to help build the cache at data/videos.csv.

      /*$.get('data/LandsatDateRangeBiWeek.csv', function(data) {
        // Parse the csv data into rows.
        var dates = data.split("\n");
        var i = 0,
          numDates = dates.length;

        constants.numBiweeklyRequestsExpected = numDates - 1;

        var onBiweeklyRequestDone = function(videos) {
          constants.numBiweeklyRequestsExpected -= 1;
          onYouTubeDone(videos);

          if (constants.numBiweeklyRequestsExpected === 0) {
            console.log(JSON.stringify(constants.videos));
          }
        };

        for (; i < numDates - 1; i++) {
          var after = dates[i];
          var before = dates[i + 1];

          if (before === '') {
            yt.getAllVideosFromChannel(
              'UCALQlTUA8X31_af5f083yaw',
              onBiweeklyRequestDone, {
                publishedAfter: after,
              });
          } else {
            yt.getAllVideosFromChannel(
              'UCALQlTUA8X31_af5f083yaw',
              onBiweeklyRequestDone, {
                publishedAfter: after,
                publishedBefore: before,
              });
          }

        }
      });*/

    }; // onMapDone


    // Get the neighborhood name equivalency data.
    $.get('data/neighborhoods.json', function(data) {
      console.log("Got the name equivalency table:", data);
      constants.neighborhoodNames = data;

      // Creates a new map to play with. It does return an object you can mess with.
      makeMap('test-map', onMapDone);
    });

  };
})();
