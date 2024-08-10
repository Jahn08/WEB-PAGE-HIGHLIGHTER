![alt text](https://github.com/Jahn08/WEB-PAGE-HIGHLIGHTER/blob/master/icons/highlighter48.png)

# WEB-PAGE-HIGHLIGHTER

A Google Chrome extension that marks text on a web page. It is based on manifest v3, as Chrome has started dropping support of manifest v2 extensions [since June 3 2024](https://developer.chrome.com/docs/extensions/develop/migrate/mv2-deprecation-timeline). Mozilla Firefox's implmentation of manifest v3 differs from that in Chrome but Mozilla still supports manifest v2, that is why the current version of the extension is available in [its own repository](https://github.com/Jahn08/WEB-PAGE-HIGHLIGHTER-MANIFEST2).

The general functionality:
* Marking text with several colours through a context menu on a page
* Saving the marked text and loading it later when accessing the same page
* Preferences for changing the default colour for marking and autoloading a page, provided it is available in the storage ([more about configuring](#headConfiguration))
* Categorising pages when saving or in the preferences
* Adding notes on a page and navigating them through quick scrolling by means of clicking the respective links in the context menu
* Supporting keyboard shortcuts for frequently used commands in the context menu
* Importing and exporting stored pages between different devices and browsers (it is available for [installing](#headInstalling) in Chrome) through the preferences page

## <a name="headInstalling"></a>Installing / Getting started

The application is available in [the Chrome store](https://chrome.google.com/webstore/detail/highbrighter/gccbpihjfohfiipkoclimdkkeinadega). It is also possible to [deploy it locally](#headDeploying).

## Developing

### Built with

As development dependencies necessary to build an environment for tests there are:

* [babel-core 6.26.3](https://www.npmjs.com/package/babel-core/v/6.26.3)
* [babel-preset-es2015 6.24.1](https://www.npmjs.com/package/babel-preset-es2015/v/6.24.1)
* [jsdom 16.7.0](https://www.npmjs.com/package/jsdom/v/16.7.0)
* [jsdom-global 3.0.2](https://www.npmjs.com/package/jsdom-global/v/3.0.2)
* [mocha 10.2.0](https://www.npmjs.com/package/mocha/v/10.2.0)

### Prerequisites

* [Node.js 16.20.2](https://nodejs.org/download/release/latest-v16.x/) is used for running tests
* Npm 8.19.4 ([how to install](https://www.npmjs.com/get-npm)) - Node.js is likely to include it  
* [Visual Studio Code](https://code.visualstudio.com/) was used as an IDE

### <a name="headDeploying"></a>Deploying / Debugging

To install it locally you need to type *chrome://extensions* as a URL in your browser and after clicking a button *Load unpacked* choose the project's folder in your file system. Thereafter the highlighter options will become visible in the context menu of web pages as well as a popup icon on the upper panel of your browser.

The background scripts can be debugged from the *chrome://extensions* page by clicking on a link *service worker* of an extension, whereas code on the client side is available in the developer panel (f12) in the *Content scripts* tab of the Sources page.

## <a name="headConfiguration"></a>Configuration

The plugin has a configuration page with the next preferences:
* *Warning about unsaved changes* - the flag determines whether there will be a warning dialog when the user is leaving the page while having marked or unmarked some text on the page. It is turned on by default
* *Loading a page automatically from the storage* - if there is a copy of the current page previously saved in the storage, then it will be loaded automatically, otherwise the user can manually load it clicking the respective option in the context menu or in the popup menu on the upper browser panel. It is off by default
* *Default colour* - the flag is responsible for setting a default colour in the colour palette for marking when opening a page. The default colour is green
* A table with categories to put or save pages into
* A table featuring all saved pages in the browser storage and available for editing.
