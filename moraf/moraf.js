(function () {
  'use strict';

  const getMoraf = ($)=>{
    // Debug info to console (requires `Moraf.debug = true`)
    let _debug = false, _mutationCount = 0, _rafCount = 0;
    const debug = (...args) => {
      if(_debug) console.info('[Moraf]',...args);
    };

    // Automated but optional jQuery integration
    const isJQ = (obj) => {
      if(obj && obj.fn && obj.fn.jquery) {
        debug('isJQ: jQuery library found.');
        return obj;
      }
      else {
        debug('isJQ: Not a valid jQuery library.');
        return false;
      }
    };

    // Attempt to grab jQuery from the most obvious places.
    let _jQ = isJQ($) || isJQ(jQuery) || isJQ(window.$) || isJQ(window.jQuery);


    // Should match any currently existing jQuery extended selector http://api.jquery.com/category/selectors/jquery-selector-extensions/
    const jQSelector = /(:(animated|button|checkbox|eq|even|file|first|gt|has|header|hidden|image|input|last|lt|odd|parent|password|radio|reset|selected|submit|text|visible)|\[[^\]]+!=[^\]]+\])/gi;

    // Gets elements by selector. Uses native function for pure CSS selectors and jQuery if a jQ extended selector is detected.
    const getElementsFromSelector = (selector) => {
      var elements;
      if(jQSelector.test(selector)) {
        debug('jQuery selector detected in:',selector);
        elements = _jQ(selector).get();
      } else {
        debug('Standard CSS selectors only in:',selector);
        elements = document.querySelectorAll(selector);
      }
      return elements;
    };

    /**
     *  Shims
     */
    // requestAnimationFrame
    const _requestAnimationFrame = window.requestAnimationFrame ||
          window.webkitRequestAnimationFrame ||
          window.mozRequestAnimationFrame ||
          function (callback) {
            debug('RAF: Browser does not support requestAnimationFrame.');
            window.setTimeout(callback, 1000 / 60);
          };

    // MutationObserver
    const WMutationObserver = window.MutationObserver ||
          window.WebKitMutationObserver ||
          window.MozMutationObserver ||
          false;

    // MutationObserver/fallback wrapper. Creates a MutationObserver if available, uses setInterval as a fallback.
    class Observer  {
      constructor(callback) {
        this.observer = WMutationObserver ? new WMutationObserver(callback) : null;
        if(!this.observer) debug('MO: Browser does not support MutationObserver');
        this.callback = callback;
      }

      //
      observe(element, init) {
        this.element = element;
        if (WMutationObserver) {
          this.observer.observe(element, init);
        } else {
          this.observer = setInterval(this.callback, 50);
        }
      }

      // MutationObserver.disconnect() polyfill
      disconnect() {
        if (this.observer) {
          if (WMutationObserver) {
            this.observer.disconnect();
          } else {
            clearInterval(this.observer);
          }
        }
      }
    }

    /**
     *  Moraf classes and helpers
     */
    const CREATE = 'create',
          CHANGE = 'change',
          TEXT = 'text';

    // Store all managers and Morafs in arrays to be iterated over.
    let allManagers = [], allMorafs = [];

    // This class allows multiple morafs to use the same observer if they are watching the same element and have the same type.
    class MorafManager {
      constructor(element, moraf) {
        let { type, init } = moraf, self = this;
        this.element = element;
        this.type = type;
        this.init = init;
        this.active = false;
        this.morafs = [moraf];

        // For create morafs, make sure matching elements don't already exist.
        if(moraf.type === CREATE) moraf.onMutate();
        if(moraf.active) {
          this.observer = new Observer((mutations) => { self.onMutate(mutations); });
          this.observe(element, init);
          this.active = true;
        } else debug('Observer: Matching element(s) already exist and the moraf is satisfied. No need to observe further.');

        allManagers.push(this);

        debug('Observer: Created a new Observer\nWatching:',element,'\nFor:',init,'\nOn behalf of:',moraf);
      }

      add(moraf) {
        let { element, init } = this, self = this;

        // For create morafs, make sure matching elements don't already exist.
        if(moraf.type === CREATE) moraf.onMutate();
        this.morafs.push(moraf);

        // Will return false if this was a Create Moraf and a matching element was immediately found.
        if(moraf.active) {
          this.observer = this.observer || new Observer(mutations => { self.onMutate(mutations); });
          this.observe();
          this.active = true;
          debug('Observer: Recycled an Observer\nWatching:',element,'\nFor:',init,'\nOn behalf of:',moraf);
        } else debug('Observer: Matching element(s) already exist and the moraf is satisfied.\nThis observer is ' + this.active ? ' still active because other morafs are still running.' : ' now inactive.');
      }

      disconnect() {
        this.observer.disconnect();
      }

      observe() {
        this.observer.observe(this.element, this.init);
      }

      // MutationObserver callback
      onMutate(mutations) {
        _mutationCount++;
        for(let i = 0; i < allManagers.length; i++) {
          let manager = allManagers[i];
          if(manager.active) {
            manager.active = false;
            manager.disconnect();
          }
        }
        if(mutations) debug('MorafManager: Mutation(s) detected:',mutations,'\nRequesting animation frame...');
        else debug('MorafManager: Using setInterval fallback...');
        _requestAnimationFrame(() => {
          _rafCount++;
          debug(...Moraf.stats());

          // Check all morafs and managers to minimize total calls.
          for(let i = 0; i < allMorafs.length; i++) {
            let moraf = allMorafs[i];
            if(moraf.active) {
              moraf.onMutate();
              if(moraf.active) moraf.manager.active = true;
            }
          }
          for(let i = 0; i < allManagers.length; i++) {
            let manager = allManagers[i];
            if(manager.active) manager.observe();
            else debug('MorafManager: No more active Morafs on this manager. No longer observing.');
          }
        });
      }
    }

    /**
     *  @callback morafCallback
     *  @param {*} $els - The new matching element(s) for a Create Moraf. Otherwise, the watched element.
     *  Will be a jQuery object if jQuery is available.
     *  @param {Moraf} moraf - The Moraf instance this callback is tied to.
     */


    /* jshint -W003 */
    /** Moraf class. */
    class Moraf {
    /* jshint +W003 */
      /**
       *  @desc Moraf() Create a new Moraf from scratch. Using one of the factory methods is recommended.
       *
       *  @param {Object} data - All of the Moraf's initialization data.
       *  @param {string} data.type - "create", "change", and "text" are allowed. This determines what the Observer will be watching for.
       *  @param {*} data.element - HTML element/node that will be observed.
       *  @param {morafCallback} data.callback - The callback to be executed when a qualifying mutation is observed.
       *  @param {boolean} [data.multi=true] - Whether the Observer should keep watching for this moraf after the first time the callback runs.
       *  @param {?string} data.selector - For "create" Morafs, the selector of the child element(s) we are watching for.
       *  @param {?Array.<string>} data.attributes - For "change" Morafs, the names of the attributes we will be watching. If null, we will watch all of them.
       *  @param {?string|RegExp|Array.<string|RegExp>} data.conditions - For "change" Morafs, an array of strings or RegExps to be matches against the watched attributes.
          These conditions will be matched by index, so `attributes[index]` will be tested against `conditions[index]`.
          For "text" Morafs, this is simply a single string or RegExp to be matches against the element's new text content.
       */
      constructor(data) {
        let keys = Object.keys(data);
        for(let i = 0; i < keys.length; i++) {
          let key = keys[i];
          this[key] = data[key];
        }
        let { element, type } = this;
        if(_jQ) this.$element = _jQ(element);
        switch(type) {
          case CREATE:
            this.init =  {
              childList: true,
              subtree: true
            };
            this.processed = [];
            break;

          case CHANGE:
            this.init = {
              attributes: true
            };
            this.attributeMap = this.getAttributeMap();
            debug('Moraf: Initial attributes:',this.attributeMap);
            break;

          case TEXT:
            this.init = {
              childList: true,
              characterData: true,
              subtree: true
            };
            break;
        }
        this.active = true;

        allMorafs.push(this);
        this.getManager();
        debug('Moraf: New moraf created:',this);
      }

      getManager() {
        let element = this.element;
        for(let i = 0; i < allManagers.length; i++) {
          let manager = allManagers[i];
          if(element === manager.element) {
            manager.add(this);
            this.manager = manager;
            return;
          }
        }
        this.manager = new MorafManager(element, this);
      }

      // When a qualifying mutation occurs
      onMutate() {
        let { type, $element, selector, processed, element, callback, conditions, text, attributeMap, multi, attributes } = this;
        switch(type) {

          // Create observers
          case CREATE:
            let created;
            if($element) {
              created = $element.find(selector).not(processed).get();
            } else {
              var processedSet = new Set(processed);
              var elements = element.querySelectorAll(selector);
              var createdArray = Array.prototype.slice.call(elements);
              created = createdArray.filter(x => !processedSet.has(x));
            }
            if(created.length) {
              debug('Moraf - Create: Valid new element(s) created:',created,'\nRunning callback for:',this);
              this.processed = processed.concat(created);
              debug('processed:',this.processed);
              if(!multi) this.active = false;
              let $created = _jQ ? _jQ(created) : false;
              callback.apply(created, [$created || created, this]);
            } else debug('Moraf - Create: No matches found.\nNot running the callback for:',this);
            break;

          // Change observers
          case CHANGE:
            let newAttributes = this.getAttributeMap();

            //debug('attributes:',attributes);

            for(let index = 0; index < attributes.length; index++) {
              let name = attributes[index];
              let oldValue = attributeMap[name], newValue = newAttributes[name];
              //debug('Change data:',index,name,oldValue,newValue);
              if(oldValue !== newValue) {
                if(conditions[index]) {
                  if(newValue.indexOf(conditions[index]) > -1) {
                    debug('Moraf - Change: Attribute change(s) match conditions. Running callback...');
                    if(!multi) this.active = false;
                    callback.apply(element,[$element || element, this]);
                    break;
                  }
                } else {
                  debug('Moraf - Change: Attribute change detected. Running callback...');
                  if(!multi) this.active = false;
                  callback.apply(element,[$element || element, this]);
                  break;
                }
              }
            }

            this.attributeMap = newAttributes;

            break;

          // Text observers
          case TEXT:
            let newText = element.textContent;
            if(newText !== text) {
              if(!conditions || newText.indexOf(conditions) > -1) {
                debug('Moraf - Text: Text change ' + (conditions ? 'matches conditions.' : 'detected.') + ' Running callback...');
                if(!multi) this.active = false;
                callback.apply(element,[element, this]);
              }
            }
            this.text = newText;
            break;
        }
      }

      // Method for creating a map of attributes and values from this moraf's element.
      getAttributeMap() {
        let map = {}, { element, attributes } = this, elemAttrs = element.attributes;
        if (elemAttrs) {
          if(!attributes) attributes = elemAttrs;
          for(let i = 0; i < attributes.length; i++) {
            let name = attributes[i];
            // Exception for href attributes on a link. Grab the element's href property, not the href "attribute" that will be an object reference.
            if(name === 'href' && typeof(attributes.href) !== 'string' && element.href) map[name] = element.href;
            else map[name] = elemAttrs[name];
          }
        }

        return map;
      }

      /**
       *  Gets the corrent jQuery library Moraf is using or specifies a new one.
       */
      static get jQuery() { return _jQ; }
      static set jQuery(obj) {
        if(isJQ(obj)) _jQ = obj;
        debug('jQuery library changed.');
      }

      /*
       *  Factory methods for creating new Morafs by type.
       */

      /**
       *  @desc Moraf.create() Initializes a new "create" Moraf.
       *  @param {string} selector - CSS/jQuery selector of the new element(s) we are watching for.
       *  @param {*} [element=document] - Existing parent/ancestor element of the element(s) we are watching for.
       *  @param {morafCallback} callback - The callback to run when matching new elements are created.
       *  @param {boolean} [multi=true] Whether we should continue observing after the first qualifying element(s) are created.
       *
       *  @return {Moraf} - The created Moraf.
       */
      static create(selector, ...args) {
        var element, callback, multi = true;

        if(typeof(args[0]) === 'function') {
          element = document;
          callback = args[0];
          if(args[1] === false) multi = false;
        } else if(typeof(args[0]) === 'string') { // Element is a selector
          element = getElementsFromSelector(args[0])[0];
        } else if(args[0].nodeType > 0) { // Element is an HTML element
          element = args[0];
          callback = args[1];
          if(args[2] === false) multi = false;
        } else if(args[0][0].nodeType > 0) { // Element is a jQuery object
          element = args[0][0];
          callback = args[1];
          if(args[2] === false) multi = false;
        }

        var moraf = new Moraf({
          type: CREATE,
          callback,
          selector,
          element,
          multi
        });

        return moraf;
      }

      /**
       *  @desc Moraf.change() Initializes a new "change" Moraf.
       *  @param {*} element - Selector, HTML element, or jQuery object (only the first element in the set will be used) to be watched.
       *  @param {?string|Array.<string>} attributes - Attribute(s) to watch, as an array or space separated list. If omitted, all attributes will be watched.
       *  @param {?string|RegExp|Array.<string|RegExp>} A string or RegExp that will be matches against the attribute value, if an attribute is passed.
          In case of multiple attributes, this must be an array of conditions that will be mapped in order to each attribute passed.
       *  @param {morafCallback} callback - The callback to run when the element's attributes change.
       *  @param {boolean} [multi=true] Whether we should continue observing after the first qualifying element(s) are created.
       *
       *  @return {Moraf} - The created Moraf.
       */
      static change(el, ...args) {
        var element, attributes, conditions, callback, multi = true;
        if(typeof(el) === 'string') { // Element is a selector
          element = getElementsFromSelector(el)[0];
        } else if(el[0] && el[0].nodeType > 0) { // Element is a jQuery object
          element = el[0];
        } else element = el; // Element is a node

        // Properties passed.
        if(typeof(args[0]) === 'string' || Array.isArray(args[0])) {
          attributes = Array.isArray(args[0]) ? args[0] : args[0].split(' ');

          // Conditions not passed
          if(typeof(args[1]) === 'function') {
            conditions = '';
            callback = args[1];
            if(args[2] === false) multi = false;
          }
          // Conditions passed
          else {
            // Single condition
            if(typeof(args[1]) === 'string' || args[1] instanceof RegExp) {
              conditions = [args[1]];
            // Array of conditions
            } else if(Array.isArray(args[1])) {
              conditions = args[1];
            }
            callback = args[2];
            if(args[3] === false) multi = false;
          }
        } else {
          attributes = [];
          conditions = [];
          callback = args[0];
          if(args[1] === false) multi = false;
        }

        var moraf = new Moraf({
          type: CHANGE,
          element,
          attributes,
          conditions,
          callback,
          multi
        });

        return moraf;
      }

      /**
       *  @desc Moraf.change() Initializes a new "text" Moraf.
       *  @param {*} element - Selector, HTML element, or jQuery object (only the first element in the set will be used) to be watched.
       *  @param {?string|RegExp} A string or RegExp that will be matches against the element's new text content.
       *  @param {morafCallback} callback - The callback to run when the element's text changes.
       *  @param {boolean} [multi=true] Whether we should continue observing after the first qualifying element(s) are created.
       *
       *  @return {Moraf} - The created Moraf.
       */
      static text(el, ...args) {
        let element, conditions, callback, multi = true;
        if(typeof(el) === 'string') { // Element is a selector
          element = getElementsFromSelector(el)[0];
        } else if(el[0] && el[0].nodeType > 0) { // Element is a jQuery object
          element = el[0];
        } else element = el; // Element is a node

        // Properties passed
        if(typeof(args[0]) === 'string') {
          conditions = args[0];
          callback = args[1];
          if(args[2] === false) multi = false;
        } else {
          callback = args[0];
          conditions = '';
          if(args[1] === false) multi = false;
        }

        let text = element.textContent;

        var moraf = new Moraf({
          type: TEXT,
          element,
          conditions,
          callback,
          text
        });

        return moraf;
      }

      /** @type {boolean} - Turns debugging messages on or off. */
      static set debug(bool) {
        _debug = bool;
        console.info('[Moraf] Debugging is now ' + bool ? 'on.' : 'off.');
      }

      /** @type {number} - The total number of mutations or sets of mutations observed by all Moraf observers. */
      static get mutationCount() { return _mutationCount; }

      /** @type {number} - The total number of animation frames requested by all Moraf observers.
      Unless shims are being used or somethign is wrong, this should be the same as mutationCount. */
      static get rafCount() { return _rafCount; }

      /** @type {Array.} - A stat message reporting total number of mutations tracked and animation frames requested,
      for easy insertion into the console without needing to turn debugging on. */
      static stats() {
        return ['Total mutations tracked:',_mutationCount,'Total frames requested:',_rafCount];
      }
    }

    return Moraf;
  };

  /**
   * Extend the window object with method
   */
  const extend = () => {
    let $ = jQuery
    window.Moraf = getMoraf($);
  };

  
    extend();

})();
