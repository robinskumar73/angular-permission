(function () {
  'use strict';

  angular.module('permission')
    .provider('Permission', function () {
      var roleValidationConfig = {};

      this.defineRole = function (roleName, validationFunction) {
        if (!angular.isString(roleName)) {
          throw new Error('Role name must be a string');
        }
        if (!angular.isFunction(validationFunction)) {
          throw new Error('Validation function not provided correctly');
        }

        roleValidationConfig[roleName] = validationFunction;
      };

      this.$get = function ($q) {
        var Permission = {
          _validateRoleMap: function (roleMap) {
            if (typeof(roleMap) !== 'object' || roleMap instanceof Array) {
              throw new Error('Role map has to be an object');
            }
            if (roleMap.only === undefined && roleMap.except === undefined) {
              throw new Error('Either "only" or "except" keys must me defined');
            }
            if (roleMap.only) {
              if (!(roleMap.only instanceof Array)) {
                throw new Error('Array of roles excepted');
              }
            } else if (roleMap.except) {
              if (!(roleMap.except instanceof Array)) {
                throw new Error('Array of roles excepted');
              }
            }
          },
          _findMatchingRole: function (rolesArray) {
            var roles = angular.copy(rolesArray);
            var deferred = $q.defer();
            var currentRole = roles.shift();

            // If no roles left to validate reject promise
            if (!currentRole) {
              deferred.reject();
              return deferred.promise;
            }

            Permission.roleValidations[currentRole]().then(function () {
              deferred.resolve();
            }, function () {
              Permission._findMatchingRole(roles).then(function () {
                deferred.resolve();
              }, function () {
                deferred.reject();
              });
            });

            return deferred.promise;
          },
          resolveIfMatch: function (rolesArray) {
            var roles = angular.copy(rolesArray);
            var deferred = $q.defer();
            Permission._findMatchingRole(roles).then(function () {
              // Found role match
              deferred.resolve();
            }, function () {
              // No match
              deferred.reject();
            });
            return deferred.promise;
          },
          rejectIfMatch: function (roles) {
            var deferred = $q.defer();
            Permission._findMatchingRole(roles).then(function () {
              // Role found
              deferred.reject();
            }, function () {
              // Role not found
              deferred.resolve();
            });
            return deferred.promise;
          },
          roleValidations: roleValidationConfig,
          authorize: function (roleMap) {
            // Validate input
            Permission._validateRoleMap(roleMap);

            var authorizing;

            if (roleMap.only) {
              authorizing = Permission.resolveIfMatch(roleMap.only);
            } else {
              authorizing = Permission.rejectIfMatch(roleMap.except);
            }

            return authorizing;
          }
        };

        return Permission;
      };
    });

}());