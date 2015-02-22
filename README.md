## oTranscribe

**[oTranscribe](http://oTranscribe.com/)** is a free web app designed to take the pain out of transcribing recorded interviews.

- Pause (ESC), rewind (F1) and fast-forward (F2) without taking your hands off the keyboard
- Adjust playback speed with a slider or using F3/F4
- Your transcript is automatically saved to the browser's `localStorage` every second
- Rich text support using `contentEditable`
- YouTube and video file support

... and more!


### Download a copy

Although a [web version](http://otranscribe.com/) is available, you can install oTranscribe anywhere by following these steps:

1. Download [the current ZIP archive](https://github.com/otranscribe/otranscribe/archive/master.zip).
2. Compile the CSS and JS with Grunt (see below for more detailed instructions).
2. Upload the files to a server of your choice.
3. Er...
4. That's it.

Please note that, in Chrome, local copies oTranscribe may not run correctly due to the browser's [privacy settings](http://programmers.stackexchange.com/questions/72435/why-is-google-blocking-users-from-accessing-their-local-file-system-in-chromium).

### Compiling the CSS and JavaScript

This repository only includes the "raw" JavaScript and CSS. To compile the production-ready files, install [Grunt](http://gruntjs.com) and then run the `grunt` command.

Unfamiliar with Grunt? Check out [Chris Coyier's excellent guide](http://24ways.org/2013/grunt-is-not-weird-and-hard/) to this useful build tool.

### OTR file format

oTranscribe has its own file format (.otr), which is just a JSON file with the following parameters:

* **text**: The raw HTML of the transcript
* **media**: If available, the name of the last media used
* **media-source**: If available, a link to the last media used
* **media-time**: If available, the playtime of the last media used

### Translations

Translations have been provided by the following talented and generous volunteers:

*   Catalan: [Joan Montané](http://www.softcatala.org/wiki/Usuari:Jmontane) and [Jon Sindreu](https://twitter.com/jonsindreu).
*   Chinese: baiqj and Cindy Ng.
*   Danish: [Christian Bruun](http://christianb.dk).
*   Dutch: [Patrick Mackaaij](http://www.eenmanierom.nl) and Marjolein Quist.
*   French: [Olivier Aubert](http://www.olivieraubert.net), [@goofy-bz](https://github.com/goofy-bz) and [Dr J Rogel-Salazar](http://quantumtunnel.wordpress.com).
*   German: [Dr J Rogel-Salazar](http://quantumtunnel.wordpress.com) and Lisa Bernhardt.
*   Indonesian: [Joy Tikoalu](mailto:joy.tikoalu@gmail.com).
*   Italian: [Dr J Rogel-Salazar](http://quantumtunnel.wordpress.com), [Edoardo Putti](http://edoput.it) and Federico Lasta.
*   Japanese: [harupong](http://blog.harupong.com).
*   Polish: Emil Maruszczak and Piotr Tarasewicz.
*   Portuguese: [enVide neFelibata](http://www.envidenefelibata.com).
*   Spanish: [Cristian Duque](https://github.com/crskkk), [Dr J Rogel-Salazar](http://quantumtunnel.wordpress.com) and [Adrián Blanco](https://twitter.com/AdrianBlancoR).

More about translating oTranscribe [here](https://github.com/oTranscribe/oTranscribe/wiki/Help-translate-oTranscribe).

### Libraries

oTranscribe is built on the foundations of several awesome projects:

- [jQuery](http://jquery.com)
- ~~[AudioJS](http://kolber.github.io/audiojs/)~~ (replaced with [progressor.js](https://github.com/ejb/progressor.js))
- [Mousetrap](http://craig.is/killing/mice)
- [CDNJS](http://cdnjs.com/) for script hosting
- [Font Awesome](http://fontawesome.io/)
- [to-markdown](https://github.com/domchristie/to-markdown)
- [jquery-clean](https://code.google.com/p/jquery-clean/)
- [webL10n](https://github.com/fabi1cazenave/webL10n)