const $ = require('jquery');

export default function(callbackFn) {
    
    let currentText = '';
    let currentFilename = '';
    
    var gd = {
        CLIENT_ID : '219206830455.apps.googleusercontent.com',
        SCOPES : 'https://www.googleapis.com/auth/drive'
    }

    // Called during startup to prevent blocking
    var script = document.createElement("script");
    script.type = "text/javascript";
    script.src = "https://apis.google.com/js/client.js?onload=window.googleDriveStartLoad";
    document.body.appendChild(script);

    /**
     * Called when the client library is loaded to start the auth flow.
     */
    window.googleDriveStartLoad = function() {
      window.setTimeout(checkAuth, 1);
    }

    /**
     * Check if the current user has authorized the application.
     */
    function checkAuth({text, filename}) {
        currentText = text;
        currentFilename = filename;
        try {
            gapi.auth2.authorize(
                {'client_id': gd.CLIENT_ID, 'scope': gd.SCOPES, 'immediate': true},
                handleAuthResult);
        } catch(e) {
            // issue connecting to google drive
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
    function handleAuthResult(authResult) {
      if (authResult && !authResult.error) {
        // Access token has been successfully retrieved, requests can be sent to the API.
        gd.updateButton("Google Drive",true);
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
        if (link) {
            exportBlockGd[0].removeEventListener('click', insertGoogleDriveFile);
            exportBlockGd[0].href = link;
        } else {
            exportBlockGd[0].addEventListener('click', insertGoogleDriveFile);
        }
        
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
    
    const createBlob = function(){
        var p = currentText;
        var aFileParts = [p];
        var oBlob = new Blob(aFileParts, {type : 'text/html'}); // the blob
        return oBlob;
    }
    
    const createReader = function(){
        var reader = new FileReader();
        var blob = createBlob();
        reader.readAsBinaryString(blob);
        return reader;
    }

    /**
     * Insert new file.
     *
     * @param {File} fileData File object to read data from.
     * @param {Function} callback Function to call when the request is complete.
     */
    window.insertGoogleDriveFile = function(callback) {
        var sendingText = document.webL10n.get('send-drive');
        gd.updateButton(sendingText,false);

      const boundary = '-------314159265358979323846';
      const delimiter = "\r\n--" + boundary + "\r\n";
      const close_delim = "\r\n--" + boundary + "--";

      var reader = createReader();
      reader.onload = function(e) {
        var contentType = 'text/html';
        var metadata = {
            'title': currentFilename,
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
        request.execute(function(file) {
              var openText = document.webL10n.get('open-drive');
              gd.updateButton(openText + ' &rarr;', true, file.alternateLink);
        });
      } // reader.onload
    }
    
    callbackFn();
    return checkAuth;
}

