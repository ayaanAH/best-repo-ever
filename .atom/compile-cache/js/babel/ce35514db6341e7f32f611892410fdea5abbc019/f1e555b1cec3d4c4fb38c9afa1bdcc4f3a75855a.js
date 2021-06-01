Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _jscsLibCliConfig = require('jscs/lib/cli-config');

var _jscsLibCliConfig2 = _interopRequireDefault(_jscsLibCliConfig);

var _jscsLibExtractJs = require('jscs/lib/extract-js');

var _jscsLibExtractJs2 = _interopRequireDefault(_jscsLibExtractJs);

var _globule = require('globule');

var _globule2 = _interopRequireDefault(_globule);

var _objectAssign = require('object-assign');

var _objectAssign2 = _interopRequireDefault(_objectAssign);

// eslint-disable-next-line import/extensions, import/no-extraneous-dependencies

var _atom = require('atom');

// Internal variables
'use babel';

var grammarScopes = ['source.js', 'source.js.jsx', 'text.html.basic'];
var preset = undefined;
var onlyConfig = undefined;
var fixOnSave = undefined;
var displayAs = undefined;
var configPath = undefined;
var JSCS = undefined;
var jscs = undefined;

function startMeasure(baseName) {
  performance.mark(baseName + '-start');
}

function endMeasure(baseName) {
  if (atom.inDevMode()) {
    performance.mark(baseName + '-end');
    performance.measure(baseName, baseName + '-start', baseName + '-end');
    // eslint-disable-next-line no-console
    console.log(baseName + ' took: ', performance.getEntriesByName(baseName)[0].duration);
    performance.clearMarks(baseName + '-end');
    performance.clearMeasures(baseName);
  }
  performance.clearMarks(baseName + '-start');
}

function getFilePath(file) {
  var relative = atom.project.relativizePath(file);
  return relative[1];
}

function getConfig(filePath) {
  var config = undefined;
  if (_path2['default'].isAbsolute(configPath)) {
    config = _jscsLibCliConfig2['default'].load(false, configPath);
  } else if (filePath) {
    config = _jscsLibCliConfig2['default'].load(false, _path2['default'].join(_path2['default'].dirname(filePath), configPath));
  }

  if (!config && onlyConfig) {
    return undefined;
  }

  // Options passed to `jscs` from package configuration
  var options = {};
  var newConfig = (0, _objectAssign2['default'])(options, config || { preset: preset });
  // `configPath` is non-enumerable so `Object.assign` won't copy it.
  // Without a proper `configPath` JSCS plugs cannot be loaded. See #175.
  if (!newConfig.configPath && config && config.configPath) {
    newConfig.configPath = config.configPath;
  }
  return newConfig;
}

function fixString(editor) {
  startMeasure('linter-jscs: Fix');
  var editorPath = editor.getPath();
  var config = getConfig(editorPath);
  if (!config) {
    return;
  }

  // Load JSCS if it hasn't already been loaded
  if (!JSCS) {
    JSCS = require('jscs');
  }

  // We need re-initialize JSCS before every lint
  // or it will looses the errors, didn't trace the error
  // must be something with new 2.0.0 JSCS
  jscs = new JSCS();
  jscs.registerDefaultRules();
  jscs.configure(config);

  var editorText = editor.getText();
  var fixedText = jscs.fixString(editorText, editorPath).output;
  if (editorText === fixedText) {
    return;
  }

  var cursorPosition = editor.getCursorScreenPosition();
  editor.setText(fixedText);
  editor.setCursorScreenPosition(cursorPosition);
  endMeasure('linter-jscs: Fix');
}

