/* eslint-disable
    @cypress/dev/skip-comment,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const e2e = require('../support/helpers/e2e').default

describe('e2e window.open', () => {
  e2e.setup()

  // skipping this for now due to
  // snap-shot-it monkey patching
  // causing test failures
  return it.skip('passes', function () {
    return e2e.exec(this, {
      spec: 'window_open_spec.coffee',
      snapshot: true,
    })
  })
})
