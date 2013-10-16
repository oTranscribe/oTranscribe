## Transcriber

**[Transcriber](http://ejb.github.io/transcriber)** (working title) is a free web app designed to take the pain out of transcribing recorded interviews.

- Pause, rewind and fast-forward without taking your hands off the keyboard
- Adjust playback speed with a slider *(keyboard shortcuts are in the works)*
- Your transcript is automatically saved to the browser's `localStorage` every second

... and more!

It's currently under active development by [Elliot Bentley](http://elliotbentley.com/), so expect many changes and additions over the coming weeks. As it makes heavy use of cutting-edge HTML5 features, it may not work on old browsers (or new ones, for that matter).

### Download a copy

Although a [web version](http://ejb.github.io/transcriber) is available, you can install Transcriber anywhere by following these steps:

1. Download [the current ZIP archive](https://github.com/ejb/transcriber/archive/master.zip).
2. Upload the files to a server of your choice.
3. Er...
4. That's it.

Please note that, in Chrome, local copies Transcribe may not run correctly due to the browser's [privacy settings](http://programmers.stackexchange.com/questions/72435/why-is-google-blocking-users-from-accessing-their-local-file-system-in-chromium).

### Compiling the CSS

`style.css` is compiled using SASS from a bunch of files in the `/scss` directory. Once you've installed [SASS](http://sass-lang.com/), just run the following:

```
sass scss/base.scss:style.css
```

### Libraries

Transcriber is built on the foundations of several awesome projects:

- [jQuery](http://jquery.com)
- [AudioJS](http://kolber.github.io/audiojs/)
- [Mousetrap](http://craig.is/killing/mice)
- [CDNJS](http://cdnjs.com/) for script hosting