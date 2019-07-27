![alt text](https://github.com/Jahn08/WEB-PAGE-HIGHLIGHTER/blob/master/icons/highlighter.svg)

# WEB-PAGE-HIGHLIGHTER

A Firefox extension that marks text on a web page. The general functionality:

* Marking text with several colours through a context menu on a page
* Saving the marked text and loading it later when accessing the same page
* Preferences for changing the default colour for marking and autoloading a page, provided it is available in the storage ([more about configuring](#headConfiguration))
* Adding notes on a page and navigating them through quick scrolling by means of clicking the respective links in the context menu

## Installing / Getting started

The application will soon be available on the official site for Firefox extensions. It is also possible to [deploy it locally](#headDeploying).

## Developing

### Built with

As development dependencies necessary to build an environment for tests there are:

* [babel-core 6.26.3](https://www.npmjs.com/package/babel-core/v/6.26.3)
* [babel-preset-es2015 6.24.1](https://www.npmjs.com/package/babel-preset-es2015/v/6.24.1)
* [jsdom 14.0.0](https://www.npmjs.com/package/jsdom/v/14.0.0)
* [jsdom-global 3.0.2](https://www.npmjs.com/package/jsdom-global/v/3.0.2)
* [mocha 6.1.4](https://www.npmjs.com/package/mocha/v/6.1.4)

### Prerequisites

* [Node.js 8.10.0](https://nodejs.org/download/release/v8.10.0) is used for running tests
* Npm 6.9.0 ([how to install](https://www.npmjs.com/get-npm))
* [Visual Studio Code](https://code.visualstudio.com/) was used as an IDE

### <a name="headDeploying"></a>Deploying / Debugging

To install it locally you need to type *about:debugging* as a URL in your browser and after clicking a button *Load Temporary Add-on* choose the project's *manifest.json* file in your file system. Thereafter the highlighter options will become visible in the context menu of web pages as well as a popup icon on the upper panel of your browser.

The background scripts can be debugged from the *about:debugging* page through the respective button, whereas code on the client side is available in the developer panel (f12) under the *moz-extension* section in the Sources list.

## <a name="headConfiguration"></a>Configuration

The plugin has a configuration page with the next preferences:
* *Warning about unsaved changes* - the flag determines whether there will be a warning dialog when the user is leaving the page while having marked or unmarked some text on the page. It is turned on by default
* *Loading a page automatically from the storage* - if there is a copy of the current page previously saved in the storage, then it will be loaded automatically, otherwise the user can manually load it clicking the respective option in the context menu or in the popup menu on the upper browser panel. It is off by default
* *Default colour* - the flag is responsible for setting a default colour in the colour palette for marking when opening a page. The default colour is green