exports['default'] = {
  config: {
    preset: {
      title: 'Preset',
      description: 'Preset option is ignored if a config file is found for the linter.',
      type: 'string',
      'default': 'airbnb',
      'enum': ['airbnb', 'crockford', 'google', 'grunt', 'idiomatic', 'jquery', 'mdcs', 'node-style-guide', 'wikimedia', 'wordpress']
    },
    onlyConfig: {
      title: 'Only Config',
      description: 'Disable linter if there is no config file found for the linter.',
      type: 'boolean',
      'default': false
    },
    fixOnSave: {
      title: 'Fix on save',
      description: 'Fix JavaScript on save',
      type: 'boolean',
      'default': false
    },
    displayAs: {
      title: 'Display errors as',
      type: 'string',
      'default': 'error',
      'enum': ['error', 'warning']
    },
    configPath: {
      title: 'Config file path (Absolute or relative path to your project)',
      type: 'string',
      'default': ''
    }
  },

  activate: function activate() {
    var _this = this;

    // Install dependencies using atom-package-deps
    require('atom-package-deps').install('linter-jscs');

    this.subscriptions = new _atom.CompositeDisposable();

    this.subscriptions.add(atom.config.observe('linter-jscs.preset', function (value) {
      preset = value;
    }));

    this.subscriptions.add(atom.config.observe('linter-jscs.onlyConfig', function (value) {
      onlyConfig = value;
    }));

    this.subscriptions.add(atom.config.observe('linter-jscs.fixOnSave', function (value) {
      fixOnSave = value;
    }));

    this.subscriptions.add(atom.config.observe('linter-jscs.displayAs', function (value) {
      displayAs = value;
    }));

    this.subscriptions.add(atom.config.observe('linter-jscs.configPath', function (value) {
      configPath = value;
    }));

    this.editorDisposables = new Map();
    this.subscriptions.add(atom.workspace.observeTextEditors(function (editor) {
      if (!atom.workspace.isTextEditor(editor)) {
        // Make sure we are dealing with a real editor...
        return;
      }
      var filePath = editor.getPath();
      if (!filePath) {
        // Editor has never been saved, and thus has no path, just return for now.
        return;
      }
      // Now we can handle multiple events for this editor
      var editorHandlers = new _atom.CompositeDisposable();
      _this.editorDisposables.set(editor.id, editorHandlers);
      // Fix before saving
      editorHandlers.add(editor.getBuffer().onWillSave(function () {
        var scope = editor.getGrammar().scopeName;
        if (atom.workspace.getActiveTextEditor().id === editor.id && grammarScopes.indexOf(scope) !== -1 && scope !== 'text.html.basic' || _this.testFixOnSave) {
          // Exclude `excludeFiles` for fix on save
          var config = getConfig(filePath);
          var exclude = _globule2['default'].isMatch(config && config.excludeFiles, getFilePath(filePath));

          if (fixOnSave && !exclude || _this.testFixOnSave) {
            fixString(editor);
          }
        }
      }));
      // Remove all disposables associated with this editor
      editorHandlers.add(editor.onDidDestroy(function () {
        editorHandlers.dispose();
        _this.editorDisposables['delete'](editor.id);
      }));
    }));

    this.subscriptions.add(atom.commands.add('atom-text-editor', {
      'linter-jscs:fix-file': function linterJscsFixFile() {
        var textEditor = atom.workspace.getActiveTextEditor();

        if (!textEditor) {
          atom.notifications.addError('Linter-jscs: invalid textEditor received, aborting.');
          return;
        }

        fixString(textEditor);
      }
    }));
  },

  deactivate: function deactivate() {
    this.subscriptions.dispose();
    this.editorDisposables.forEach(function (editor) {
      return editor.dispose();
    });
  },

  provideLinter: function provideLinter() {
    var _this2 = this;

    var helpers = require('atom-linter');

    return {
      name: 'JSCS',
      grammarScopes: grammarScopes,
      scope: 'file',
      lintsOnChange: true,
      lint: function lint(editor, opts, overrideOptions, testFixOnSave) {
        startMeasure('linter-jscs: Lint');

        // Load JSCS if it hasn't already been loaded
        if (!JSCS) {
          JSCS = require('jscs');
        }

        // Set only by specs
        _this2.testFixOnSave = testFixOnSave;

        var filePath = editor.getPath();
        var config = getConfig(filePath);

        // We don't have a config file present in project directory
        // let's return an empty array of errors
        if (!config) {
          endMeasure('linter-jscs: Lint');
          return Promise.resolve([]);
        }

        // Exclude `excludeFiles` for errors
        var exclude = _globule2['default'].isMatch(config && config.excludeFiles, getFilePath(editor.getPath()));
        if (exclude) {
          endMeasure('linter-jscs: Lint');
          return Promise.resolve([]);
        }

        // We need re-initialize JSCS before every lint
        // or it will looses the errors, didn't trace the error
        // must be something with new 2.0.0 JSCS
        jscs = new JSCS();
        jscs.registerDefaultRules();

        var jscsConfig = overrideOptions || config;
        jscs.configure(jscsConfig);

        var text = editor.getText();
        var scope = editor.getGrammar().scopeName;

        var errors = undefined;
        // text.plain.null-grammar is temp for tests
        startMeasure('linter-jscs: JSCS');
        if (scope === 'text.html.basic' || scope === 'text.plain.null-grammar') {
          (function () {
            var result = (0, _jscsLibExtractJs2['default'])(filePath, text);

            result.sources.forEach(function (script) {
              jscs.checkString(script.source, filePath).getErrorList().forEach(function (error) {
                var err = error;
                err.line += script.line;
                err.column += script.offset;
                result.addError(err);
              });
            }, _this2);

            errors = result.errors.getErrorList();
          })();
        } else {
          errors = jscs.checkString(text, filePath).getErrorList();
        }
        endMeasure('linter-jscs: JSCS');

        var translatedErrors = errors.map(function (_ref) {
          var message = _ref.message;
          var line = _ref.line;
          var column = _ref.column;
          return {
            severity: displayAs,
            excerpt: message,
            location: {
              file: filePath,
              position: helpers.generateRange(editor, line - 1, column - 1)
            }
          };
        });
        endMeasure('linter-jscs: Lint');
        return Promise.resolve(translatedErrors);
      }
    };
  }
};
module.exports = exports['default'];
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9heWFhbmtoYW4vLmF0b20vcGFja2FnZXMvbGludGVyLWpzY3Mvc3JjL2xpbnRlci1qc2NzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztvQkFFaUIsTUFBTTs7OztnQ0FDQSxxQkFBcUI7Ozs7Z0NBQ3RCLHFCQUFxQjs7Ozt1QkFDdkIsU0FBUzs7Ozs0QkFDSixlQUFlOzs7Ozs7b0JBRUosTUFBTTs7O0FBUjFDLFdBQVcsQ0FBQzs7QUFXWixJQUFNLGFBQWEsR0FBRyxDQUFDLFdBQVcsRUFBRSxlQUFlLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztBQUN4RSxJQUFJLE1BQU0sWUFBQSxDQUFDO0FBQ1gsSUFBSSxVQUFVLFlBQUEsQ0FBQztBQUNmLElBQUksU0FBUyxZQUFBLENBQUM7QUFDZCxJQUFJLFNBQVMsWUFBQSxDQUFDO0FBQ2QsSUFBSSxVQUFVLFlBQUEsQ0FBQztBQUNmLElBQUksSUFBSSxZQUFBLENBQUM7QUFDVCxJQUFJLElBQUksWUFBQSxDQUFDOztBQUVULFNBQVMsWUFBWSxDQUFDLFFBQVEsRUFBRTtBQUM5QixhQUFXLENBQUMsSUFBSSxDQUFJLFFBQVEsWUFBUyxDQUFDO0NBQ3ZDOztBQUVELFNBQVMsVUFBVSxDQUFDLFFBQVEsRUFBRTtBQUM1QixNQUFJLElBQUksQ0FBQyxTQUFTLEVBQUUsRUFBRTtBQUNwQixlQUFXLENBQUMsSUFBSSxDQUFJLFFBQVEsVUFBTyxDQUFDO0FBQ3BDLGVBQVcsQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFLLFFBQVEsYUFBYSxRQUFRLFVBQU8sQ0FBQzs7QUFFdEUsV0FBTyxDQUFDLEdBQUcsQ0FBSSxRQUFRLGNBQVcsV0FBVyxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQ3RGLGVBQVcsQ0FBQyxVQUFVLENBQUksUUFBUSxVQUFPLENBQUM7QUFDMUMsZUFBVyxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQztH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LEVBQUUsUUFBUSxDQUFDLENBQzNCLFlBQVksRUFBRSxDQUFDO1NBQ25CO0FBQ0Qsa0JBQVUsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDOztBQUVoQyxZQUFNLGdCQUFnQixHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsVUFBQyxJQUVwQztjQURDLE9BQU8sR0FENEIsSUFFcEMsQ0FEQyxPQUFPO2NBQUUsSUFBSSxHQURzQixJQUVwQyxDQURVLElBQUk7Y0FBRSxNQUFNLEdBRGMsSUFFcEMsQ0FEZ0IsTUFBTTtpQkFDaEI7QUFDTCxvQkFBUSxFQUFFLFNBQVM7QUFDbkIsbUJBQU8sRUFBRSxPQUFPO0FBQ2hCLG9CQUFRLEVBQUU7QUFDUixrQkFBSSxFQUFFLFFBQVE7QUFDZCxzQkFBUSxFQUFFLE9BQU8sQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFLElBQUksR0FBRyxDQUFDLEVBQUUsTUFBTSxHQUFHLENBQUMsQ0FBQzthQUM5RDtXQUNGO1NBQUMsQ0FBQyxDQUFDO0FBQ0osa0JBQVUsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO0FBQ2hDLGVBQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO09BQzFDO0tBQ0YsQ0FBQztHQUNIO0NBQ0YiLCJmaWxlIjoiL1VzZXJzL2F5YWFua2hhbi8uYXRvbS9wYWNrYWdlcy9saW50ZXItanNjcy9zcmMvbGludGVyLWpzY3MuanMiLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIGJhYmVsJztcblxuaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgY29uZmlnRmlsZSBmcm9tICdqc2NzL2xpYi9jbGktY29uZmlnJztcbmltcG9ydCBleHRyYWN0SnMgZnJvbSAnanNjcy9saWIvZXh0cmFjdC1qcyc7XG5pbXBvcnQgZ2xvYnVsZSBmcm9tICdnbG9idWxlJztcbmltcG9ydCBvYmplY3RBc3NpZ24gZnJvbSAnb2JqZWN0LWFzc2lnbic7XG4vLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgaW1wb3J0L2V4dGVuc2lvbnMsIGltcG9ydC9uby1leHRyYW5lb3VzLWRlcGVuZGVuY2llc1xuaW1wb3J0IHsgQ29tcG9zaXRlRGlzcG9zYWJsZSB9IGZyb20gJ2F0b20nO1xuXG4vLyBJbnRlcm5hbCB2YXJpYWJsZXNcbmNvbnN0IGdyYW1tYXJTY29wZXMgPSBbJ3NvdXJjZS5qcycsICdzb3VyY2UuanMuanN4JywgJ3RleHQuaHRtbC5iYXNpYyddO1xubGV0IHByZXNldDtcbmxldCBvbmx5Q29uZmlnO1xubGV0IGZpeE9uU2F2ZTtcbmxldCBkaXNwbGF5QXM7XG5sZXQgY29uZmlnUGF0aDtcbmxldCBKU0NTO1xubGV0IGpzY3M7XG5cbmZ1bmN0aW9uIHN0YXJ0TWVhc3VyZShiYXNlTmFtZSkge1xuICBwZXJmb3JtYW5jZS5tYXJrKGAke2Jhc2VOYW1lfS1zdGFydGApO1xufVxuXG5mdW5jdGlvbiBlbmRNZWFzdXJlKGJhc2VOYW1lKSB7XG4gIGlmIChhdG9tLmluRGV2TW9kZSgpKSB7XG4gICAgcGVyZm9ybWFuY2UubWFyayhgJHtiYXNlTmFtZX0tZW5kYCk7XG4gICAgcGVyZm9ybWFuY2UubWVhc3VyZShiYXNlTmFtZSwgYCR7YmFzZU5hbWV9LXN0YXJ0YCwgYCR7YmFzZU5hbWV9LWVuZGApO1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coYCR7YmFzZU5hbWV9IHRvb2s6IGAsIHBlcmZvcm1hbmNlLmdldEVudHJpZXNCeU5hbWUoYmFzZU5hbWUpWzBdLmR1cmF0aW9uKTtcbiAgICBwZXJmb3JtYW5jZS5jbGVhck1hcmtzKGAke2Jhc2VOYW1lfS1lbmRgKTtcbiAgICBwZXJmb3JtYW5jZS5jbGVhck1lYXN1cmVzKGJhc2VOYW1lKTtcbiAgfVxuICBwZXJmb3JtYW5jZS5jbGVhck1hcmtzKGAke2Jhc2VOYW1lfS1zdGFydGApO1xufVxuXG5mdW5jdGlvbiBnZXRGaWxlUGF0aChmaWxlKSB7XG4gIGNvbnN0IHJlbGF0aXZlID0gYXRvbS5wcm9qZWN0LnJlbGF0aXZpemVQYXRoKGZpbGUpO1xuICByZXR1cm4gcmVsYXRpdmVbMV07XG59XG5cbmZ1bmN0aW9uIGdldENvbmZpZyhmaWxlUGF0aCkge1xuICBsZXQgY29uZmlnO1xuICBpZiAocGF0aC5pc0Fic29sdXRlKGNvbmZpZ1BhdGgpKSB7XG4gICAgY29uZmlnID0gY29uZmlnRmlsZS5sb2FkKGZhbHNlLCBjb25maWdQYXRoKTtcbiAgfSBlbHNlIGlmIChmaWxlUGF0aCkge1xuICAgIGNvbmZpZyA9IGNvbmZpZ0ZpbGUubG9hZChcbiAgICAgIGZhbHNlLFxuICAgICAgcGF0aC5qb2luKHBhdGguZGlybmFtZShmaWxlUGF0aCksIGNvbmZpZ1BhdGgpLFxuICAgICk7XG4gIH1cblxuICBpZiAoIWNvbmZpZyAmJiBvbmx5Q29uZmlnKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuXG4gIC8vIE9wdGlvbnMgcGFzc2VkIHRvIGBqc2NzYCBmcm9tIHBhY2thZ2UgY29uZmlndXJhdGlvblxuICBjb25zdCBvcHRpb25zID0ge307XG4gIGNvbnN0IG5ld0NvbmZpZyA9IG9iamVjdEFzc2lnbihcbiAgICBvcHRpb25zLFxuICAgIGNvbmZpZyB8fCB7IHByZXNldCB9LFxuICApO1xuICAvLyBgY29uZmlnUGF0aGAgaXMgbm9uLWVudW1lcmFibGUgc28gYE9iamVjdC5hc3NpZ25gIHdvbid0IGNvcHkgaXQuXG4gIC8vIFdpdGhvdXQgYSBwcm9wZXIgYGNvbmZpZ1BhdGhgIEpTQ1MgcGx1Z3MgY2Fubm90IGJlIGxvYWRlZC4gU2VlICMxNzUuXG4gIGlmICghbmV3Q29uZmlnLmNvbmZpZ1BhdGggJiYgY29uZmlnICYmIGNvbmZpZy5jb25maWdQYXRoKSB7XG4gICAgbmV3Q29uZmlnLmNvbmZpZ1BhdGggPSBjb25maWcuY29uZmlnUGF0aDtcbiAgfVxuICByZXR1cm4gbmV3Q29uZmlnO1xufVxuXG5mdW5jdGlvbiBmaXhTdHJpbmcoZWRpdG9yKSB7XG4gIHN0YXJ0TWVhc3VyZSgnbGludGVyLWpzY3M6IEZpeCcpO1xuICBjb25zdCBlZGl0b3JQYXRoID0gZWRpdG9yLmdldFBhdGgoKTtcbiAgY29uc3QgY29uZmlnID0gZ2V0Q29uZmlnKGVkaXRvclBhdGgpO1xuICBpZiAoIWNvbmZpZykge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIC8vIExvYWQgSlNDUyBpZiBpdCBoYXNuJ3QgYWxyZWFkeSBiZWVuIGxvYWRlZFxuICBpZiAoIUpTQ1MpIHtcbiAgICBKU0NTID0gcmVxdWlyZSgnanNjcycpO1xuICB9XG5cbiAgLy8gV2UgbmVlZCByZS1pbml0aWFsaXplIEpTQ1MgYmVmb3JlIGV2ZXJ5IGxpbnRcbiAgLy8gb3IgaXQgd2lsbCBsb29zZXMgdGhlIGVycm9ycywgZGlkbid0IHRyYWNlIHRoZSBlcnJvclxuICAvLyBtdXN0IGJlIHNvbWV0aGluZyB3aXRoIG5ldyAyLjAuMCBKU0NTXG4gIGpzY3MgPSBuZXcgSlNDUygpO1xuICBqc2NzLnJlZ2lzdGVyRGVmYXVsdFJ1bGVzKCk7XG4gIGpzY3MuY29uZmlndXJlKGNvbmZpZyk7XG5cbiAgY29uc3QgZWRpdG9yVGV4dCA9IGVkaXRvci5nZXRUZXh0KCk7XG4gIGNvbnN0IGZpeGVkVGV4dCA9IGpzY3MuZml4U3RyaW5nKGVkaXRvclRleHQsIGVkaXRvclBhdGgpLm91dHB1dDtcbiAgaWYgKGVkaXRvclRleHQgPT09IGZpeGVkVGV4dCkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGNvbnN0IGN1cnNvclBvc2l0aW9uID0gZWRpdG9yLmdldEN1cnNvclNjcmVlblBvc2l0aW9uKCk7XG4gIGVkaXRvci5zZXRUZXh0KGZpeGVkVGV4dCk7XG4gIGVkaXRvci5zZXRDdXJzb3JTY3JlZW5Qb3NpdGlvbihjdXJzb3JQb3NpdGlvbik7XG4gIGVuZE1lYXN1cmUoJ2xpbnRlci1qc2NzOiBGaXgnKTtcbn1cblxuZXhwb3J0IGRlZmF1bHQge1xuICBjb25maWc6IHtcbiAgICBwcmVzZXQ6IHtcbiAgICAgIHRpdGxlOiAnUHJlc2V0JyxcbiAgICAgIGRlc2NyaXB0aW9uOiAnUHJlc2V0IG9wdGlvbiBpcyBpZ25vcmVkIGlmIGEgY29uZmlnIGZpbGUgaXMgZm91bmQgZm9yIHRoZSBsaW50ZXIuJyxcbiAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgZGVmYXVsdDogJ2FpcmJuYicsXG4gICAgICBlbnVtOiBbXG4gICAgICAgICdhaXJibmInLCAnY3JvY2tmb3JkJywgJ2dvb2dsZScsICdncnVudCcsICdpZGlvbWF0aWMnLCAnanF1ZXJ5JywgJ21kY3MnLFxuICAgICAgICAnbm9kZS1zdHlsZS1ndWlkZScsICd3aWtpbWVkaWEnLCAnd29yZHByZXNzJyxcbiAgICAgIF0sXG4gICAgfSxcbiAgICBvbmx5Q29uZmlnOiB7XG4gICAgICB0aXRsZTogJ09ubHkgQ29uZmlnJyxcbiAgICAgIGRlc2NyaXB0aW9uOiAnRGlzYWJsZSBsaW50ZXIgaWYgdGhlcmUgaXMgbm8gY29uZmlnIGZpbGUgZm91bmQgZm9yIHRoZSBsaW50ZXIuJyxcbiAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgIGRlZmF1bHQ6IGZhbHNlLFxuICAgIH0sXG4gICAgZml4T25TYXZlOiB7XG4gICAgICB0aXRsZTogJ0ZpeCBvbiBzYXZlJyxcbiAgICAgIGRlc2NyaXB0aW9uOiAnRml4IEphdmFTY3JpcHQgb24gc2F2ZScsXG4gICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICBkZWZhdWx0OiBmYWxzZSxcbiAgICB9LFxuICAgIGRpc3BsYXlBczoge1xuICAgICAgdGl0bGU6ICdEaXNwbGF5IGVycm9ycyBhcycsXG4gICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgIGRlZmF1bHQ6ICdlcnJvcicsXG4gICAgICBlbnVtOiBbJ2Vycm9yJywgJ3dhcm5pbmcnXSxcbiAgICB9LFxuICAgIGNvbmZpZ1BhdGg6IHtcbiAgICAgIHRpdGxlOiAnQ29uZmlnIGZpbGUgcGF0aCAoQWJzb2x1dGUgb3IgcmVsYXRpdmUgcGF0aCB0byB5b3VyIHByb2plY3QpJyxcbiAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgZGVmYXVsdDogJycsXG4gICAgfSxcbiAgfSxcblxuICBhY3RpdmF0ZSgpIHtcbiAgICAvLyBJbnN0YWxsIGRlcGVuZGVuY2llcyB1c2luZyBhdG9tLXBhY2thZ2UtZGVwc1xuICAgIHJlcXVpcmUoJ2F0b20tcGFja2FnZS1kZXBzJykuaW5zdGFsbCgnbGludGVyLWpzY3MnKTtcblxuICAgIHRoaXMuc3Vic2NyaXB0aW9ucyA9IG5ldyBDb21wb3NpdGVEaXNwb3NhYmxlKCk7XG5cbiAgICB0aGlzLnN1YnNjcmlwdGlvbnMuYWRkKGF0b20uY29uZmlnLm9ic2VydmUoJ2xpbnRlci1qc2NzLnByZXNldCcsICh2YWx1ZSkgPT4ge1xuICAgICAgcHJlc2V0ID0gdmFsdWU7XG4gICAgfSkpO1xuXG4gICAgdGhpcy5zdWJzY3JpcHRpb25zLmFkZChhdG9tLmNvbmZpZy5vYnNlcnZlKCdsaW50ZXItanNjcy5vbmx5Q29uZmlnJywgKHZhbHVlKSA9PiB7XG4gICAgICBvbmx5Q29uZmlnID0gdmFsdWU7XG4gICAgfSkpO1xuXG4gICAgdGhpcy5zdWJzY3JpcHRpb25zLmFkZChhdG9tLmNvbmZpZy5vYnNlcnZlKCdsaW50ZXItanNjcy5maXhPblNhdmUnLCAodmFsdWUpID0+IHtcbiAgICAgIGZpeE9uU2F2ZSA9IHZhbHVlO1xuICAgIH0pKTtcblxuICAgIHRoaXMuc3Vic2NyaXB0aW9ucy5hZGQoYXRvbS5jb25maWcub2JzZXJ2ZSgnbGludGVyLWpzY3MuZGlzcGxheUFzJywgKHZhbHVlKSA9PiB7XG4gICAgICBkaXNwbGF5QXMgPSB2YWx1ZTtcbiAgICB9KSk7XG5cbiAgICB0aGlzLnN1YnNjcmlwdGlvbnMuYWRkKGF0b20uY29uZmlnLm9ic2VydmUoJ2xpbnRlci1qc2NzLmNvbmZpZ1BhdGgnLCAodmFsdWUpID0+IHtcbiAgICAgIGNvbmZpZ1BhdGggPSB2YWx1ZTtcbiAgICB9KSk7XG5cbiAgICB0aGlzLmVkaXRvckRpc3Bvc2FibGVzID0gbmV3IE1hcCgpO1xuICAgIHRoaXMuc3Vic2NyaXB0aW9ucy5hZGQoYXRvbS53b3Jrc3BhY2Uub2JzZXJ2ZVRleHRFZGl0b3JzKChlZGl0b3IpID0+IHtcbiAgICAgIGlmICghYXRvbS53b3Jrc3BhY2UuaXNUZXh0RWRpdG9yKGVkaXRvcikpIHtcbiAgICAgICAgLy8gTWFrZSBzdXJlIHdlIGFyZSBkZWFsaW5nIHdpdGggYSByZWFsIGVkaXRvci4uLlxuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBjb25zdCBmaWxlUGF0aCA9IGVkaXRvci5nZXRQYXRoKCk7XG4gICAgICBpZiAoIWZpbGVQYXRoKSB7XG4gICAgICAgIC8vIEVkaXRvciBoYXMgbmV2ZXIgYmVlbiBzYXZlZCwgYW5kIHRodXMgaGFzIG5vIHBhdGgsIGp1c3QgcmV0dXJuIGZvciBub3cuXG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIC8vIE5vdyB3ZSBjYW4gaGFuZGxlIG11bHRpcGxlIGV2ZW50cyBmb3IgdGhpcyBlZGl0b3JcbiAgICAgIGNvbnN0IGVkaXRvckhhbmRsZXJzID0gbmV3IENvbXBvc2l0ZURpc3Bvc2FibGUoKTtcbiAgICAgIHRoaXMuZWRpdG9yRGlzcG9zYWJsZXMuc2V0KGVkaXRvci5pZCwgZWRpdG9ySGFuZGxlcnMpO1xuICAgICAgLy8gRml4IGJlZm9yZSBzYXZpbmdcbiAgICAgIGVkaXRvckhhbmRsZXJzLmFkZChlZGl0b3IuZ2V0QnVmZmVyKCkub25XaWxsU2F2ZSgoKSA9PiB7XG4gICAgICAgIGNvbnN0IHNjb3BlID0gZWRpdG9yLmdldEdyYW1tYXIoKS5zY29wZU5hbWU7XG4gICAgICAgIGlmIChcbiAgICAgICAgICAoXG4gICAgICAgICAgICBhdG9tLndvcmtzcGFjZS5nZXRBY3RpdmVUZXh0RWRpdG9yKCkuaWQgPT09IGVkaXRvci5pZFxuICAgICAgICAgICAgJiYgKGdyYW1tYXJTY29wZXMuaW5kZXhPZihzY29wZSkgIT09IC0xICYmIHNjb3BlICE9PSAndGV4dC5odG1sLmJhc2ljJylcbiAgICAgICAgICApXG4gICAgICAgICAgfHwgdGhpcy50ZXN0Rml4T25TYXZlXG4gICAgICAgICkge1xuICAgICAgICAgIC8vIEV4Y2x1ZGUgYGV4Y2x1ZGVGaWxlc2AgZm9yIGZpeCBvbiBzYXZlXG4gICAgICAgICAgY29uc3QgY29uZmlnID0gZ2V0Q29uZmlnKGZpbGVQYXRoKTtcbiAgICAgICAgICBjb25zdCBleGNsdWRlID0gZ2xvYnVsZS5pc01hdGNoKFxuICAgICAgICAgICAgY29uZmlnICYmIGNvbmZpZy5leGNsdWRlRmlsZXMsXG4gICAgICAgICAgICBnZXRGaWxlUGF0aChmaWxlUGF0aCksXG4gICAgICAgICAgKTtcblxuICAgICAgICAgIGlmICgoZml4T25TYXZlICYmICFleGNsdWRlKSB8fCB0aGlzLnRlc3RGaXhPblNhdmUpIHtcbiAgICAgICAgICAgIGZpeFN0cmluZyhlZGl0b3IpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSkpO1xuICAgICAgLy8gUmVtb3ZlIGFsbCBkaXNwb3NhYmxlcyBhc3NvY2lhdGVkIHdpdGggdGhpcyBlZGl0b3JcbiAgICAgIGVkaXRvckhhbmRsZXJzLmFkZChlZGl0b3Iub25EaWREZXN0cm95KCgpID0+IHtcbiAgICAgICAgZWRpdG9ySGFuZGxlcnMuZGlzcG9zZSgpO1xuICAgICAgICB0aGlzLmVkaXRvckRpc3Bvc2FibGVzLmRlbGV0ZShlZGl0b3IuaWQpO1xuICAgICAgfSkpO1xuICAgIH0pKTtcblxuICAgIHRoaXMuc3Vic2NyaXB0aW9ucy5hZGQoYXRvbS5jb21tYW5kcy5hZGQoJ2F0b20tdGV4dC1lZGl0b3InLCB7XG4gICAgICAnbGludGVyLWpzY3M6Zml4LWZpbGUnOiAoKSA9PiB7XG4gICAgICAgIGNvbnN0IHRleHRFZGl0b3IgPSBhdG9tLndvcmtzcGFjZS5nZXRBY3RpdmVUZXh0RWRpdG9yKCk7XG5cbiAgICAgICAgaWYgKCF0ZXh0RWRpdG9yKSB7XG4gICAgICAgICAgYXRvbS5ub3RpZmljYXRpb25zLmFkZEVycm9yKCdMaW50ZXItanNjczogaW52YWxpZCB0ZXh0RWRpdG9yIHJlY2VpdmVkLCBhYm9ydGluZy4nKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBmaXhTdHJpbmcodGV4dEVkaXRvcik7XG4gICAgICB9LFxuICAgIH0pKTtcbiAgfSxcblxuICBkZWFjdGl2YXRlKCkge1xuICAgIHRoaXMuc3Vic2NyaXB0aW9ucy5kaXNwb3NlKCk7XG4gICAgdGhpcy5lZGl0b3JEaXNwb3NhYmxlcy5mb3JFYWNoKGVkaXRvciA9PiBlZGl0b3IuZGlzcG9zZSgpKTtcbiAgfSxcblxuICBwcm92aWRlTGludGVyKCkge1xuICAgIGNvbnN0IGhlbHBlcnMgPSByZXF1aXJlKCdhdG9tLWxpbnRlcicpO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIG5hbWU6ICdKU0NTJyxcbiAgICAgIGdyYW1tYXJTY29wZXMsXG4gICAgICBzY29wZTogJ2ZpbGUnLFxuICAgICAgbGludHNPbkNoYW5nZTogdHJ1ZSxcbiAgICAgIGxpbnQ6IChlZGl0b3IsIG9wdHMsIG92ZXJyaWRlT3B0aW9ucywgdGVzdEZpeE9uU2F2ZSkgPT4ge1xuICAgICAgICBzdGFydE1lYXN1cmUoJ2xpbnRlci1qc2NzOiBMaW50Jyk7XG5cbiAgICAgICAgLy8gTG9hZCBKU0NTIGlmIGl0IGhhc24ndCBhbHJlYWR5IGJlZW4gbG9hZGVkXG4gICAgICAgIGlmICghSlNDUykge1xuICAgICAgICAgIEpTQ1MgPSByZXF1aXJlKCdqc2NzJyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTZXQgb25seSBieSBzcGVjc1xuICAgICAgICB0aGlzLnRlc3RGaXhPblNhdmUgPSB0ZXN0Rml4T25TYXZlO1xuXG4gICAgICAgIGNvbnN0IGZpbGVQYXRoID0gZWRpdG9yLmdldFBhdGgoKTtcbiAgICAgICAgY29uc3QgY29uZmlnID0gZ2V0Q29uZmlnKGZpbGVQYXRoKTtcblxuICAgICAgICAvLyBXZSBkb24ndCBoYXZlIGEgY29uZmlnIGZpbGUgcHJlc2VudCBpbiBwcm9qZWN0IGRpcmVjdG9yeVxuICAgICAgICAvLyBsZXQncyByZXR1cm4gYW4gZW1wdHkgYXJyYXkgb2YgZXJyb3JzXG4gICAgICAgIGlmICghY29uZmlnKSB7XG4gICAgICAgICAgZW5kTWVhc3VyZSgnbGludGVyLWpzY3M6IExpbnQnKTtcbiAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKFtdKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEV4Y2x1ZGUgYGV4Y2x1ZGVGaWxlc2AgZm9yIGVycm9yc1xuICAgICAgICBjb25zdCBleGNsdWRlID0gZ2xvYnVsZS5pc01hdGNoKFxuICAgICAgICAgIGNvbmZpZyAmJiBjb25maWcuZXhjbHVkZUZpbGVzLFxuICAgICAgICAgIGdldEZpbGVQYXRoKGVkaXRvci5nZXRQYXRoKCkpLFxuICAgICAgICApO1xuICAgICAgICBpZiAoZXhjbHVkZSkge1xuICAgICAgICAgIGVuZE1lYXN1cmUoJ2xpbnRlci1qc2NzOiBMaW50Jyk7XG4gICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShbXSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBXZSBuZWVkIHJlLWluaXRpYWxpemUgSlNDUyBiZWZvcmUgZXZlcnkgbGludFxuICAgICAgICAvLyBvciBpdCB3aWxsIGxvb3NlcyB0aGUgZXJyb3JzLCBkaWRuJ3QgdHJhY2UgdGhlIGVycm9yXG4gICAgICAgIC8vIG11c3QgYmUgc29tZXRoaW5nIHdpdGggbmV3IDIuMC4wIEpTQ1NcbiAgICAgICAganNjcyA9IG5ldyBKU0NTKCk7XG4gICAgICAgIGpzY3MucmVnaXN0ZXJEZWZhdWx0UnVsZXMoKTtcblxuICAgICAgICBjb25zdCBqc2NzQ29uZmlnID0gb3ZlcnJpZGVPcHRpb25zIHx8IGNvbmZpZztcbiAgICAgICAganNjcy5jb25maWd1cmUoanNjc0NvbmZpZyk7XG5cbiAgICAgICAgY29uc3QgdGV4dCA9IGVkaXRvci5nZXRUZXh0KCk7XG4gICAgICAgIGNvbnN0IHNjb3BlID0gZWRpdG9yLmdldEdyYW1tYXIoKS5zY29wZU5hbWU7XG5cbiAgICAgICAgbGV0IGVycm9ycztcbiAgICAgICAgLy8gdGV4dC5wbGFpbi5udWxsLWdyYW1tYXIgaXMgdGVtcCBmb3IgdGVzdHNcbiAgICAgICAgc3RhcnRNZWFzdXJlKCdsaW50ZXItanNjczogSlNDUycpO1xuICAgICAgICBpZiAoc2NvcGUgPT09ICd0ZXh0Lmh0bWwuYmFzaWMnIHx8IHNjb3BlID09PSAndGV4dC5wbGFpbi5udWxsLWdyYW1tYXInKSB7XG4gICAgICAgICAgY29uc3QgcmVzdWx0ID0gZXh0cmFjdEpzKGZpbGVQYXRoLCB0ZXh0KTtcblxuICAgICAgICAgIHJlc3VsdC5zb3VyY2VzLmZvckVhY2goKHNjcmlwdCkgPT4ge1xuICAgICAgICAgICAganNjcy5jaGVja1N0cmluZyhzY3JpcHQuc291cmNlLCBmaWxlUGF0aCkuZ2V0RXJyb3JMaXN0KCkuZm9yRWFjaCgoZXJyb3IpID0+IHtcbiAgICAgICAgICAgICAgY29uc3QgZXJyID0gZXJyb3I7XG4gICAgICAgICAgICAgIGVyci5saW5lICs9IHNjcmlwdC5saW5lO1xuICAgICAgICAgICAgICBlcnIuY29sdW1uICs9IHNjcmlwdC5vZmZzZXQ7XG4gICAgICAgICAgICAgIHJlc3VsdC5hZGRFcnJvcihlcnIpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSwgdGhpcyk7XG5cbiAgICAgICAgICBlcnJvcnMgPSByZXN1bHQuZXJyb3JzLmdldEVycm9yTGlzdCgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGVycm9ycyA9IGpzY3NcbiAgICAgICAgICAgIC5jaGVja1N0cmluZyh0ZXh0LCBmaWxlUGF0aClcbiAgICAgICAgICAgIC5nZXRFcnJvckxpc3QoKTtcbiAgICAgICAgfVxuICAgICAgICBlbmRNZWFzdXJlKCdsaW50ZXItanNjczogSlNDUycpO1xuXG4gICAgICAgIGNvbnN0IHRyYW5zbGF0ZWRFcnJvcnMgPSBlcnJvcnMubWFwKCh7XG4gICAgICAgICAgbWVzc2FnZSwgbGluZSwgY29sdW1uLFxuICAgICAgICB9KSA9PiAoe1xuICAgICAgICAgIHNldmVyaXR5OiBkaXNwbGF5QXMsXG4gICAgICAgICAgZXhjZXJwdDogbWVzc2FnZSxcbiAgICAgICAgICBsb2NhdGlvbjoge1xuICAgICAgICAgICAgZmlsZTogZmlsZVBhdGgsXG4gICAgICAgICAgICBwb3NpdGlvbjogaGVscGVycy5nZW5lcmF0ZVJhbmdlKGVkaXRvciwgbGluZSAtIDEsIGNvbHVtbiAtIDEpLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0pKTtcbiAgICAgICAgZW5kTWVhc3VyZSgnbGludGVyLWpzY3M6IExpbnQnKTtcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh0cmFuc2xhdGVkRXJyb3JzKTtcbiAgICAgIH0sXG4gICAgfTtcbiAgfSxcbn07XG4iXX0=