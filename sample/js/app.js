angular.module('app', [
    'chylvina.infinite-scroll',
    'app.service'
  ])
  .controller('appController', function ($scope, simulateDataService) {
    $scope.simulateDataService = simulateDataService;
  });