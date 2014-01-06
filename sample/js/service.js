angular.module('app.service', [])
  .factory('simulateDataService', function ($timeout) {
    var s = {};

    s.data = [];
    s.getData = function(num) {
      $timeout(function() {
        for(var c = 0; c < num; c++) {
          s.data.push({
            title: 'Title ' + s.data.length,
            num: parseInt( Math.random() * 100, 10 )
          });
        }
      }, 1500);
    };

    return s;
  });