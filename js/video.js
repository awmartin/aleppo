function Video(data) {
  this.data = data;
  this.neighborhood = null;
}

Video.prototype.getId = function() {
  const video = this.data;

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
  var j = 0,
    numNeighborhoods = neighborhoods.length,
    videoTitle = this.getTitle();

  for (; j < numNeighborhoods; j++) {
    const neighborhood = neighborhoods[j];
    const nameTable = neighborhood.getNameTable();

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
  const thumb = this.data.snippet.thumbnails[size];
  if (thumb) {
    return thumb.url;
  } else {
    return null;
  }
};

Video.prototype.getPublishedDate = function() {
  return this.data.snippet.publishedAt;
};

Video.prototype.getThumbnail = function() {
  var div = $('<div>');

  var thumbnailUrl = this.getThumbnailUrl('default');
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

    var img = $('<img>');
    img.attr('src', thumbnailUrl);
    link.append(img);

    div.append(link);

    var dateElt = $('<div>');
    dateElt.addClass('date');
    var date = String(this.getPublishedDate()).split("T")[0];
    var dateText = document.createTextNode(date);
    dateElt.append(dateText);

    div.append(dateElt);
  }

  return div;
};
