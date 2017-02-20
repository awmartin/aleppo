function Video(data) {
  this.data = data;
}

Video.parse = function(data) {
  if (typeof data === 'string') {
    data = JSON.parse(data);
  }

  var result = {};

  if (data.items) {
    result = data.items[0];
  }

  if (result && data.neighborhoods) {
    result.neighborhoods = data.neighborhoods;
  }

  return result;
}

Video.prototype.getId = function() {
  if (typeof this.data.id === 'string') {
    return this.data.id;
  }
  var video = this.data;

  var resourceId = video.snippet.resourceId;
  if (resourceId) {
    return resourceId.videoId;
  }
  if (video.id && video.id.videoId) {
    return video.id.videoId;
  }
};

// Attempts to associate video titles with the known neighborhood names.
Video.prototype.locate = function(neighborhoods) {
  var videoTitle = this.getTitle();

  for (var id in neighborhoods) {
    var neighborhood = neighborhoods[id];
    var nameTable = neighborhood.getNameTable();

    if (nameTable) {

      var ar = 0,
        numArabic = nameTable.alternative_arabic.length,
        en = 0,
        numEnglish = nameTable.alternative_english.length;

      // Loop through all the equivalent arabic names. Stop if we find a name in the title.
      for (; ar < numArabic; ar++) {
        var arabicName = nameTable.alternative_arabic[ar];
        if (videoTitle.includes(arabicName)) {
          this.neighborhood = neighborhood;
          break;
        }
      }
      // Loop through all the equivalent english names too. Stop if we find one in the title.
      for (; en < numEnglish; en++) {
        var englishName = nameTable.alternative_english[en];
        if (videoTitle.includes(englishName)) {
          this.neighborhood = neighborhood;
          break;
        }
      }

    } else {

      // The default behavior. Needed if something is wrong with or missing from the
      // equivalency table.
      var arabic = neighborhood.getArabicName();
      var english = neighborhood.getEnglishName();

      if (videoTitle.includes(arabic) || videoTitle.includes(english)) {
        this.neighborhood = neighborhood;
      }
    }

  }
}; // end locate()

Video.prototype.getTitle = function() {
  return this.data.snippet.title;
};

Video.prototype.getThumbnailUrl = function(size) {
  var thumb = this.data.snippet.thumbnails[size];
  if (thumb) {
    return thumb.url;
  } else {
    return null;
  }
};

Video.prototype.getPublishedDate = function() {
  return new Date(this.data.snippet.publishedAt);
};

Video.prototype.getThumbnail = function() {
  var div = $('<div>');

  var thumbnailUrl = this.getThumbnailUrl('medium');
  if (thumbnailUrl) {
    div.addClass('video');

    var link = $('<a>');
    var videoId = this.getId();

    if (videoId) {
      link.attr('href', "https://www.youtube.com/watch?v=" + videoId);
      link.attr('target', '_blank');
    } else {
      link.attr('href', '#');
    }
    var secondLink = link.clone();
    secondLink.addClass('title-link');

    var img = $('<img>');
    img.attr('src', thumbnailUrl);
    link.append(img);

    div.append(link);

    var dateElt = $('<div>');
    dateElt.addClass('date');
    var date = this.getPublishedDate().toDateString();
    var dateText = document.createTextNode(date);
    dateElt.append(dateText);

    var titleElt = $('<div>');
    titleElt.addClass('title');
    var titleText = document.createTextNode(this.getTitle());
    titleElt.append(titleText);

    secondLink.append(titleElt);
    secondLink.append(dateElt);

    var infoElt = $('<div>');
    infoElt.addClass('info');
    infoElt.append(secondLink)
    div.append(infoElt);
  }

  return div;
};

// Attempts to associate video titles with the known neighborhood names.
Video.prototype.locateVerbose = function(neighborhoods) {
  var videoTitle = this.getTitle();

  for (var id in neighborhoods) {
    var neighborhood = neighborhoods[id];
    var nameTable = neighborhood.getNameTable();

    if (nameTable) {
      var ar = 0,
        numArabic = nameTable.alternative_arabic.length,
        en = 0,
        numEnglish = nameTable.alternative_english.length;

      // Loop through all the equivalent arabic names. Stop if we find a name in the title.
      for (; ar < numArabic; ar++) {
        var arabicName = nameTable.alternative_arabic[ar];
        if (videoTitle.includes(arabicName)) {
          this.neighborhood = neighborhood;
          break;
        }
      }
      // Loop through all the equivalent english names too. Stop if we find one in the title.
      for (; en < numEnglish; en++) {
        var englishName = nameTable.alternative_english[en];
        if (videoTitle.includes(englishName)) {
          this.neighborhood = neighborhood;
          break;
        }
      }

    } else {

      // The default behavior. Needed if something is wrong with or missing from the
      // equivalency table.
      var arabic = neighborhood.getArabicName();
      var english = neighborhood.getEnglishName();

      if (videoTitle.includes(arabic) || videoTitle.includes(english)) {
        this.neighborhood = neighborhood;
      }
    }

  }
}; // end locateVerbose()

Video.prototype.getNeighborhoodName = function() {
  if (this.neighborhood) {
    return this.neighborhood.getEnglishName() || this.neighborhood.getArabicName();
  } else {
    return null;
  }
};

Video.prototype.getNeighborhoodId = function() {
  if (this.neighborhood) {
    return this.neighborhood.getId();
  } else {
    return null;
  }
};

