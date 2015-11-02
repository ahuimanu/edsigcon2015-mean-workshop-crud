// Invoke 'strict' JavaScript mode
'use strict';

// Create the 'example' controller
angular.module('example').controller('ExampleController', ['$scope', 'Authentication',
  function($scope, Authentication) {
    $scope.authentication = Authentication;
  }
]);