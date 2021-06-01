Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { var callNext = step.bind(null, 'next'); var callThrow = step.bind(null, 'throw'); function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(callNext, callThrow); } } callNext(); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

/* eslint-disable import/no-duplicates */

var _atom = require('atom');

var _helpers = require('./helpers');

var Helpers = _interopRequireWildcard(_helpers);

var _validate = require('./validate');

var Validate = _interopRequireWildcard(_validate);

var LinterRegistry = (function () {
  function LinterRegistry() {
    var _this = this;

    _classCallCheck(this, LinterRegistry);

    this.emitter = new _atom.Emitter();
    this.linters = new Set();
    this.subscriptions = new _atom.CompositeDisposable();
    this.activeNotifications = new Set();

    this.subscriptions.add(atom.config.observe('linter.lintOnChange', function (lintOnChange) {
      _this.lintOnChange = lintOnChange;
    }));
    this.subscriptions.add(atom.config.observe('core.excludeVcsIgnoredPaths', function (ignoreVCS) {
      _this.ignoreVCS = ignoreVCS;
    }));
    this.subscriptions.add(atom.config.observe('linter.ignoreGlob', function (ignoreGlob) {
      _this.ignoreGlob = ignoreGlob;
    }));
    this.subscriptions.add(atom.config.observe('linter.lintPreviewTabs', function (lintPreviewTabs) {
      _this.lintPreviewTabs = lintPreviewTabs;
    }));
    this.subscriptions.add(atom.config.observe('linter.disabledProviders', function (disabledProviders) {
      _this.disabledProviders = disabledProviders;
    }));
    this.subscriptions.add(this.emitter);
  }

  _createClass(LinterRegistry, [{
    key: 'hasLinter',
    value: function hasLinter(linter) {
      return this.linters.has(linter);
    }
  }, {
    key: 'addLinter',
    value: function addLinter(linter) {
      if (!Validate.linter(linter)) {
        return;
      }
      linter[_helpers.$activated] = true;
      if (typeof linter[_helpers.$requestLatest] === 'undefined') {
        linter[_helpers.$requestLatest] = 0;
      }
      if (typeof linter[_helpers.$requestLastReceived] === 'undefined') {
        linter[_helpers.$requestLastReceived] = 0;
      }
      linter[_helpers.$version] = 2;
      this.linters.add(linter);
    }
  }, {
    key: 'getProviders',
    value: function getProviders() {
      return Array.from(this.linters);
    }
  }, {
    key: 'deleteLinter',
    value: function deleteLinter(linter) {
      if (!this.linters.has(linter)) {
        return;
      }
      linter[_helpers.$activated] = false;
      this.linters['delete'](linter);
    }
  }, {
    key: 'lint',
    value: _asyncToGenerator(function* (_ref) {
      var onChange = _ref.onChange;
      var editor = _ref.editor;
      return yield* (function* () {
        var _this2 = this;

        var filePath = editor.getPath();

        if (onChange && !this.lintOnChange || // Lint-on-change mismatch
        // Ignored by VCS, Glob, or simply not saved anywhere yet
        Helpers.isPathIgnored(editor.getPath(), this.ignoreGlob, this.ignoreVCS) || !this.lintPreviewTabs && atom.workspace.getActivePane().getPendingItem() === editor // Ignore Preview tabs
        ) {
            return false;
          }

        var scopes = Helpers.getEditorCursorScopes(editor);

        var promises = [];

        var _loop = function (linter) {
          if (!Helpers.shouldTriggerLinter(linter, onChange, scopes)) {
            return 'continue';
          }
          if (_this2.disabledProviders.includes(linter.name)) {
            return 'continue';
          }
          var number = ++linter[_helpers.$requestLatest];
          var statusBuffer = linter.scope === 'file' ? editor.getBuffer() : null;
          var statusFilePath = linter.scope === 'file' ? filePath : null;

          _this2.emitter.emit('did-begin-linting', { number: number, linter: linter, filePath: statusFilePath });
          promises.push(new Promise(function (resolve) {
            // $FlowIgnore: Type too complex, duh
            resolve(linter.lint(editor));
          }).then(function (messages) {
            _this2.emitter.emit('did-finish-linting', { number: number, linter: linter, filePath: statusFilePath });
            if (linter[_helpers.$requestLastReceived] >= number || !linter[_helpers.$activated] || statusBuffer && !statusBuffer.isAlive()) {
              return;
            }
            linter[_helpers.$requestLastReceived] = number;
            if (statusBuffer && !statusBuffer.isAlive()) {
              return;
            }

            if (messages === null) {
              // NOTE: Do NOT update the messages when providers return null
              return;
            }

            var validity = true;
            // NOTE: We are calling it when results are not an array to show a nice notification
            if (atom.inDevMode() || !Array.isArray(messages)) {
              validity = Validate.messages(linter.name, messages);
            }
            if (!validity) {
              return;
            }

            Helpers.normalizeMessages(linter.name, messages);
            _this2.emitter.emit('did-update-messages', { messages: messages, linter: linter, buffer: statusBuffer });
          }, function (error) {
            _this2.emitter.emit('did-finish-linting', { number: number, linter: linter, filePath: statusFilePath });

            console.error('[Linter] Error running ' + linter.name, error);
            var notificationMessage = '[Linter] Error running ' + linter.name;
            if (Array.from(_this2.activeNotifications).some(function (item) {
              return item.getOptions().detail === notificationMessage;
            })) {
              // This message is still showing to the user!
              return;
            }

            var notification = atom.notifications.addError(notificationMessage, {
              detail: 'See Console for more info.',
              dismissable: true,
              buttons: [{
                text: 'Open Console',
                onDidClick: function onDidClick() {
                  atom.openDevTools();
                  notification.dismiss();
                }
              }, {
                text: 'Cancel',
                onDidClick: function onDidClick() {
                  notification.dismiss();
                }
              }]
            });
          }));
        };

        for (var linter of this.linters) {
          var _ret = _loop(linter);

          if (_ret === 'continue') continue;
        }

        yield Promise.all(promises);
        return true;
      }).apply(this, arguments);
    })
  }, {
    key: 'onDidUpdateMessages',
    value: function onDidUpdateMessages(callback) {
      return this.emitter.on('did-update-messages', callback);
    }
  }, {
    key: 'onDidBeginLinting',
    value: function onDidBeginLinting(callback) {
      return this.emitter.on('did-begin-linting', callback);
    }
  }, {
    key: 'onDidFinishLinting',
    value: function onDidFinishLinting(callback) {
      return this.emitter.on('did-finish-linting', callback);
    }
  }, {
    key: 'dispose',
    value: function dispose() {
      this.activeNotifications.forEach(function (notification) {
        return notification.dismiss();
      });
      this.activeNotifications.clear();
      this.linters.clear();
      this.subscriptions.dispose();
    }
  }]);

  return LinterRegistry;
})();

