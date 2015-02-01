
var gd = {
    CLIENT_ID : '219206830455.apps.googleusercontent.com',
    SCOPES : 'https://www.googleapis.com/auth/drive'
}


// Called during startup to prevent blocking
gd.loadGoogleApiAsync = function(){
    var script = document.createElement("script");
    script.type = "text/javascript";
    script.src = "https://apis.google.com/js/client.js?onload=gd.handleClientLoad";
    document.body.appendChild(script);
}


/**
 * Called when the client library is loaded to start the auth flow.
 */
gd.handleClientLoad = function() {
  window.setTimeout(gd.checkAuth, 1);
}

/**
 * Check if the current user has authorized the application.
 */
gd.checkAuth = function() {
    try {
        gapi.auth.authorize(
            {'client_id': gd.CLIENT_ID, 'scope': gd.SCOPES, 'immediate': true},
            gd.handleAuthResult);
    } catch(e) {
        $('.export-block-gd').css({
            'opacity': 0.5,
            'pointer-events': 'none'
        });
    }
}

/**
 * Called when authorization server replies.
 *
 * @param {Object} authResult Authorization result.
 */
gd.handleAuthResult = function(authResult) {
  if (authResult && !authResult.error) {
    // Access token has been successfully retrieved, requests can be sent to the API.
    gd.updateButton("Google Drive",true,"javascript:insertFile();");
  } else {
    // No access token could be retrieved, show the button to start the authorization flow.
    document.getElementById('x-gd-sign').onclick = function() {
        gapi.auth.authorize(
            {'client_id': gd.CLIENT_ID, 'scope': gd.SCOPES, 'immediate': false},
            gd.handleAuthResult);
    };
  }
}

gd.updateButton = function(status, active, link){
    var exportBlockGd = $('.export-block-gd');
    exportBlockGd[0].innerHTML = status;
    if (active == true){
        exportBlockGd.addClass('gd-authenticated').removeClass("unauth");  
    } else if (active == false){
        exportBlockGd.removeClass('gd-authenticated');
    }
    exportBlockGd[0].href = link;
}

gd.button = function(){
    var signIn = document.webL10n.get('sign-in');
    var text = '<a class="export-block-gd unauth" id="x-gd" target="_blank" href="javascript:void(0);">Google Drive<div class="sign-in" id="x-gd-sign">'
    + signIn +
    '</div></a>'
    return text;
}

function uploadFile(evt) {
  gapi.client.load('drive', 'v2', function() {
    var file = evt.target.files[0];
    insertFile(file);
  });
}

/**
 * Insert new file.
 *
 * @param {File} fileData File object to read data from.
 * @param {Function} callback Function to call when the request is complete.
 */
window.insertFile = function(callback) {
    var sendingText = document.webL10n.get('send-drive');
    gd.updateButton(sendingText,false);

  const boundary = '-------314159265358979323846';
  const delimiter = "\r\n--" + boundary + "\r\n";
  const close_delim = "\r\n--" + boundary + "--";

  var reader = exportText.reader();
  reader.onload = function(e) {
    var contentType = 'text/html';
    var metadata = {
      'title': exportText.name(),
      'mimeType': 'text/html'
    };

    var base64Data = btoa(reader.result);
    var multipartRequestBody =
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: ' + contentType + '\r\n' +
        'Content-Transfer-Encoding: base64\r\n' +
        '\r\n' +
        base64Data +
        close_delim;

    var request = gapi.client.request({
        'path': '/upload/drive/v2/files',
        'method': 'POST',
        'params': {'uploadType': 'multipart','convert':true},
        'headers': {
          'Content-Type': 'multipart/mixed; boundary="' + boundary + '"'
        },
        'body': multipartRequestBody});
    if (!callback) {
      callback = function(file) {
          var openText = document.webL10n.get('open-drive');
        gd.updateButton(openText + ' &rarr;', true, file.alternateLink);
      };
    }
    request.execute(callback);
  }
}