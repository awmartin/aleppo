function Keyword(english, arabic) {
  this.english = english;
  this.arabic = arabic;
  this.manager = null;
  this.element = null;
  this.active = false;
}

Keyword.prototype.setElement = function(element) {
  var _this = this;
  this.element = element;
  this.element.click(function(evt) {
    if (_this.manager) {
      _this.manager.toggleKeywordVisibility(_this);
    }
  });
};

Keyword.prototype.setManager = function(manager) {
  this.manager = manager;
};

Keyword.prototype.isChecked = function() {
  // Grrr, depends on UI state. >_<
  if (this.element) {
    return this.element.is(':checked');
  }
};
