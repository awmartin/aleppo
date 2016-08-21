
function Neighborhood(featureData) {
  this.featureData = featureData;

  this.processFeatureData();
  this.manager = null;
  this.element = null;
}

Neighborhood.prototype.processFeatureData = function() {
  this.id = this.featureData.feature.id;
  this.data = this.featureData.feature.properties;
  this.name = this.data.NAME;
  this.arabicName = this.data.NAME_A;
  this.coordinates = this.featureData.feature.geometry.coordinates[0];
};

Neighborhood.prototype.setElement = function(element) {
  this.element = element;
  var _this = this;

  this.element.click(function(evt) {
    if (_this.manager) {
      _this.manager.toggleNeighborhoodVisibility(_this);
    }
  });
};

Neighborhood.prototype.setManager = function(manager) {
  this.manager = manager;
};

Neighborhood.prototype.isChecked = function() {
  // Grrr, depends on UI state. >_<
  if (this.element) {
    return this.element.is(':checked');
  }
};
