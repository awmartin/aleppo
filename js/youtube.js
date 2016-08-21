function YouTube(apiKey) {
  this.apiKey = apiKey;
}

// onDone = function(playlists) { ... }
// https://www.googleapis.com/youtube/v3/playlists?part=snippet&channelId=UCALQlTUA8X31_af5f083yaw&maxResults=22&pageToken=CBYQAA&key={YOUR_API_KEY}

YouTube.prototype.getAllPlaylistsFromChannel = function(channelId, onDone) {
  $.ajax({
    url: 'https://www.googleapis.com/youtube/v3/playlists',
    method: 'GET',
    headers: {},
    data: {
      'channelId': channelId,
      'key': this.apiKey,
      'part': 'snippet',
      'maxResults': 50
    },
    success: function(data) {
      onDone(data.items);
    },
    error: function(jqXHR) {
      onDone([]);
    }
  });
};


YouTube.prototype.getAllVideosFromPlaylist = function(playlistId, onDone, options = {}) {

  var onSuccess = function onSuccess(data) {
    var itemsSoFar = options.items || [];
    if (data.nextPageToken) {
      console.log("Requesting another page:", data.nextPageToken);
      this.getAllVideosFromPlaylist(playlistId, onDone, {
        items: itemsSoFar.concat(data.items),
        pageToken: data.nextPageToken
      });
    } else {
      onDone(itemsSoFar.concat(data.items));
    }
  }.bind(this);


  var postData = {
    'playlistId': playlistId,
    'key': this.apiKey,
    'part': 'snippet',
    'maxResults': 50
  };

  if (options.pageToken) {
    postData.pageToken = options.pageToken;
  }

  $.ajax({
    url: 'https://www.googleapis.com/youtube/v3/playlistItems',
    method: 'GET',
    headers: {},
    data: postData,
    success: onSuccess,
    error: function onError(jqXHR) {
      onDone([]);
    }
  });
};

// onDone = function(videos) { ... }
YouTube.prototype.getAllVideosFromChannelViaPlaylists = function(channelId, onDone) {

  var onGotAllPlaylists = function onGotAllPlaylists(playlists) {
    var requestState = {
      numRetrieved: 0,
      numPlaylists: playlists.length,
      videos: []
    };

    var i = 0,
      numPlaylists = playlists.length;

    for (; i < numPlaylists; i++) {
      var playlist = playlists[i];

      var onGotPlaylistItems = function onGotPlaylistItems(items) {
        requestState.numRetrieved += 1;
        requestState.videos = requestState.videos.concat(items);
        if (requestState.numRetrieved === requestState.numPlaylists) {
          console.log("Number of videos:", requestState.videos.length);
          onDone(requestState.videos);
        }
      };

      this.getAllVideosFromPlaylist(playlist.id, onGotPlaylistItems.bind(this));
    }
  };

  this.getAllPlaylistsFromChannel(channelId, onGotAllPlaylists.bind(this));
};

YouTube.prototype.getAllVideosFromChannel = function(channelId, onDone, options = {}) {

  var onSuccess = function onSuccess(data) {
    var itemsSoFar = options.items || [];
    console.log("Got", data.items.length, "videos on this page.");

    if (data.items.length === 0 || !data.nextPageToken) {
      onDone(itemsSoFar.concat(data.items));

    } else {
      console.log("Requesting another page:", data.nextPageToken);

      this.getAllVideosFromChannel(channelId, onDone, {
        items: itemsSoFar.concat(data.items),
        pageToken: data.nextPageToken
      });
    }

  }.bind(this);


  var postData = {
    'channelId': channelId,
    'key': this.apiKey,
    'part': 'snippet',
    'maxResults': 50,
    'type': 'video'
  };

  if (options.publishedBefore) {
    postData.publishedBefore = options.publishedBefore;
  }
  if (options.publishedAfter) {
    postData.publishedAfter = options.publishedAfter;
  }

  if (options.pageToken) {
    postData.pageToken = options.pageToken;
  }

  $.ajax({
    url: 'https://www.googleapis.com/youtube/v3/search',
    method: 'GET',
    headers: {},
    data: postData,
    success: onSuccess,
    error: function onError(jqXHR) {
      onDone([]);
    }
  });
};
