
function UserCtrl($scope) {

  $scope.users = users;

}

function UserTwoCtrl($scope, $http) {

  $http.get('/solution-two/data').success(function(data) {
    $scope.users = data
  })

}

function UserThreeCtrl($scope) {

}