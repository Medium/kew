var Q = require('../kew')

// test adding and removing contexts
exports.testGeneralContextFlow = function (test) {
	Q.resolve(true)
		// test no context exists
	  .then(function (val, context) {
	  	test.equal(typeof context, 'undefined', 'Context should be undefined')
	  	throw new Error()
	  })
	  .fail(function (e, context) {
	  	test.equal(typeof context, 'undefined', 'Context should be undefined')
	  })

	  // set the context and mutate it
	  .setContext({counter: 1})
	  .then(function (val, context) {
	  	test.equal(context.counter, 1, 'Counter should be 1')
	  	context.counter++
	  })
	  .then(function (val, context) {
	  	test.equal(context.counter, 2, 'Counter should be 2')
	  	context.counter++
	  	throw new Error()
	  })
	  .fail(function (e, context) {
	  	test.equal(context.counter, 3, 'Counter should be 3')
	  })

	  // return a context
	  .then(function (val, context) {
	  	return Q.resolve(false)
	  	  .setContext({counter: 0})
	  })
	  .then(function (val, context) {
	  	test.equal(context.counter, 0, 'Counter should be 0')
	  	throw new Error()
	  })
	  .fail(function (e, context) {
	  	test.equal(context.counter, 0, 'Counter should be 0')
	  })

	  // returning a promise with a cleared context won't clear the parent context
	  .then(function (val, context) {
	  	return Q.resolve(false).clearContext()
	  })
	  .then(function (val, context) {
	  	test.equal(context.counter, 0, 'Counter should be 0')
	  	throw new Error()
	  })
	  .fail(function (e, context) {
	  	test.equal(context.counter, 0, 'Counter should be 0')
	  })

	  // test that clearing the context works
	  .clearContext()
	  .then(function (val, context) {
	  	test.equal(typeof context, 'undefined', 'Context should be undefined')
	  	throw new Error()
	  })
	  .fail(function (e, context) {
	  	test.equal(typeof context, 'undefined', 'Context should be undefined')
	  })

	  .fin(test.done)
}