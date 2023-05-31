# MORAF(Mutation Observer/Request Animation Frame)

# Description
Use this function in lieue of polling when dealing with dynamic elements (SPA related or loading after DOM ready).

**Simple Example**
```
window.Moraf.create('selector to target', function($el) {

$el.text('updated text headline')

}
```
