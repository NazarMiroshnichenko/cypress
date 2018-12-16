/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const $jquery = require("./jquery");
const $window = require("./window");
const $document = require("./document");
const $elements = require("./elements");
const $visibility = require("./visibility");
const $coordinates = require("./coordinates");

const { isWindow, getWindowByElement } = $window;
const { isDocument } = $document;
const { wrap, unwrap, isJquery, query } = $jquery;
const { isVisible, isHidden, getReasonIsHidden } = $visibility;
const { isType, isFocusable, isElement, isScrollable, stringify, getElements, getContainsSelector, getFirstDeepestElement, isDetached, isAttached, isTextLike, isSelector, isDescendent,  getFirstFixedOrStickyPositionParent, getFirstStickyPositionParent,  getFirstScrollableParent } = $elements;
const { getCoordsByPosition, getElementPositioning, getElementCoordinatesByPosition, getElementAtPointFromViewport, getElementCoordinatesByPositionRelativeToXY } = $coordinates;

const isDom = obj => isElement(obj) || isWindow(obj) || isDocument(obj);

//# we are exposing these publicly to be used
//# by our own internal code, but also for
//# our users. They can use them for debugging
//# purposes or for overriding. Everything else
//# can be tucked away behind these interfaces.
module.exports = {
  wrap,

  query,

  unwrap,

  isDom,

  isType,

  isVisible,

  isHidden,

  isFocusable,

  isTextLike,

  isScrollable,

  isDetached,

  isAttached,

  isSelector,

  isDescendent,

  isElement,

  isDocument,

  isWindow,

  isJquery,

  stringify,

  getElements,

  getContainsSelector,

  getFirstDeepestElement,

  getWindowByElement,

  getReasonIsHidden,

  getFirstScrollableParent,

  getFirstFixedOrStickyPositionParent,

  getFirstStickyPositionParent,

  getCoordsByPosition,

  getElementPositioning,

  getElementAtPointFromViewport,

  getElementCoordinatesByPosition,

  getElementCoordinatesByPositionRelativeToXY

};
