# Exit Intent

# Description
exitIntent class based on bioEp: http://beeker.io/exit-intent-popup-script-tutorial
 * Purpose:
 *  Open something (like a modal) after the user moves their mouse out of the window (to exit the page).
 *  The code can create a cookie preventing the modal from re-opening multiple times.
 *
 * Options: http://beeker.io/exit-intent-popup-script-tutorial#bio_ep_options

**Usage**
```
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