exports['default'] = LinterRegistry;
module.exports = exports['default'];
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9heWFhbmtoYW4vLmF0b20vcGFja2FnZXMvbGludGVyL2xpYi9saW50ZXItcmVnaXN0cnkuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7b0JBRzZDLE1BQU07O3VCQUcxQixXQUFXOztJQUF4QixPQUFPOzt3QkFDTyxZQUFZOztJQUExQixRQUFROztJQUlkLGNBQWM7QUFXUCxXQVhQLGNBQWMsR0FXSjs7OzBCQVhWLGNBQWM7O0FBWWhCLFFBQUksQ0FBQyxPQUFPLEdBQUcsbUJBQWEsQ0FBQTtBQUM1QixRQUFJLENBQUMsT0FBTyxHQUFHLElBQUksR0FBRyxFQUFFLENBQUE7QUFDeEIsUUFBSSxDQUFDLGFBQWEsR0FBRywrQkFBeUIsQ0FBQTtBQUM5QyxRQUFJLENBQUMsbUJBQW1CLEdBQUcsSUFBSSxHQUFHLEVBQUUsQ0FBQTs7QUFFcEMsUUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQ3BCLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLHFCQUFxQixFQUFFLFVBQUEsWUFBWSxFQUFJO0FBQ3pELFlBQUssWUFBWSxHQUFHLFlBQVksQ0FBQTtLQUNqQyxDQUFDLENBQ0gsQ0FBQTtBQUNELFFBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUNwQixJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyw2QkFBNkIsRUFBRSxVQUFBLFNBQVMsRUFBSTtBQUM5RCxZQUFLLFNBQVMsR0FBRyxTQUFTLENBQUE7S0FDM0IsQ0FBQyxDQUNILENBQUE7QUFDRCxRQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FDcEIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsbUJBQW1CLEVBQUUsVUFBQSxVQUFVLEVBQUk7QUFDckQsWUFBSyxVQUFVLEdBQUcsVUFBVSxDQUFBO0tBQzdCLENBQUMsQ0FDSCxDQUFBO0FBQ0QsUUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQ3BCLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLHdCQUF3QixFQUFFLFVBQUEsZUFBZSxFQUFJO0FBQy9ELFlBQUssZUFBZSxHQUFHLGVBQWUsQ0FBQTtLQUN2QyxDQUFDLENBQ0gsQ0FBQTtBQUNELFFBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUNwQixJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQywwQkFBMEIsRUFBRSxVQUFBLGlCQUFpQixFQUFJO0FBQ25FLFlBQUssaUJBQWlCLEdBQUcsaUJBQWlCLENBQUE7S0FDM0MsQ0FBQyxDQUNILENBQUE7QUFDRCxRQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUE7R0FDckM7O2VBM0NHLGNBQWM7O1dBNENULG1CQUFDLE1BQWMsRUFBVztBQUNqQyxhQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFBO0tBQ2hDOzs7V0FDUSxtQkFBQyxNQUFjLEVBQUU7QUFDeEIsVUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUU7QUFDNUIsZUFBTTtPQUNQO0FBQ0QsWUFBTSxxQkFBWSxHQUFHLElBQUksQ0FBQTtBQUN6QixVQUFJLE9BQU8sTUFBTSx5QkFBZ0IsS0FBSyxXQUFXLEVBQUU7QUFDakQsY0FBTSx5QkFBZ0IsR0FBRyxDQUFDLENBQUE7T0FDM0I7QUFDRCxVQUFJLE9BQU8sTUFBTSwrQkFBc0IsS0FBSyxXQUFXLEVBQUU7QUFDdkQsY0FBTSwrQkFBc0IsR0FBRyxDQUFDLENBQUE7T0FDakM7QUFDRCxZQUFNLG1CQUFVLEdBQUcsQ0FBQyxDQUFBO0FBQ3BCLFVBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFBO0tBQ3pCOzs7V0FDVyx3QkFBa0I7QUFDNUIsYUFBTyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQTtLQUNoQzs7O1dBQ1csc0JBQUMsTUFBYyxFQUFFO0FBQzNCLFVBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRTtBQUM3QixlQUFNO09BQ1A7QUFDRCxZQUFNLHFCQUFZLEdBQUcsS0FBSyxDQUFBO0FBQzFCLFVBQUksQ0FBQyxPQUFPLFVBQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQTtLQUM1Qjs7OzZCQUNTLFdBQUMsSUFBK0Q7VUFBN0QsUUFBUSxHQUFWLElBQStELENBQTdELFFBQVE7VUFBRSxNQUFNLEdBQWxCLElBQStELENBQW5ELE1BQU07a0NBQWlFOzs7QUFDNUYsWUFBTSxRQUFRLEdBQUcsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFBOztBQUVqQyxZQUNFLEFBQUMsUUFBUSxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVk7O0FBRS9CLGVBQU8sQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxFQUFFLElBQUksQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUN2RSxDQUFDLElBQUksQ0FBQyxlQUFlLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxhQUFhLEVBQUUsQ0FBQyxjQUFjLEVBQUUsS0FBSyxNQUFNLEFBQUM7VUFDckY7QUFDQSxtQkFBTyxLQUFLLENBQUE7V0FDYjs7QUFFRCxZQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMscUJBQXFCLENBQUMsTUFBTSxDQUFDLENBQUE7O0FBRXBELFlBQU0sUUFBUSxHQUFHLEVBQUUsQ0FBQTs7OEJBQ1IsTUFBTTtBQUNmLGNBQUksQ0FBQyxPQUFPLENBQUMsbUJBQW1CLENBQUMsTUFBTSxFQUFFLFFBQVEsRUFBRSxNQUFNLENBQUMsRUFBRTtBQUMxRCw4QkFBUTtXQUNUO0FBQ0QsY0FBSSxPQUFLLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUU7QUFDaEQsOEJBQVE7V0FDVDtBQUNELGNBQU0sTUFBTSxHQUFHLEVBQUUsTUFBTSx5QkFBZ0IsQ0FBQTtBQUN2QyxjQUFNLFlBQVksR0FBRyxNQUFNLENBQUMsS0FBSyxLQUFLLE1BQU0sR0FBRyxNQUFNLENBQUMsU0FBUyxFQUFFLEdBQUcsSUFBSSxDQUFBO0FBQ3hFLGNBQU0sY0FBYyxHQUFHLE1BQU0sQ0FBQyxLQUFLLEtBQUssTUFBTSxHQUFHLFFBQVEsR0FBRyxJQUFJLENBQUE7O0FBRWhFLGlCQUFLLE9BQU8sQ0FBQyxJQUFJLENBQUMsbUJBQW1CLEVBQUUsRUFBRSxNQUFNLEVBQU4sTUFBTSxFQUFFLE1BQU0sRUFBTixNQUFNLEVBQUUsUUFBUSxFQUFFLGNBQWMsRUFBRSxDQUFDLENBQUE7QUFDcEYsa0JBQVEsQ0FBQyxJQUFJLENBQ1gsSUFBSSxPQUFPLENBQUMsVUFBUyxPQUFPLEVBQUU7O0FBRTVCLG1CQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO1dBQzdCLENBQUMsQ0FBQyxJQUFJLENBQ0wsVUFBQSxRQUFRLEVBQUk7QUFDVixtQkFBSyxPQUFPLENBQUMsSUFBSSxDQUFDLG9CQUFvQixFQUFFLEVBQUUsTUFBTSxFQUFOLE1BQU0sRUFBRSxNQUFNLEVBQU4sTUFBTSxFQUFFLFFBQVEsRUFBRSxjQUFjLEVBQUUsQ0FBQyxDQUFBO0FBQ3JGLGdCQUFJLE1BQU0sK0JBQXNCLElBQUksTUFBTSxJQUFJLENBQUMsTUFBTSxxQkFBWSxJQUFLLFlBQVksSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLEVBQUUsQUFBQyxFQUFFO0FBQzlHLHFCQUFNO2FBQ1A7QUFDRCxrQkFBTSwrQkFBc0IsR0FBRyxNQUFNLENBQUE7QUFDckMsZ0JBQUksWUFBWSxJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sRUFBRSxFQUFFO0FBQzNDLHFCQUFNO2FBQ1A7O0FBRUQsZ0JBQUksUUFBUSxLQUFLLElBQUksRUFBRTs7QUFFckIscUJBQU07YUFDUDs7QUFFRCxnQkFBSSxRQUFRLEdBQUcsSUFBSSxDQUFBOztBQUVuQixnQkFBSSxJQUFJLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxFQUFFO0FBQ2hELHNCQUFRLEdBQUcsUUFBUSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFBO2FBQ3BEO0FBQ0QsZ0JBQUksQ0FBQyxRQUFRLEVBQUU7QUFDYixxQkFBTTthQUNQOztBQUVELG1CQUFPLENBQUMsaUJBQWlCLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQTtBQUNoRCxtQkFBSyxPQUFPLENBQUMsSUFBSSxDQUFDLHFCQUFxQixFQUFFLEVBQUUsUUFBUSxFQUFSLFFBQVEsRUFBRSxNQUFNLEVBQU4sTUFBTSxFQUFFLE1BQU0sRUFBRSxZQUFZLEVBQUUsQ0FBQyxDQUFBO1dBQ3JGLEVBQ0QsVUFBQSxLQUFLLEVBQUk7QUFDUCxtQkFBSyxPQUFPLENBQUMsSUFBSSxDQUFDLG9CQUFvQixFQUFFLEVBQUUsTUFBTSxFQUFOLE1BQU0sRUFBRSxNQUFNLEVBQU4sTUFBTSxFQUFFLFFBQVEsRUFBRSxjQUFjLEVBQUUsQ0FBQyxDQUFBOztBQUVyRixtQkFBTyxDQUFDLEtBQUssNkJBQTJCLE1BQU0sQ0FBQyxJQUFJLEVBQUksS0FBSyxDQUFDLENBQUE7QUFDN0QsZ0JBQU0sbUJBQW1CLCtCQUE2QixNQUFNLENBQUMsSUFBSSxBQUFFLENBQUE7QUFDbkUsZ0JBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFLLG1CQUFtQixDQUFDLENBQUMsSUFBSSxDQUFDLFVBQUEsSUFBSTtxQkFBSSxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUMsTUFBTSxLQUFLLG1CQUFtQjthQUFBLENBQUMsRUFBRTs7QUFFdkcscUJBQU07YUFDUDs7QUFFRCxnQkFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsbUJBQW1CLEVBQUU7QUFDcEUsb0JBQU0sRUFBRSw0QkFBNEI7QUFDcEMseUJBQVcsRUFBRSxJQUFJO0FBQ2pCLHFCQUFPLEVBQUUsQ0FDUDtBQUNFLG9CQUFJLEVBQUUsY0FBYztBQUNwQiwwQkFBVSxFQUFFLHNCQUFNO0FBQ2hCLHNCQUFJLENBQUMsWUFBWSxFQUFFLENBQUE7QUFDbkIsOEJBQVksQ0FBQyxPQUFPLEVBQUUsQ0FBQTtpQkFDdkI7ZUFDRixFQUNEO0FBQ0Usb0JBQUksRUFBRSxRQUFRO0FBQ2QsMEJBQVUsRUFBRSxzQkFBTTtBQUNoQiw4QkFBWSxDQUFDLE9BQU8sRUFBRSxDQUFBO2lCQUN2QjtlQUNGLENBQ0Y7YUFDRixDQUFDLENBQUE7V0FDSCxDQUNGLENBQ0YsQ0FBQTs7O0FBM0VILGFBQUssSUFBTSxNQUFNLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRTsyQkFBeEIsTUFBTTs7bUNBS2IsU0FBUTtTQXVFWDs7QUFFRCxjQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUE7QUFDM0IsZUFBTyxJQUFJLENBQUE7T0FDWjtLQUFBOzs7V0FDa0IsNkJBQUMsUUFBa0IsRUFBYztBQUNsRCxhQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLHFCQUFxQixFQUFFLFFBQVEsQ0FBQyxDQUFBO0tBQ3hEOzs7V0FDZ0IsMkJBQUMsUUFBa0IsRUFBYztBQUNoRCxhQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLG1CQUFtQixFQUFFLFFBQVEsQ0FBQyxDQUFBO0tBQ3REOzs7V0FDaUIsNEJBQUMsUUFBa0IsRUFBYztBQUNqRCxhQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLG9CQUFvQixFQUFFLFFBQVEsQ0FBQyxDQUFBO0tBQ3ZEOzs7V0FDTSxtQkFBRztBQUNSLFVBQUksQ0FBQyxtQkFBbUIsQ0FBQyxPQUFPLENBQUMsVUFBQSxZQUFZO2VBQUksWUFBWSxDQUFDLE9BQU8sRUFBRTtPQUFBLENBQUMsQ0FBQTtBQUN4RSxVQUFJLENBQUMsbUJBQW1CLENBQUMsS0FBSyxFQUFFLENBQUE7QUFDaEMsVUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQTtBQUNwQixVQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sRUFBRSxDQUFBO0tBQzdCOzs7U0FyTEcsY0FBYzs7O3FCQXdMTCxjQUFjIiwiZmlsZSI6Ii9Vc2Vycy9heWFhbmtoYW4vLmF0b20vcGFja2FnZXMvbGludGVyL2xpYi9saW50ZXItcmVnaXN0cnkuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiBAZmxvdyAqL1xuLyogZXNsaW50LWRpc2FibGUgaW1wb3J0L25vLWR1cGxpY2F0ZXMgKi9cblxuaW1wb3J0IHsgRW1pdHRlciwgQ29tcG9zaXRlRGlzcG9zYWJsZSB9IGZyb20gJ2F0b20nXG5pbXBvcnQgdHlwZSB7IFRleHRFZGl0b3IsIERpc3Bvc2FibGUsIE5vdGlmaWNhdGlvbiB9IGZyb20gJ2F0b20nXG5cbmltcG9ydCAqIGFzIEhlbHBlcnMgZnJvbSAnLi9oZWxwZXJzJ1xuaW1wb3J0ICogYXMgVmFsaWRhdGUgZnJvbSAnLi92YWxpZGF0ZSdcbmltcG9ydCB7ICR2ZXJzaW9uLCAkYWN0aXZhdGVkLCAkcmVxdWVzdExhdGVzdCwgJHJlcXVlc3RMYXN0UmVjZWl2ZWQgfSBmcm9tICcuL2hlbHBlcnMnXG5pbXBvcnQgdHlwZSB7IExpbnRlciB9IGZyb20gJy4vdHlwZXMnXG5cbmNsYXNzIExpbnRlclJlZ2lzdHJ5IHtcbiAgZW1pdHRlcjogRW1pdHRlclxuICBsaW50ZXJzOiBTZXQ8TGludGVyPlxuICBsaW50T25DaGFuZ2U6IGJvb2xlYW5cbiAgaWdub3JlVkNTOiBib29sZWFuXG4gIGlnbm9yZUdsb2I6IHN0cmluZ1xuICBsaW50UHJldmlld1RhYnM6IGJvb2xlYW5cbiAgc3Vic2NyaXB0aW9uczogQ29tcG9zaXRlRGlzcG9zYWJsZVxuICBkaXNhYmxlZFByb3ZpZGVyczogQXJyYXk8c3RyaW5nPlxuICBhY3RpdmVOb3RpZmljYXRpb25zOiBTZXQ8Tm90aWZpY2F0aW9uPlxuXG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHRoaXMuZW1pdHRlciA9IG5ldyBFbWl0dGVyKClcbiAgICB0aGlzLmxpbnRlcnMgPSBuZXcgU2V0KClcbiAgICB0aGlzLnN1YnNjcmlwdGlvbnMgPSBuZXcgQ29tcG9zaXRlRGlzcG9zYWJsZSgpXG4gICAgdGhpcy5hY3RpdmVOb3RpZmljYXRpb25zID0gbmV3IFNldCgpXG5cbiAgICB0aGlzLnN1YnNjcmlwdGlvbnMuYWRkKFxuICAgICAgYXRvbS5jb25maWcub2JzZXJ2ZSgnbGludGVyLmxpbnRPbkNoYW5nZScsIGxpbnRPbkNoYW5nZSA9PiB7XG4gICAgICAgIHRoaXMubGludE9uQ2hhbmdlID0gbGludE9uQ2hhbmdlXG4gICAgICB9KSxcbiAgICApXG4gICAgdGhpcy5zdWJzY3JpcHRpb25zLmFkZChcbiAgICAgIGF0b20uY29uZmlnLm9ic2VydmUoJ2NvcmUuZXhjbHVkZVZjc0lnbm9yZWRQYXRocycsIGlnbm9yZVZDUyA9PiB7XG4gICAgICAgIHRoaXMuaWdub3JlVkNTID0gaWdub3JlVkNTXG4gICAgICB9KSxcbiAgICApXG4gICAgdGhpcy5zdWJzY3JpcHRpb25zLmFkZChcbiAgICAgIGF0b20uY29uZmlnLm9ic2VydmUoJ2xpbnRlci5pZ25vcmVHbG9iJywgaWdub3JlR2xvYiA9PiB7XG4gICAgICAgIHRoaXMuaWdub3JlR2xvYiA9IGlnbm9yZUdsb2JcbiAgICAgIH0pLFxuICAgIClcbiAgICB0aGlzLnN1YnNjcmlwdGlvbnMuYWRkKFxuICAgICAgYXRvbS5jb25maWcub2JzZXJ2ZSgnbGludGVyLmxpbnRQcmV2aWV3VGFicycsIGxpbnRQcmV2aWV3VGFicyA9PiB7XG4gICAgICAgIHRoaXMubGludFByZXZpZXdUYWJzID0gbGludFByZXZpZXdUYWJzXG4gICAgICB9KSxcbiAgICApXG4gICAgdGhpcy5zdWJzY3JpcHRpb25zLmFkZChcbiAgICAgIGF0b20uY29uZmlnLm9ic2VydmUoJ2xpbnRlci5kaXNhYmxlZFByb3ZpZGVycycsIGRpc2FibGVkUHJvdmlkZXJzID0+IHtcbiAgICAgICAgdGhpcy5kaXNhYmxlZFByb3ZpZGVycyA9IGRpc2FibGVkUHJvdmlkZXJzXG4gICAgICB9KSxcbiAgICApXG4gICAgdGhpcy5zdWJzY3JpcHRpb25zLmFkZCh0aGlzLmVtaXR0ZXIpXG4gIH1cbiAgaGFzTGludGVyKGxpbnRlcjogTGludGVyKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMubGludGVycy5oYXMobGludGVyKVxuICB9XG4gIGFkZExpbnRlcihsaW50ZXI6IExpbnRlcikge1xuICAgIGlmICghVmFsaWRhdGUubGludGVyKGxpbnRlcikpIHtcbiAgICAgIHJldHVyblxuICAgIH1cbiAgICBsaW50ZXJbJGFjdGl2YXRlZF0gPSB0cnVlXG4gICAgaWYgKHR5cGVvZiBsaW50ZXJbJHJlcXVlc3RMYXRlc3RdID09PSAndW5kZWZpbmVkJykge1xuICAgICAgbGludGVyWyRyZXF1ZXN0TGF0ZXN0XSA9IDBcbiAgICB9XG4gICAgaWYgKHR5cGVvZiBsaW50ZXJbJHJlcXVlc3RMYXN0UmVjZWl2ZWRdID09PSAndW5kZWZpbmVkJykge1xuICAgICAgbGludGVyWyRyZXF1ZXN0TGFzdFJlY2VpdmVkXSA9IDBcbiAgICB9XG4gICAgbGludGVyWyR2ZXJzaW9uXSA9IDJcbiAgICB0aGlzLmxpbnRlcnMuYWRkKGxpbnRlcilcbiAgfVxuICBnZXRQcm92aWRlcnMoKTogQXJyYXk8TGludGVyPiB7XG4gICAgcmV0dXJuIEFycmF5LmZyb20odGhpcy5saW50ZXJzKVxuICB9XG4gIGRlbGV0ZUxpbnRlcihsaW50ZXI6IExpbnRlcikge1xuICAgIGlmICghdGhpcy5saW50ZXJzLmhhcyhsaW50ZXIpKSB7XG4gICAgICByZXR1cm5cbiAgICB9XG4gICAgbGludGVyWyRhY3RpdmF0ZWRdID0gZmFsc2VcbiAgICB0aGlzLmxpbnRlcnMuZGVsZXRlKGxpbnRlcilcbiAgfVxuICBhc3luYyBsaW50KHsgb25DaGFuZ2UsIGVkaXRvciB9OiB7IG9uQ2hhbmdlOiBib29sZWFuLCBlZGl0b3I6IFRleHRFZGl0b3IgfSk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIGNvbnN0IGZpbGVQYXRoID0gZWRpdG9yLmdldFBhdGgoKVxuXG4gICAgaWYgKFxuICAgICAgKG9uQ2hhbmdlICYmICF0aGlzLmxpbnRPbkNoYW5nZSkgfHwgLy8gTGludC1vbi1jaGFuZ2UgbWlzbWF0Y2hcbiAgICAgIC8vIElnbm9yZWQgYnkgVkNTLCBHbG9iLCBvciBzaW1wbHkgbm90IHNhdmVkIGFueXdoZXJlIHlldFxuICAgICAgSGVscGVycy5pc1BhdGhJZ25vcmVkKGVkaXRvci5nZXRQYXRoKCksIHRoaXMuaWdub3JlR2xvYiwgdGhpcy5pZ25vcmVWQ1MpIHx8XG4gICAgICAoIXRoaXMubGludFByZXZpZXdUYWJzICYmIGF0b20ud29ya3NwYWNlLmdldEFjdGl2ZVBhbmUoKS5nZXRQZW5kaW5nSXRlbSgpID09PSBlZGl0b3IpIC8vIElnbm9yZSBQcmV2aWV3IHRhYnNcbiAgICApIHtcbiAgICAgIHJldHVybiBmYWxzZVxuICAgIH1cblxuICAgIGNvbnN0IHNjb3BlcyA9IEhlbHBlcnMuZ2V0RWRpdG9yQ3Vyc29yU2NvcGVzKGVkaXRvcilcblxuICAgIGNvbnN0IHByb21pc2VzID0gW11cbiAgICBmb3IgKGNvbnN0IGxpbnRlciBvZiB0aGlzLmxpbnRlcnMpIHtcbiAgICAgIGlmICghSGVscGVycy5zaG91bGRUcmlnZ2VyTGludGVyKGxpbnRlciwgb25DaGFuZ2UsIHNjb3BlcykpIHtcbiAgICAgICAgY29udGludWVcbiAgICAgIH1cbiAgICAgIGlmICh0aGlzLmRpc2FibGVkUHJvdmlkZXJzLmluY2x1ZGVzKGxpbnRlci5uYW1lKSkge1xuICAgICAgICBjb250aW51ZVxuICAgICAgfVxuICAgICAgY29uc3QgbnVtYmVyID0gKytsaW50ZXJbJHJlcXVlc3RMYXRlc3RdXG4gICAgICBjb25zdCBzdGF0dXNCdWZmZXIgPSBsaW50ZXIuc2NvcGUgPT09ICdmaWxlJyA/IGVkaXRvci5nZXRCdWZmZXIoKSA6IG51bGxcbiAgICAgIGNvbnN0IHN0YXR1c0ZpbGVQYXRoID0gbGludGVyLnNjb3BlID09PSAnZmlsZScgPyBmaWxlUGF0aCA6IG51bGxcblxuICAgICAgdGhpcy5lbWl0dGVyLmVtaXQoJ2RpZC1iZWdpbi1saW50aW5nJywgeyBudW1iZXIsIGxpbnRlciwgZmlsZVBhdGg6IHN0YXR1c0ZpbGVQYXRoIH0pXG4gICAgICBwcm9taXNlcy5wdXNoKFxuICAgICAgICBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlKSB7XG4gICAgICAgICAgLy8gJEZsb3dJZ25vcmU6IFR5cGUgdG9vIGNvbXBsZXgsIGR1aFxuICAgICAgICAgIHJlc29sdmUobGludGVyLmxpbnQoZWRpdG9yKSlcbiAgICAgICAgfSkudGhlbihcbiAgICAgICAgICBtZXNzYWdlcyA9PiB7XG4gICAgICAgICAgICB0aGlzLmVtaXR0ZXIuZW1pdCgnZGlkLWZpbmlzaC1saW50aW5nJywgeyBudW1iZXIsIGxpbnRlciwgZmlsZVBhdGg6IHN0YXR1c0ZpbGVQYXRoIH0pXG4gICAgICAgICAgICBpZiAobGludGVyWyRyZXF1ZXN0TGFzdFJlY2VpdmVkXSA+PSBudW1iZXIgfHwgIWxpbnRlclskYWN0aXZhdGVkXSB8fCAoc3RhdHVzQnVmZmVyICYmICFzdGF0dXNCdWZmZXIuaXNBbGl2ZSgpKSkge1xuICAgICAgICAgICAgICByZXR1cm5cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGxpbnRlclskcmVxdWVzdExhc3RSZWNlaXZlZF0gPSBudW1iZXJcbiAgICAgICAgICAgIGlmIChzdGF0dXNCdWZmZXIgJiYgIXN0YXR1c0J1ZmZlci5pc0FsaXZlKCkpIHtcbiAgICAgICAgICAgICAgcmV0dXJuXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChtZXNzYWdlcyA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAvLyBOT1RFOiBEbyBOT1QgdXBkYXRlIHRoZSBtZXNzYWdlcyB3aGVuIHByb3ZpZGVycyByZXR1cm4gbnVsbFxuICAgICAgICAgICAgICByZXR1cm5cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbGV0IHZhbGlkaXR5ID0gdHJ1ZVxuICAgICAgICAgICAgLy8gTk9URTogV2UgYXJlIGNhbGxpbmcgaXQgd2hlbiByZXN1bHRzIGFyZSBub3QgYW4gYXJyYXkgdG8gc2hvdyBhIG5pY2Ugbm90aWZpY2F0aW9uXG4gICAgICAgICAgICBpZiAoYXRvbS5pbkRldk1vZGUoKSB8fCAhQXJyYXkuaXNBcnJheShtZXNzYWdlcykpIHtcbiAgICAgICAgICAgICAgdmFsaWRpdHkgPSBWYWxpZGF0ZS5tZXNzYWdlcyhsaW50ZXIubmFtZSwgbWVzc2FnZXMpXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIXZhbGlkaXR5KSB7XG4gICAgICAgICAgICAgIHJldHVyblxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBIZWxwZXJzLm5vcm1hbGl6ZU1lc3NhZ2VzKGxpbnRlci5uYW1lLCBtZXNzYWdlcylcbiAgICAgICAgICAgIHRoaXMuZW1pdHRlci5lbWl0KCdkaWQtdXBkYXRlLW1lc3NhZ2VzJywgeyBtZXNzYWdlcywgbGludGVyLCBidWZmZXI6IHN0YXR1c0J1ZmZlciB9KVxuICAgICAgICAgIH0sXG4gICAgICAgICAgZXJyb3IgPT4ge1xuICAgICAgICAgICAgdGhpcy5lbWl0dGVyLmVtaXQoJ2RpZC1maW5pc2gtbGludGluZycsIHsgbnVtYmVyLCBsaW50ZXIsIGZpbGVQYXRoOiBzdGF0dXNGaWxlUGF0aCB9KVxuXG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGBbTGludGVyXSBFcnJvciBydW5uaW5nICR7bGludGVyLm5hbWV9YCwgZXJyb3IpXG4gICAgICAgICAgICBjb25zdCBub3RpZmljYXRpb25NZXNzYWdlID0gYFtMaW50ZXJdIEVycm9yIHJ1bm5pbmcgJHtsaW50ZXIubmFtZX1gXG4gICAgICAgICAgICBpZiAoQXJyYXkuZnJvbSh0aGlzLmFjdGl2ZU5vdGlmaWNhdGlvbnMpLnNvbWUoaXRlbSA9PiBpdGVtLmdldE9wdGlvbnMoKS5kZXRhaWwgPT09IG5vdGlmaWNhdGlvbk1lc3NhZ2UpKSB7XG4gICAgICAgICAgICAgIC8vIFRoaXMgbWVzc2FnZSBpcyBzdGlsbCBzaG93aW5nIHRvIHRoZSB1c2VyIVxuICAgICAgICAgICAgICByZXR1cm5cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3Qgbm90aWZpY2F0aW9uID0gYXRvbS5ub3RpZmljYXRpb25zLmFkZEVycm9yKG5vdGlmaWNhdGlvbk1lc3NhZ2UsIHtcbiAgICAgICAgICAgICAgZGV0YWlsOiAnU2VlIENvbnNvbGUgZm9yIG1vcmUgaW5mby4nLFxuICAgICAgICAgICAgICBkaXNtaXNzYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgYnV0dG9uczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgIHRleHQ6ICdPcGVuIENvbnNvbGUnLFxuICAgICAgICAgICAgICAgICAgb25EaWRDbGljazogKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBhdG9tLm9wZW5EZXZUb29scygpXG4gICAgICAgICAgICAgICAgICAgIG5vdGlmaWNhdGlvbi5kaXNtaXNzKClcbiAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICB0ZXh0OiAnQ2FuY2VsJyxcbiAgICAgICAgICAgICAgICAgIG9uRGlkQ2xpY2s6ICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgbm90aWZpY2F0aW9uLmRpc21pc3MoKVxuICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSlcbiAgICAgICAgICB9LFxuICAgICAgICApLFxuICAgICAgKVxuICAgIH1cblxuICAgIGF3YWl0IFByb21pc2UuYWxsKHByb21pc2VzKVxuICAgIHJldHVybiB0cnVlXG4gIH1cbiAgb25EaWRVcGRhdGVNZXNzYWdlcyhjYWxsYmFjazogRnVuY3Rpb24pOiBEaXNwb3NhYmxlIHtcbiAgICByZXR1cm4gdGhpcy5lbWl0dGVyLm9uKCdkaWQtdXBkYXRlLW1lc3NhZ2VzJywgY2FsbGJhY2spXG4gIH1cbiAgb25EaWRCZWdpbkxpbnRpbmcoY2FsbGJhY2s6IEZ1bmN0aW9uKTogRGlzcG9zYWJsZSB7XG4gICAgcmV0dXJuIHRoaXMuZW1pdHRlci5vbignZGlkLWJlZ2luLWxpbnRpbmcnLCBjYWxsYmFjaylcbiAgfVxuICBvbkRpZEZpbmlzaExpbnRpbmcoY2FsbGJhY2s6IEZ1bmN0aW9uKTogRGlzcG9zYWJsZSB7XG4gICAgcmV0dXJuIHRoaXMuZW1pdHRlci5vbignZGlkLWZpbmlzaC1saW50aW5nJywgY2FsbGJhY2spXG4gIH1cbiAgZGlzcG9zZSgpIHtcbiAgICB0aGlzLmFjdGl2ZU5vdGlmaWNhdGlvbnMuZm9yRWFjaChub3RpZmljYXRpb24gPT4gbm90aWZpY2F0aW9uLmRpc21pc3MoKSlcbiAgICB0aGlzLmFjdGl2ZU5vdGlmaWNhdGlvbnMuY2xlYXIoKVxuICAgIHRoaXMubGludGVycy5jbGVhcigpXG4gICAgdGhpcy5zdWJzY3JpcHRpb25zLmRpc3Bvc2UoKVxuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IExpbnRlclJlZ2lzdHJ5XG4iXX0=