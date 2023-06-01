/**
 * exitIntent class based on bioEp: http://beeker.io/exit-intent-popup-script-tutorial
 *
 * Purpose:
 *  Open something (like a modal) after the user moves their mouse out of the window (to exit the page).
 *  The code can create a cookie preventing the modal from re-opening multiple times.
 *
 * Options: http://beeker.io/exit-intent-popup-script-tutorial#bio_ep_options
 * Usage:
```
import ExitIntent from 'cromedics/exit-intent';
new ExitIntent({
  cookieExp: 0, //cookie expiration # days, a value of 0 will always show the popup.
  cookie: 'exitIntent_shown', //the name of the cookie
  delay: 5, //automatically open after this many seconds
  showOnDelay: false, //open after the delay specified above...
  callback: () => {
    //Do something
  },
});
```
 */

function detectIE() {
    var ua = window.navigator.userAgent;

    var msie = ua.indexOf('MSIE ');
    if (msie > 0) {
        // IE 10 or older => return version number
        return parseInt(ua.substring(msie + 5, ua.indexOf('.', msie)), 10);
    }

    var trident = ua.indexOf('Trident/');
    if (trident > 0) {
        // IE 11 => return version number
        var rv = ua.indexOf('rv:');
        return parseInt(ua.substring(rv + 3, ua.indexOf('.', rv)), 10);
    }

    var edge = ua.indexOf('Edge/');
    if (edge > 0) {
       // Edge (IE 12+) => return version number
       return parseInt(ua.substring(edge + 5, ua.indexOf('.', edge)), 10);
    }

    // other browser
    return false;
}

// Object for handling cookies, taken from QuirksMode
// http://www.quirksmode.org/js/cookies.html
var cookieManager = {
  // Create a cookie
  create(name, value, days) {
    var expires = "";

    if(days) {
      var date = new Date();
      date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
      expires = "; expires=" + date.toGMTString();
    }

    document.cookie = name + "=" + value + expires + "; path=/";
  },

  // Get the value of a cookie
  get(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(";");

    for(var i = 0; i < ca.length; i++) {
      var c = ca[i];
      while (c.charAt(0) === " ") c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }

    return null;
  },

  // Delete a cookie
  erase(name) {
    this.create(name, "", -1);
  }
};

//This is a stripped down version of bioEp module, essentially removing the modal functionality:
class ExitIntent{
  constructor(opts){
    this.shown = false;

    //Default value:
    this.cookie = 'exitIntent_shown';
    this.cookie_override = 'crometrics-debug'; //query param used for debugging
    this.delay = 5;
    this.showOnDelay = false;
    this.cookieExp = 0;

    // Handle options
    if(typeof opts !== 'undefined')
      this.setOptions(opts);

    // Once the DOM has fully loaded
    this.domReady(()=>{
      // Handle the cookie
      if(this.checkCookie() ){
        return;
      }

      this.loadEvents();

      // Load events
      if(this.showOnDelay){
        setTimeout(()=>{
            this.triggerIntent();
        }, this.delay * 1000);
      }
    });
  }

  // Handle the exitIntent_shown cookie
  // If present and true, return true
  // If not present or false, create and return false
  checkCookie() {
    // Handle cookie reset
    if(this.cookieExp <= 0) {
      cookieManager.erase(this.cookie);
      return false;
    }

    if (window.location.search.indexOf(this.cookie_override) > -1)
      return false;

    // If cookie is set to true
    if(cookieManager.get(this.cookie) === "true")
      return true;

    return false;
  }

  triggerIntent() {
    if(this.shown) return;

    this.shown = true;

    cookieManager.create(this.cookie, "true", this.cookieExp);
    this.callback();
  }

  // Event listener initialisation for all browsers
  addEvent(obj, event, callback) {
    if(obj.addEventListener)
      obj.addEventListener(event, callback, false);
    else if(obj.attachEvent)
      obj.attachEvent("on" + event, callback);
  }

  // Load event listeners for the popup
  loadEvents() {
    // Track mouseout event on document
    this.addEvent(document, "mouseout", (e)=>{
      e = e ? e : window.event;

      // make sure they actually moved outside the window (i.e. not mousing over autocomplete)
      if(e.clientY <= 5) {
        this.triggerIntent();
      }
      else if(detectIE() && e.clientY <= 50) {
        this.triggerIntent();
      }   
    });

  }

  // Set user defined options for the popup
  setOptions(opts) {
    for (var o in opts){
      this[o] = (typeof opts[o] === 'undefined') ? this[o] : opts[o];
    }
    // this.delay = (typeof opts.delay === 'undefined') ? this.delay : opts.delay;
    // this.showOnDelay = (typeof opts.showOnDelay === 'undefined') ? this.showOnDelay : opts.showOnDelay;
    // this.cookieExp = (typeof opts.cookieExp === 'undefined') ? this.cookieExp : opts.cookieExp;
    // this.cookie = (typeof opts.cookie === 'undefined') ? this.cookie : opts.cookie;
    // this.callback = (typeof opts.callback === 'undefined') ? this.callback : opts.callback;
  }

  // Ensure the DOM has loaded
  domReady(callback) {
    (document.readyState === "interactive" || document.readyState === "complete") ? callback() : this.addEvent(document, "DOMContentLoaded", callback); // jshint ignore:line
  }
};
