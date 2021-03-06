(function() {
  'use strict';

  angular
    .module('BitriseAddonFirebaseApp')
    .controller('LogsController', function(
      $scope,
      $timeout,
      iframeService,
      requestService,
      pageDetailsService,
      Progress
    ) {
      var viewModel = this;

      $scope.pageDetailsService = pageDetailsService;

      viewModel.loadLogsProgress = new Progress();
      viewModel.isLogTypeFilterVisible = false;
      viewModel.logTypeFilters = [
        {
          id: 'all',
          name: 'All logs'
        },
        {
          id: 'info+',
          name: 'Info & higher'
        },
        {
          id: 'warning+',
          name: 'Warning & higher'
        },
        {
          id: 'error+',
          name: 'Error & higher'
        }
      ];
      viewModel.selectedLogTypeFilter = _.find(viewModel.logTypeFilters, {
        id: 'warning+'
      });
      viewModel.pagination = {
        pages: undefined,
        pageCount: undefined,
        linesPerPage: 50,
        selectedPage: undefined
      };

      var unwatchTest = $scope.$watch(
        function() {
          return pageDetailsService.test;
        },
        function(test) {
          if (!test) {
            return;
          }

          if (test.logsURL) {
            loadLogs();
          }

          unwatchTest();
        }
      );

      var projectTypes = [
        {
          isLogDataWithProjectType: detectorMethodForAndroid,
          logProcessMethodForProjectType: logProcessMethodForAndroid
        },
        {
          isLogDataWithProjectType: detectorMethodForIos,
          logProcessMethodForProjectType: logProcessMethodForIos
        }
      ];
      var currentProjectType;

      function loadLogs() {
        viewModel.loadLogsProgress.start('Loading logs, wait a sec...');

        if (pageDetailsService.test && pageDetailsService.test.logsURL) {
          requestService.getLogfromURL(pageDetailsService.test.logsURL).then(
            function(data) {
              currentProjectType = _.find(projectTypes, function(aProjectType) {
                return aProjectType.isLogDataWithProjectType(data);
              });

              pageDetailsService.logs = currentProjectType.logProcessMethodForProjectType(data);
              viewModel.pagination.selectedPage = 1;

              viewModel.loadLogsProgress.success();

              $timeout(function() {
                iframeService.sendSize();
              }, 50);
            },
            function(error) {
              viewModel.loadLogsProgress.error(new Error('Error loading logs.'));
            }
          );
        }
      }

      function detectorMethodForAndroid(rawLogs) {
        return _.any(
          _.filter(rawLogs.split('\n'), function(aRawLogLine) {
            return aRawLogLine;
          }),
          function(aRawLogLine) {
            if (!aRawLogLine) {
              return false;
            }

            var regexp = new RegExp(
              /^([0-9]+)-([0-9]+) ([0-9]+)\:([0-9]+)\:([0-9]+)\.([0-9]+)\: (?:[0-9]+\-[0-9]+\/.+ |)([V|D|I|W|E|A])\/(.+)\([0-9]+\)\: (.+)$/
            );

            return regexp.test(aRawLogLine);
          }
        );
      }

      function detectorMethodForIos(rawLogs) {
        return _.any(
          _.filter(rawLogs.split('\n'), function(aRawLogLine) {
            return aRawLogLine;
          }),
          function(aRawLogLine) {
            if (!aRawLogLine) {
              return false;
            }

            var regexp = new RegExp(
              /^(.*)  ([0-9]{0,2}) ([0-9]{0,2}):([0-9]{0,2}):([0-9]{0,2}) ([^\[]*)\[[0-9]*] <([^>]*)>: (.*)$/
            );

            return regexp.test(aRawLogLine);
          }
        );
      }

      function logProcessMethodForAndroid(rawLogs) {
        return _.map(
          _.filter(rawLogs.split('\n'), function(aRawLogLine) {
            return aRawLogLine;
          }),
          function(aRawLogLine) {
            if (!aRawLogLine) {
              return null;
            }

            try {
              var regexp = new RegExp(
                /^([0-9]+)-([0-9]+) ([0-9]+)\:([0-9]+)\:([0-9]+)\.([0-9]+)\: (?:[0-9]+\-[0-9]+\/.+ |)([V|D|I|W|E|A])\/(.+)\([0-9]+\)\: (.+)$/
              );
              var month = regexp.exec(aRawLogLine)[1];
              var day = regexp.exec(aRawLogLine)[2];
              var hour = regexp.exec(aRawLogLine)[3];
              var minute = regexp.exec(aRawLogLine)[4];
              var second = regexp.exec(aRawLogLine)[5];
              var millisecond = regexp.exec(aRawLogLine)[6];
              var type;

              switch (regexp.exec(aRawLogLine)[7]) {
                case 'V':
                  type = {
                    id: 'verbose',
                    cssClass: 'verbose'
                  };

                  break;
                case 'D':
                  type = {
                    id: 'debug',
                    cssClass: 'debug'
                  };

                  break;
                case 'I':
                  type = {
                    id: 'info',
                    cssClass: 'info'
                  };

                  break;
                case 'W':
                  type = {
                    id: 'warning',
                    cssClass: 'warning'
                  };

                  break;
                case 'E':
                  type = {
                    id: 'error',
                    cssClass: 'error'
                  };

                  break;
                case 'A':
                  type = {
                    id: 'assert',
                    cssClass: 'assert'
                  };

                  break;
              }

              var tag = regexp.exec(aRawLogLine)[8];
              var message = regexp.exec(aRawLogLine)[9];

              var date = new Date(new Date().getFullYear(), month, day, hour, minute, second, millisecond);

              return {
                date: date,
                type: type,
                tag: tag,
                message: message,
                isProcessed: true,
                isExpanded: false
              };
            } catch (error) {
              var type = {
                id: 'verbose',
                cssClass: 'verbose'
              };

              viewModel.selectedLogTypeFilter = _.find(viewModel.logTypeFilters, {
                id: 'all'
              });

              viewModel.logTypeFilters = [
                {
                  id: 'all',
                  name: 'All logs'
                }
              ];

              return {
                date: undefined,
                type: type,
                tag: undefined,
                message: aRawLogLine,
                isProcessed: true,
                isExpanded: false
              };
            }
          }
        );
      }

      function logProcessMethodForIos(rawLogs) {
        var logLines = [];
        var currentLogLine;

        _.each(
          _.filter(rawLogs.split('\n'), function(aRawLogLine) {
            return aRawLogLine;
          }),
          function(aRawLogLine) {
            if (!aRawLogLine) {
              return null;
            }

            try {
              var regexp = new RegExp(
                /^(.*)  ([0-9]{0,2}) ([0-9]{0,2}):([0-9]{0,2}):([0-9]{0,2}) ([^\[]*)\[[0-9]*] <([^>]*)>: (.*)$/
              );

              if (!regexp.test(aRawLogLine)) {
                if (currentLogLine) {
                  currentLogLine.message += '\n' + aRawLogLine;
                } else {
                  logLines.push({
                    date: undefined,
                    type: {
                      id: 'verbose',
                      cssClass: 'verbose'
                    },
                    tag: undefined,
                    message: aRawLogLine,
                    isProcessed: true,
                    isExpanded: false
                  });
                }

                return;
              }

              var month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(
                regexp.exec(aRawLogLine)[1]
              );
              var day = regexp.exec(aRawLogLine)[2];
              var hour = regexp.exec(aRawLogLine)[3];
              var minute = regexp.exec(aRawLogLine)[4];
              var second = regexp.exec(aRawLogLine)[5];
              var tag = regexp.exec(aRawLogLine)[6];
              var type;

              switch (regexp.exec(aRawLogLine)[7]) {
                case 'Notice':
                  type = {
                    id: 'info',
                    cssClass: 'info'
                  };

                  break;
                case 'Error':
                  type = {
                    id: 'error',
                    cssClass: 'error'
                  };

                  break;
                default:
                  console.log(aRawLogLine);

                  break;
              }

              var message = regexp.exec(aRawLogLine)[8];

              var date = new Date(new Date().getFullYear(), month, day, hour, minute, second);

              currentLogLine = {
                date: date,
                type: type,
                tag: tag,
                message: message,
                isProcessed: true,
                isExpanded: false
              };

              logLines.push(currentLogLine);
            } catch (error) {
              var type = {
                id: 'verbose',
                cssClass: 'verbose'
              };

              viewModel.selectedLogTypeFilter = _.find(viewModel.logTypeFilters, {
                id: 'all'
              });

              viewModel.logTypeFilters = [
                {
                  id: 'all',
                  name: 'All logs'
                }
              ];

              logLines.push({
                date: undefined,
                type: type,
                tag: undefined,
                message: aRawLogLine,
                isProcessed: true,
                isExpanded: false
              });
            }
          }
        );

        return logLines;
      }

      viewModel.logTypeFilterSelected = function(logTypeFilter) {
        viewModel.selectedLogTypeFilter = logTypeFilter;
        viewModel.isLogTypeFilterVisible = false;

        $timeout(function() {
          iframeService.sendSize();
        }, 50);
      };

      viewModel.filteredLogs = function() {
        return _.filter(pageDetailsService.logs, function(aLogLine) {
          if (!aLogLine.isProcessed) {
            return false;
          }

          switch (viewModel.selectedLogTypeFilter.id) {
            case 'all':
              return _.contains(['verbose', 'debug', 'info', 'warning', 'error', 'assert', 'notice'], aLogLine.type.id);
            case 'info+':
              return _.contains(['info', 'warning', 'error', 'assert'], aLogLine.type.id);
            case 'warning+':
              return _.contains(['warning', 'error', 'assert'], aLogLine.type.id);
            case 'error+':
              return _.contains(['error', 'assert'], aLogLine.type.id);
          }
        });
      };

      function updatePaginationPages() {
        if (viewModel.pagination.selectedPage === undefined) {
          return;
        }

        viewModel.pagination.pages = [];
        var pageCount = Math.ceil(viewModel.filteredLogs().length / viewModel.pagination.linesPerPage);

        _.each(_.range(1, pageCount + 1), function(page) {
          if (page <= 2) {
            viewModel.pagination.pages.push(page);
          } else if (Math.abs(viewModel.pagination.selectedPage - page) <= 2) {
            viewModel.pagination.pages.push(page);
          } else if (Math.abs(pageCount - page) < 2) {
            viewModel.pagination.pages.push(page);
          }
        });

        _.each(_.range(1, pageCount + 1), function(page) {
          if (_.contains(viewModel.pagination.pages, page)) {
            return;
          }

          if (_.contains(viewModel.pagination.pages, page - 1) && _.contains(viewModel.pagination.pages, page + 1)) {
            viewModel.pagination.pages.splice(_.indexOf(viewModel.pagination.pages, page - 1) + 1, 0, page);
          }
        });

        $timeout(function() {
          iframeService.sendSize();
        }, 50);
      }

      $scope.$watch(
        function() {
          return pageDetailsService.logs;
        },
        function(selectedPage) {
          updatePaginationPages();
        }
      );

      $scope.$watch(
        function() {
          return viewModel.selectedLogTypeFilter;
        },
        function(selectedPage) {
          var oldSelectedPage = viewModel.pagination.selectedPage;
          viewModel.pagination.selectedPage = 1;

          if (oldSelectedPage == viewModel.pagination.selectedPage) {
            updatePaginationPages();
          }
        }
      );

      $scope.$watch(
        function() {
          return viewModel.pagination.selectedPage;
        },
        function(selectedPage) {
          updatePaginationPages();
        }
      );
    });
})();
