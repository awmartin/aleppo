
  function FilterManager(neighborhoodsListElt, keywordsListElt) {
    this.neighborhoods = [];
    this.keywords = [];
    this.videos = [];

    this.neighborhoodsList = neighborhoodsListElt;
    this.keywordsList = keywordsListElt;
    this.redraw = null;
    this.map = null;
    this.neighborhoodsLayer = null;
  }

  FilterManager.prototype.addNeighborhood = function(neighborhood) {
    neighborhood.setManager(this);
    this.neighborhoods.push(neighborhood);

    var elt = $('<div class="neighborhood"><input type="checkbox" name="filters" value="' +
      neighborhood.name + '"> ' + neighborhood.name + '</div>');
    neighborhood.setElement($('input', elt));
    this.neighborhoodsList.append(elt);
  };

  FilterManager.prototype.toggleNeighborhoodVisibility = function(neighborhood) {
    var layers = this.neighborhoodsLayer.getLayers();
    var i = 0,
      numLayers = layers.length;

    for (; i < numLayers; i++) {
      var layer = layers[i];
      if (layer.feature.id === neighborhood.id) {
        layer.options.fill = !layer.options.fill;
        layer.options.stroke = !layer.options.stroke;
        break;
      }
    }

    if (this.redraw) {
      this.redraw();
    }

    this.filterVideos();
  };

  FilterManager.prototype.allKeywordsOff = function() {
    var tr = true;
    var i = 0,
      numKeywords = this.keywords.length;

    for (; i < numKeywords; i++) {
      var keyword = this.keywords[i];
      tr = tr && !keyword.isChecked();
    }

    return tr;
  };

  FilterManager.prototype.allNeighborhoodsOff = function() {
    var tr = true;
    var i = 0,
      numNeighborhoods = this.neighborhoods.length;

    for (; i < numNeighborhoods; i++) {
      var neighborhood = this.neighborhoods[i];
      tr = tr && !neighborhood.isChecked();
    }

    return tr;
  };

  FilterManager.prototype.toggleKeywordVisibility = function(keyword) {
    this.filterVideos();
  };

  FilterManager.prototype.filterVideos = function() {
    var i = 0,
      numVideos = this.videos.length,
      showAllKeywords = this.allKeywordsOff(),
      showAllNeighborhoods = this.allNeighborhoodsOff(),
      activeKeywords = [],
      activeNeighborhoods = [];

    var k2 = 0,
      numKeywords2 = this.keywords.length;

    for (; k2 < numKeywords2; k2++) {
      var keyword = this.keywords[k2];
      if (keyword.isChecked()) {
        activeKeywords.push(keyword);
      }
    } // end keyword loop (k)

    var n2 = 0,
      numNeighborhoods2 = this.neighborhoods.length;

    for (; n2 < numNeighborhoods2; n2++) {
      var neighborhood = this.neighborhoods[n2];
      if (neighborhood.isChecked()) {
        activeNeighborhoods.push(neighborhood);
      }
    }


    for (; i < numVideos; i++) {
      var video = this.videos[i];

      if (showAllKeywords && showAllNeighborhoods) {

        video.show();

      } else if (showAllKeywords && !showAllNeighborhoods) {

        var n = 0,
          numNeighborhoods = activeNeighborhoods.length,
          shouldShow = false;

        for (; n < numNeighborhoods; n++) {
          var neighborhood = activeNeighborhoods[n];

          if (video.inNeighborhood(neighborhood)) {
            shouldShow = true;
            break;
          }
        }

        if (shouldShow) {
          video.show();
        } else {
          video.hide();
        }

      } else if (!showAllKeywords && showAllNeighborhoods) {

        var k = 0,
          numKeywords = activeKeywords.length,
          shouldShow = false;

        for (; k < numKeywords; k++) {
          var keyword = activeKeywords[k];
          if (video.hasKeyword(keyword)) {
            shouldShow = true;
            break;
          }
        } // end keyword loop (k)

        if (shouldShow) {
          video.show();
        } else {
          video.hide();
        }
      } else {

        var n = 0,
          numNeighborhoods = activeNeighborhoods.length,
          k = 0,
          numKeywords = activeKeywords.length,
          shouldShow = false;

        for (; n < numNeighborhoods; n++) {
          var neighborhood = activeNeighborhoods[n];

          if (video.inNeighborhood(neighborhood)) {
            shouldShow = true;
            break;
          }
        }

        if (shouldShow) {
          shouldShow = false;
          for (; k < numKeywords; k++) {
            var keyword = activeKeywords[k];
            if (video.hasKeyword(keyword)) {
              shouldShow = true;
              break;
            }
          } // end keyword loop (k)
        }

        if (shouldShow) {
          video.show();
        } else {
          video.hide();
        }

      } // end showAllKeywords false

    } // end numVideos (i) loop
  };

  FilterManager.prototype.addKeyword = function(keyword) {
    keyword.setManager(this);
    this.keywords.push(keyword);

    var elt = $('<div class="neighborhood"><input type="checkbox" name="filters" value="' +
      keyword.arabic + '"> ' + keyword.english + '</div>');
    keyword.setElement($('input', elt));
    this.keywordsList.append(elt);
  }

  FilterManager.prototype.addVideo = function(originalQuery, data, location, thumbnailUrl,
    videoId) {
    var video = new Video(originalQuery, data, location, thumbnailUrl, videoId);
    this.videos.push(video);
    return video;
  };

  FilterManager.prototype.registerKeywords = function(keywordData) {
    for (var english in keywordData) {
      var arabic = keywordData[english];
      var keyword = new Keyword(english, arabic);
      this.addKeyword(keyword);
    }
  };

  FilterManager.prototype.setMap = function(map) {
    this.map = map;
  };

  FilterManager.prototype.getVideoById = function(id) {
    var i = 0,
      numVideos = this.videos.length;

    for (; i < numVideos; i++) {
      var video = this.videos[i];
      if (video.id === id) {
        return video;
      }
    }

    return null;
  };
