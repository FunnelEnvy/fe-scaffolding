
# :gem: onUrlChange

```js
onUrlChange(callback)
```

This function allows you to execute a callback function whenever the URL changes in a single page application (SPA). It uses a MutationObserver to observe changes to the document body and detect URL changes.

## :gear: Parameters

* ```callback``` (required): The callback function to execute when the URL changes. This function should accept two parameters: oldHref and mutation. oldHref is a string that contains the URL before it changed. mutation is an object that describes the change that triggered the callback.

### :red_circle: Errors

* It should throw an error if callback is not a function and if any error is caused by the callback itself.

### :scroll: Usage

```js
onUrlChange((oldHref, mutation) => {
  console.log(`URL changed from ${oldHref} to ${window.location.href}`);
  console.log(mutation);
});
```