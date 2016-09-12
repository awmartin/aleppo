function DateFilter() {
  // Default state is to show all videos.
  this.beforeDate = null;
  this.afterDate = null;
}

DateFilter.prototype.setBeforeDate = function(dateStr) {
  if (!dateStr) {
    this.beforeDate = null;
  } else {
    this.beforeDate = new Date(dateStr);
  }
};

DateFilter.prototype.setAfterDate = function(dateStr) {
  if (!dateStr) {
    this.afterDate = null;
  } else {
    this.afterDate = new Date(dateStr);
  }
};

DateFilter.prototype.passes = function(video) {
  var videoDate = video.getPublishedDate();

  if (!this.beforeDate && !this.afterDate) {
    return true;
  } else if (!this.beforeDate && this.afterDate) {
    return this.afterDate <= videoDate;
  } else if (this.beforeDate && !this.afterDate) {
    return videoDate <= this.beforeDate;
  } else {
    return this.afterDate <= videoDate && videoDate <= this.beforeDate;
  }

};

DateFilter.prototype.initializeGui = function(onPick) {
  var datePicker = $('#date-picker input');

  datePicker.daterangepicker({
    autoUpdateInput: false,
    locale: {
      cancelLabel: 'Clear'
    },
    drops: 'down',
    opens: 'left',
  });

  datePicker.on('apply.daterangepicker', function(ev, picker) {
    onPick(picker.startDate, picker.endDate);
    datePicker.val(picker.startDate.format('MM/DD/YYYY') + ' - ' + picker.endDate.format(
      'MM/DD/YYYY'));
  });

  datePicker.on('cancel.daterangepicker', function(ev, picker) {
    onPick(null, null);
    datePicker.val('');
  });
};
