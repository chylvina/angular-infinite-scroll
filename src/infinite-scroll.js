angular.module('chylvina.infinite-scroll', [])
    .directive('infiniteScroll', function ($rootScope, $document, $window, $timeout, $animate) {
        return {
            restrict: 'A',
            scope: {
                infiniteScrollNext: "&",
                infiniteScrollNum: "@",
                infiniteScrollMax: "@",
                infiniteScrollData: "=",
                infiniteScrollDistance: "@",
                infiniteScrollSource: "=",
                infiniteScrollLoading: "=",
                infiniteScrollGotop: "=",
                infiniteScrollTop: "=",
                infiniteScrollTarget: "@",
                infiniteScrollRail: "@",
                infiniteScrollBar: "@",
                infiniteScrollBarMinLength: "@",
                infiniteScrollWheelSpeed: "@"
            },
            link: function (scope, elem, attrs) {
                //////////////////////////////
                // infinite scroll
                //////////////////////////////
                var startIndex = 0
                    , endIndex = 0
                    , scrollDistance = (scope.infiniteScrollDistance && parseInt(scope.infiniteScrollDistance, 10)) || 100
                    , delayHandlerTimeout
                    , scroller = elem.find(scope.infiniteScrollTarget);

                var getContentHeight = function() {
                    return scope.infiniteScrollSource.getLength() * scrollDistance + 12;      // todo: ignored other elements
                };

                var getContainerHeight = function() {
                    return elem.height();
                };

                var animationTimeout = null;
                var enableAnimation = function() {      // todo: this ius a compromise solution
                    if(animationTimeout) {
                        $window.clearTimeout(animationTimeout);
                        animationTimeout = null;
                    }
                    else {
                        $animate.enabled(true, scroller);
                    }

                    animationTimeout = $window.setTimeout(function() {
                        $animate.enabled(false, scroller);
                        $window.clearTimeout(animationTimeout);
                        animationTimeout = null;
                    }, 1000);
                };

                // scroll bar
                var $container = elem,
                    $scrollbarYRail,
                    $scrollbarY,
                    scrollbarYActive,
                    scrollbarMinLength = (scope.infiniteScrollBarMinLength && parseInt(scope.infiniteScrollBarMinLength, 10)) || 40,
                    containerHeight = 0,
                    contentHeight = getContentHeight(),
                    scrollbarYHeight,
                    scrollbarYTop,
                    wheelSpeed = (scope.infiniteScrollWheelSpeed && parseInt(scope.infiniteScrollWheelSpeed, 10)) || scrollDistance;

                $animate.enabled(false, scroller);

                if(scroller.length == 0) {
                    throw new Error("scroller not found.");
                }

                scope.infiniteScrollSource.on('change', function() {
                    scope.infiniteScrollLoading = false;

                    contentHeight = getContentHeight();
                    containerHeight = getContainerHeight();

                    setScrollTop(0);
                });

                scope.infiniteScrollSource.on('retrieve', function() {
                    scope.infiniteScrollLoading = false;

                    contentHeight = getContentHeight();
                    containerHeight = getContainerHeight();

                    updateBarSizeAndPosition();


                    delayHandler();
                });

                scope.infiniteScrollSource.on('update', function(offsetLength) {
                    scope.infiniteScrollLoading = false;

                    contentHeight = getContentHeight();
                    containerHeight = getContainerHeight();

                    setScrollTop(getScrollTop() + offsetLength * scrollDistance);
                });

                scope.infiniteScrollSource.on('delete', function() {
                    scope.infiniteScrollLoading = false;

                    contentHeight = getContentHeight();
                    containerHeight = getContainerHeight();

                    enableAnimation();

                    //setScrollTop(getScrollTop() + offsetLength * scrollDistance);
                    //delayHandler();
                    render(startIndex, endIndex, elem.scrollTop(), true);
                });

                if(scope.infiniteScrollGotop) {
                    scope.$watch('infiniteScrollGotop', function (newValue, oldValue) {
                        if (newValue === oldValue)   return;

                        if (newValue) {
                            var d = Math.round(getScrollTop() / 5); // todo: improve algorithem
                            var repeat = function() {
                                var top = getScrollTop();
                                if(top > 0) {
                                    setScrollTop(top - d);
                                    $timeout(repeat, 50);
                                }
                                else {
                                    scope.infiniteScrollGotop = 0;
                                }
                            };
                            repeat();
                        }
                    }, true);
                }


                angular.element($window).bind('resize.infinite-scroll', function(e) {
                    containerHeight = elem.height();
                    updateBarSizeAndPosition();
                    delayHandler();
                });

                var setScrollTop = function(value) {
                    if(value < 0) {
                        value = 0;
                    }

                    if(value > contentHeight - containerHeight) {
                        value = contentHeight - containerHeight;
                    }

                    if(scope.infiniteScrollTop) {
                        scope.infiniteScrollTop = value;
                    }

                    var n = value / scrollDistance;
                    var s = (n >= 2) ? (Math.floor(n) - 1) : 0; // new start index
                    var t = value - s * scrollDistance;         // scroller top
                    var e = s + Math.floor((t + containerHeight) / scrollDistance) + 2; // new end index

                    // render
                    render(s, e, t);
                };

                var getScrollTop = function() {
                    return startIndex * scrollDistance + elem.scrollTop();
                };

                var loadData = function() {
                    if(scope.infiniteScrollLoading) return;

                    scope.infiniteScrollLoading = true;

                    scope.infiniteScrollNext();
                };

                var render = function(newStartIndex, newEndIndex, scrollTop, force) {
                    //console.log('pre render', newStartIndex, newEndIndex, startIndex, endIndex);
                    if(force || startIndex != newStartIndex || endIndex != newEndIndex) {
                        startIndex = Math.max(0, newStartIndex);
                        endIndex = Math.min(scope.infiniteScrollSource.getLength() - 1, newEndIndex);

                        scope.infiniteScrollData = scope.infiniteScrollSource.getRangeArr(startIndex, endIndex + 1);

                        //console.log('render', startIndex, endIndex);
                    }

                    elem.scrollTop(scrollTop);

                    updateBarSizeAndPosition();

                    delayHandler();
                };

                var delayHandler = function() {
                    if(delayHandlerTimeout) return;

                    delayHandlerTimeout = $timeout(function() {
                        delayHandlerTimeout = null;
                        handler();
                    }, 100);

                    // another solution
                    /*var repeat = function() {
                     //console.log('repeat');
                     if(!$rootScope.$$phase) {
                     //console.log('do');
                     inHandler = false;
                     handler();
                     }
                     else {
                     $timeout(repeat, 100);
                     }
                     };
                     repeat();*/
                };

                var handler = function () {
                    var scrollerTop = elem.offset().top - scroller.offset().top // elem.scrollTop()
                        , scrollerBottom = scroller.height() - scrollerTop - containerHeight;

                    var internalRender = function(startIndexOffset, endIndexOffset) {
                        var scrollTop = scrollerTop;
                        if(startIndexOffset == -1) {
                            scrollTop += scrollDistance;
                        }
                        else if(startIndexOffset == 1) {
                            scrollTop -= scrollDistance;
                        }

                        render(startIndex + startIndexOffset, endIndex + endIndexOffset, scrollTop);
                    };

                    console.log('----------------------');
                    console.log('scrollerTop', scrollerTop);
                    console.log('scrollerBottom', scrollerBottom);
                    console.log('----------------------');

                    if(scrollerBottom < scrollDistance) {
                        if(endIndex < scope.infiniteScrollSource.getLength() -1) {
                            internalRender(0, 1);
                        }
                        else {
                            loadData();
                        }
                    }
                    else if(scrollerBottom >= scrollDistance * 2) {
                        if(endIndex >0) {
                            internalRender(0, -1);
                        }
                    }

                    if(scrollerTop < scrollDistance) {
                        if(startIndex > 0) {
                            internalRender(-1, 0);
                        }
                    }
                    else if(scrollerTop >= scrollDistance * 2) {
                        internalRender(1, 0);
                    }
                };


                //////////////////////////////
                // scroll bar
                //////////////////////////////

                var updateContentScrollTop = function () {
                    var scrollTop = parseInt(scrollbarYTop * (contentHeight - containerHeight) / (containerHeight - scrollbarYHeight), 10);
                    setScrollTop(scrollTop);
                };

                var getSettingsAdjustedThumbSize = function (thumbSize) {
                    if (scrollbarMinLength > 0) {
                        thumbSize = Math.max(thumbSize, scrollbarMinLength);
                    }
                    return thumbSize;
                };

                var updateBarSizeAndPosition = function () {        // todo: watch and update
                    //containerHeight = $container.height();
                    //contentHeight = getContentHeight();

                    if (containerHeight < contentHeight) {
                        scrollbarYActive = true;
                        scrollbarYHeight = getSettingsAdjustedThumbSize(parseInt(containerHeight * containerHeight / contentHeight, 10));
                        scrollbarYTop = parseInt(getScrollTop() * (containerHeight - scrollbarYHeight) / (contentHeight - containerHeight), 10);
                    }
                    else {
                        scrollbarYActive = false;
                        scrollbarYHeight = 0;
                        scrollbarYTop = 0;
                        if(getScrollTop() != 0) {   // to avoid circle loop
                            setScrollTop(0);
                        }
                    }

                    if (scrollbarYTop >= containerHeight - scrollbarYHeight) {
                        scrollbarYTop = containerHeight - scrollbarYHeight;
                    }

                    $scrollbarY.css({top: scrollbarYTop, height: scrollbarYHeight});
                };

                var moveBarY = function (currentTop, deltaY) {
                    var newTop = currentTop + deltaY,
                        maxTop = containerHeight - scrollbarYHeight;

                    if (newTop < 0) {
                        scrollbarYTop = 0;
                    }
                    else if (newTop > maxTop) {
                        scrollbarYTop = maxTop;
                    }
                    else {
                        scrollbarYTop = newTop;
                    }

                    $scrollbarY.css({top: scrollbarYTop});
                };

                var bindMouseScrollYHandler = function () { // todo:
                    var currentTop,
                        currentPageY;

                    $scrollbarY.bind('mousedown.infinite-scroll', function (e) {
                        // start improve scroll performance
                        // $animate.enabled(false, scroller);

                        currentPageY = e.pageY;
                        currentTop = $scrollbarY.position().top;
                        e.stopPropagation();
                        e.preventDefault();

                        $document.bind('mousemove.infinite-scroll', function (e) {
                            updateContentScrollTop();
                            moveBarY(currentTop, e.pageY - currentPageY);
                            e.stopPropagation();
                            e.preventDefault();
                        });

                        $document.bind('mouseup.infinite-scroll', function (e) {
                            // end improve scroll performance
                            // $animate.enabled(true, scroller);

                            $document.unbind('mouseup.infinite-scroll');
                            $document.unbind('mousemove.infinite-scroll');
                        });
                    });

                    currentTop =
                        currentPageY = null;
                };

                var bindMouseWheelHandler = function () {
                    $container.bind('mousewheel.infinite-scroll', function (e, delta, deltaX, deltaY) {
                        setScrollTop(getScrollTop() - deltaY * wheelSpeed);
                    });
                };

                var bindRailClickHandler = function () {
                    var stopPropagation = function (e) {
                        e.stopPropagation();
                    };

                    $scrollbarY.bind('click.infinite-scroll', stopPropagation);
                    $scrollbarYRail.bind('click.infinite-scroll', function (e) {
                        var halfOfScrollbarLength = parseInt(scrollbarYHeight / 2, 10),
                            positionTop = e.pageY - $scrollbarYRail.offset().top - halfOfScrollbarLength,
                            maxPositionTop = containerHeight - scrollbarYHeight,
                            positionRatio = positionTop / maxPositionTop;

                        if (positionRatio < 0) {
                            positionRatio = 0;
                        } else if (positionRatio > 1) {
                            positionRatio = 1;
                        }

                        setScrollTop((contentHeight - containerHeight) * positionRatio);
                    });
                };

                var bindMobileTouchHandler = function () {
                    var applyTouchMove = function (differenceX, differenceY) {
                        setScrollTop(getScrollTop() - differenceY);
                        //$container.scrollLeft($container.scrollLeft() - differenceX);

                        // update bar position
                        updateBarSizeAndPosition();
                    };

                    var startCoords = {},
                        startTime = 0,
                        speed = {},
                        breakingProcess = null,
                        inGlobalTouch = false;

                    $(window).bind("touchstart.perfect-scrollbar", function (e) {
                        inGlobalTouch = true;
                    });
                    $(window).bind("touchend.perfect-scrollbar", function (e) {
                        inGlobalTouch = false;
                    });

                    $container.bind("touchstart.perfect-scrollbar", function (e) {
                        var touch = e.originalEvent.targetTouches[0];

                        startCoords.pageX = touch.pageX;
                        startCoords.pageY = touch.pageY;

                        startTime = (new Date()).getTime();

                        if (breakingProcess !== null) {
                            clearInterval(breakingProcess);
                        }

                        e.stopPropagation();
                    });
                    $container.bind("touchmove.perfect-scrollbar", function (e) {
                        if (!inGlobalTouch && e.originalEvent.targetTouches.length === 1) {
                            var touch = e.originalEvent.targetTouches[0];

                            var currentCoords = {};
                            currentCoords.pageX = touch.pageX;
                            currentCoords.pageY = touch.pageY;

                            var differenceX = currentCoords.pageX - startCoords.pageX,
                                differenceY = currentCoords.pageY - startCoords.pageY;

                            applyTouchMove(differenceX, differenceY);
                            startCoords = currentCoords;

                            var currentTime = (new Date()).getTime();
                            speed.x = differenceX / (currentTime - startTime);
                            speed.y = differenceY / (currentTime - startTime);
                            startTime = currentTime;

                            e.preventDefault();
                        }
                    });

                    $container.bind("touchend.perfect-scrollbar", function (e) {
                        clearInterval(breakingProcess);
                        breakingProcess = setInterval(function () {
                            if (Math.abs(speed.x) < 0.01 && Math.abs(speed.y) < 0.01) {
                                clearInterval(breakingProcess);
                                return;
                            }

                            applyTouchMove(speed.x * 30, speed.y * 30);

                            speed.x *= 0.8;
                            speed.y *= 0.8;
                        }, 10);
                    });
                };

                //////////////////////////////
                // destroy
                //////////////////////////////
                scope.$on('$destroy', function () {
                    if(delayHandlerTimeout) {
                        $timeout.cancel(delayHandlerTimeout);
                    }
                    $container.unbind('.infinite-scroll');
                    $scrollbarY.unbind('.infinite-scroll');
                    angular.element($window).unbind('.infinite-scroll');
                    $document.unbind('.infinite-scroll');
                    scope.infiniteScrollSource.unbind();
                    scroller = null;
                    $container = null;
                    $scrollbarYRail = null;
                    $scrollbarY = null;
                });

                // init
                return $timeout((function () {
                    containerHeight = getContainerHeight();

                    scope.infiniteScrollLoading = false;
                    $scrollbarYRail = $document.find(scope.infiniteScrollRail);
                    $scrollbarY = $document.find(scope.infiniteScrollBar);

                    bindMouseScrollYHandler();
                    bindMouseWheelHandler();
                    bindRailClickHandler();
                    bindMobileTouchHandler();

                    if(scope.infiniteScrollTop > 0 && scope.infiniteScrollSource.getLength() > 0) {
                        setScrollTop(scope.infiniteScrollTop);
                    }
                    else {
                        delayHandler();
                    }
                }), 1000);
            }
        }
    });