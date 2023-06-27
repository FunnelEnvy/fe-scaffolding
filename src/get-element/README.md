
# :hammer_and_wrench: How tos

## :gem: getElement

```js
getElement(cssSelector, outTimer = 10000)
```

This function returns a Promise that resolves with an object containing all elements that match a given CSS selector. If no elements are found, it will wait for mutations on the document body and retry until elements matching the selector are found or a timeout is reached.

### :gear: Parameters

* ```cssSelector``` (required): A string that specifies the CSS selector for the desired elements.
* ```outTimer``` (optional): An integer that specifies the maximum number of milliseconds to wait for the desired elements to appear. If the elements are not found within this time, the function will reject with an error. The default value is 10000 (10 seconds).

### :handshake: Return Value

This function returns a Promise that resolves with an object containing the CSS selector and the matching elements. The object has the following properties:

* ```selector```: A string that specifies the CSS selector used to find the elements.
* ```elements```: An array of DOM elements that match the CSS selector.

If the desired elements are not found within the specified time, the function will reject with an error.

### :scroll: Usage

```js
import { getElement } from 'pageutilities';

// Find all elements with class 'my-class'
getElement('.my-class')
  .then((result) => {
    console.log(`Found ${result.elements.length} elements with selector '${result.selector}'`);
    // Do something with the found elements
  })
  .catch((error) => {
    console.error(error);
  });
```

### Notes

* This function uses ```querySelectorAll``` to find the desired elements, so the CSS selector must conform to the rules for this function.
* The ```MutationObserver``` is used to detect changes to the DOM and update the element selection accordingly. This allows the function to be resilient to changes in the DOM structure.
* If the ```outTimer``` parameter is not provided, the default value of 10000 milliseconds (10 seconds) will be used.
* If the desired elements are not found within the specified time, the function will reject with an error.
