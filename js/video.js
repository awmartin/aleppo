function Video(originalQuery, data, location, thumbnailUrl, videoId) {
  this.id = videoId;

  this.originalQuery = originalQuery;
  this.data = data;
  this.title = this.data.snippet.title;

  this.mapLocation = location;
  this.thumbnailUrl = thumbnailUrl;
  this.videoId = videoId;

  this.element = null;
}

Video.prototype.setElement = function(element) {
  this.element = element;
};

Video.prototype.show = function() {
  if (this.element) {
    this.element.show();
  }
};

Video.prototype.hide = function() {
  if (this.element) {
    this.element.hide();
  }
};

Video.prototype.hasKeyword = function(keyword) {
  return this.title.includes(keyword.arabic) || this.title.includes(keyword.english);
};

Video.prototype.inNeighborhood = function(neighborhood) {
  return this.title.includes(neighborhood.name) || this.title.includes(neighborhood.arabicName);
};
