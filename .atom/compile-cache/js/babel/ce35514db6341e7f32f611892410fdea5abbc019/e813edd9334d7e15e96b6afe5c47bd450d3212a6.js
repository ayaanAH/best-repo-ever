Object.defineProperty(exports, '__esModule', {
  value: true
});

var getJSHintVersion = _asyncToGenerator(function* (config) {
  var execPath = config.executablePath !== '' ? config.executablePath : _path2['default'].join(__dirname, '..', 'node_modules', 'jshint', 'bin', 'jshint');

  if (debugCache.has(execPath)) {
    return debugCache.get(execPath);
  }

  // NOTE: Yes, `jshint --version` gets output on STDERR...
  var jshintVersion = yield atomlinter.execNode(execPath, ['--version'], { stream: 'stderr' });
  debugCache.set(execPath, jshintVersion);
  return jshintVersion;
});

var getDebugInfo = _asyncToGenerator(function* () {
  var linterJSHintVersion = getPackageMeta().version;
  var config = atom.config.get('linter-jshint');
  var jshintVersion = yield getJSHintVersion(config);
  var hoursSinceRestart = Math.round(process.uptime() / 3600 * 10) / 10;
  var editorScopes = getEditorScopes();

  return {
    atomVersion: atom.getVersion(),
    linterJSHintVersion: linterJSHintVersion,
    linterJSHintConfig: config,
    jshintVersion: jshintVersion,
    hoursSinceRestart: hoursSinceRestart,
    platform: process.platform,
    editorScopes: editorScopes
  };
});

exports.getDebugInfo = getDebugInfo;

var generateDebugString = _asyncToGenerator(function* () {
  var debug = yield getDebugInfo();
  var details = ['Atom version: ' + debug.atomVersion, 'linter-jshint version: v' + debug.linterJSHintVersion, 'JSHint version: ' + debug.jshintVersion, 'Hours since last Atom restart: ' + debug.hoursSinceRestart, 'Platform: ' + debug.platform, 'Current file\'s scopes: ' + JSON.stringify(debug.editorScopes, null, 2), 'linter-jshint configuration: ' + JSON.stringify(debug.linterJSHintConfig, null, 2)];
  return details.join('\n');
}

/**
 * Finds the oldest open issue of the same title in this project's repository.
 * Results are cached for 1 hour.
 * @param  {string} issueTitle The issue title to search for
 * @return {string|null}       The URL of the found issue or null if none is found.
 */
);

exports.generateDebugString = generateDebugString;

var findSimilarIssue = _asyncToGenerator(function* (issueTitle) {
  if (debugCache.has(issueTitle)) {
    var oldResult = debugCache.get(issueTitle);
    if (new Date().valueOf() < oldResult.expires) {
      return oldResult.url;
    }
    debugCache['delete'](issueTitle);
  }

  var oneHour = 1000 * 60 * 60; // ms * s * m
  var tenMinutes = 1000 * 60 * 10; // ms * s * m
  var repoUrl = getPackageMeta().repository.url;
  var repo = repoUrl.replace(/https?:\/\/(\d+\.)?github\.com\//gi, '');
  var query = encodeURIComponent('repo:' + repo + ' is:open in:title ' + issueTitle);
  var githubHeaders = new Headers({
    accept: 'application/vnd.github.v3+json',
    contentType: 'application/json'
  });
  var queryUrl = 'https://api.github.com/search/issues?q=' + query + '&sort=created&order=asc';

  var url = null;
  try {
    var rawResponse = yield fetch(queryUrl, { headers: githubHeaders });
    if (!rawResponse.ok) {
      // Querying GitHub API failed, don't try again for 10 minutes.
      debugCache.set(issueTitle, {
        expires: new Date().valueOf() + tenMinutes,
        url: url
      });
      return null;
    }
    var data = yield rawResponse.json();
    if ((data !== null ? data.items : null) !== null) {
      if (Array.isArray(data.items) && data.items.length > 0) {
        var issue = data.items[0];
        if (issue.title.includes(issueTitle)) {
          url = repoUrl + '/issues/' + issue.number;
        }
      }
    }
  } catch (e) {
    // Do nothing
  }
  debugCache.set(issueTitle, {
    expires: new Date().valueOf() + oneHour,
    url: url
  });
  return url;
});

var generateInvalidTrace = _asyncToGenerator(function* (msgLine, msgCol, file, textEditor, error) {
  var errMsgRange = msgLine + 1 + ':' + msgCol;
  var rangeText = 'Requested point: ' + errMsgRange;
  var packageRepoUrl = getPackageMeta().repository.url;
  var issueURL = packageRepoUrl + '/issues/new';
  var titleText = 'Invalid position given by \'' + error.code + '\'';
  var invalidMessage = {
    severity: 'error',
    description: 'Original message: ' + error.code + ' - ' + error.reason + '  \n' + rangeText + '.',
    location: {
      file: file,
      position: atomlinter.generateRange(textEditor)
    }
  };
  var similarIssueUrl = yield findSimilarIssue(titleText);
  if (similarIssueUrl !== null) {
    invalidMessage.excerpt = titleText + '. This has already been reported, see message link!';
    invalidMessage.url = similarIssueUrl;
    return invalidMessage;
  }

  var title = encodeURIComponent(titleText);
  var body = encodeURIComponent(['JSHint returned a point that did not exist in the document being edited.', 'Rule: `' + error.code + '`', rangeText, '', '', '<!-- If at all possible, please include code to reproduce this issue! -->', '', '', 'Debug information:', '```', yield generateDebugString(), '```'].join('\n'));
  var newIssueURL = issueURL + '?title=' + title + '&body=' + body;
  invalidMessage.excerpt = titleText + '. Please report this using the message link!';
  invalidMessage.url = newIssueURL;
  return invalidMessage;
});

exports.generateInvalidTrace = generateInvalidTrace;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { var callNext = step.bind(null, 'next'); var callThrow = step.bind(null, 'throw'); function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(callNext, callThrow); } } callNext(); }); }; }

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _os = require('os');

var _shelljs = require('shelljs');

var _minimatch = require('minimatch');

var _minimatch2 = _interopRequireDefault(_minimatch);

var _atomLinter = require('atom-linter');

var atomlinter = _interopRequireWildcard(_atomLinter);

var _fs = require('fs');

// eslint-disable-next-line import/extensions, import/no-extraneous-dependencies
'use babel';

var homeConfigPath = undefined;
var debugCache = new Map();

var readFile = _asyncToGenerator(function* (filePath) {
  return new Promise(function (resolve, reject) {
    (0, _fs.readFile)(filePath, 'utf8', function (err, data) {
      if (err) {
        reject(err);
      }
      resolve(data);
    });
  });
});

var isIgnored = _asyncToGenerator(function* (filePath, ignorePath) {
  var fileDir = _path2['default'].dirname(filePath);
  var rawIgnoreList = (yield readFile(ignorePath)).split(/[\r\n]/);

  // "Fix" the patterns in the same way JSHint does
  var ignoreList = rawIgnoreList.filter(function (line) {
    return !!line.trim();
  }).map(function (pattern) {
    if (pattern.startsWith('!')) {
      return '!' + _path2['default'].resolve(fileDir, pattern.substr(1).trim());
    }
    return _path2['default'].join(fileDir, pattern.trim());
  });

  // Check the modified patterns
  // NOTE: This is what JSHint actually does, not what the documentation says
  return ignoreList.some(function (pattern) {
    // Check the modified pattern against the path using minimatch
    if ((0, _minimatch2['default'])(filePath, pattern, { nocase: true })) {
      return true;
    }

    // Check if a pattern matches filePath exactly
    if (_path2['default'].resolve(filePath) === pattern) {
      return true;
    }

    // Check using `test -d` for directory exclusions
    if ((0, _shelljs.test)('-d', filePath) && pattern.match(/^[^/\\]*[/\\]?$/) && filePath.match(new RegExp('^' + pattern + '.*'))) {
      return true;
    }

    return false;
  });
});

exports.isIgnored = isIgnored;
var fileExists = _asyncToGenerator(function* (checkPath) {
  return new Promise(function (resolve) {
    (0, _fs.access)(checkPath, function (err) {
      if (err) {
        resolve(false);
      }
      resolve(true);
    });
  });
});

var hasHomeConfig = _asyncToGenerator(function* () {
  if (!homeConfigPath) {
    homeConfigPath = _path2['default'].join((0, _os.homedir)(), '.jshintrc');
  }
  return fileExists(homeConfigPath);
});

exports.hasHomeConfig = hasHomeConfig;
function getPackageMeta() {
  // NOTE: This is using a non-public property of the Package object
  // The alternative to this would basically mean re-implementing the parsing
  // that Atom is already doing anyway, and as this is unlikely to change this
  // is likely safe to use.
  return atom.packages.getLoadedPackage('linter-jshint').metadata;
}

function getEditorScopes() {
  var textEditor = atom.workspace.getActiveTextEditor();
  var editorScopes = undefined;
  if (atom.workspace.isTextEditor(textEditor)) {
    editorScopes = textEditor.getLastCursor().getScopeDescriptor().getScopesArray();
  } else {
    // Somehow this can be called with no active TextEditor, impossible I know...
    editorScopes = ['unknown'];
  }
  return editorScopes;
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9heWFhbmtoYW4vLmF0b20vcGFja2FnZXMvbGludGVyLWpzaGludC9saWIvaGVscGVycy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7O0lBcUZlLGdCQUFnQixxQkFBL0IsV0FBZ0MsTUFBTSxFQUFFO0FBQ3RDLE1BQU0sUUFBUSxHQUFHLE1BQU0sQ0FBQyxjQUFjLEtBQUssRUFBRSxHQUFHLE1BQU0sQ0FBQyxjQUFjLEdBQ2pFLGtCQUFLLElBQUksQ0FBQyxTQUFTLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLFFBQVEsQ0FBQyxDQUFDOztBQUUxRSxNQUFJLFVBQVUsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUU7QUFDNUIsV0FBTyxVQUFVLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0dBQ2pDOzs7QUFHRCxNQUFNLGFBQWEsR0FBRyxNQUFNLFVBQVUsQ0FBQyxRQUFRLENBQzdDLFFBQVEsRUFDUixDQUFDLFdBQVcsQ0FBQyxFQUNiLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxDQUNyQixDQUFDO0FBQ0YsWUFBVSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsYUFBYSxDQUFDLENBQUM7QUFDeEMsU0FBTyxhQUFhLENBQUM7Q0FDdEI7O0lBY3FCLFlBQVkscUJBQTNCLGFBQThCO0FBQ25DLE1BQU0sbUJBQW1CLEdBQUcsY0FBYyxFQUFFLENBQUMsT0FBTyxDQUFDO0FBQ3JELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0FBQ2hELE1BQU0sYUFBYSxHQUFHLE1BQU0sZ0JBQWdCLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDckQsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEFBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxHQUFHLElBQUksR0FBSSxFQUFFLENBQUMsR0FBRyxFQUFFLENBQUM7QUFDMUUs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LFNBQVMsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO0FBQ3hELE1BQUksWUFBMkIsWUFBQSxDQUFDO0FBQ2hDLE1BQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLEVBQUU7QUFDM0MsZ0JBQVksR0FBRyxVQUFVLENBQUMsYUFBYSxFQUFFLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxjQUFjLEVBQUUsQ0FBQztHQUNqRixNQUFNOztBQUVMLGdCQUFZLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQztHQUM1QjtBQUNELFNBQU8sWUFBWSxDQUFDO0NBQ3JCIiwiZmlsZSI6Ii9Vc2Vycy9heWFhbmtoYW4vLmF0b20vcGFja2FnZXMvbGludGVyLWpzaGludC9saWIvaGVscGVycy5qcyIsInNvdXJjZXNDb250ZW50IjpbIid1c2UgYmFiZWwnO1xuXG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IGhvbWVkaXIgfSBmcm9tICdvcyc7XG5pbXBvcnQgeyB0ZXN0IGFzIHNoanNUZXN0IH0gZnJvbSAnc2hlbGxqcyc7XG5pbXBvcnQgbWluaW1hdGNoIGZyb20gJ21pbmltYXRjaCc7XG5pbXBvcnQgKiBhcyBhdG9tbGludGVyIGZyb20gJ2F0b20tbGludGVyJztcbmltcG9ydCB7IHJlYWRGaWxlIGFzIGZzUmVhZEZpbGUsIGFjY2VzcyB9IGZyb20gJ2ZzJztcbi8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBpbXBvcnQvZXh0ZW5zaW9ucywgaW1wb3J0L25vLWV4dHJhbmVvdXMtZGVwZW5kZW5jaWVzXG5pbXBvcnQgdHlwZSB7IFRleHRFZGl0b3IgfSBmcm9tICdhdG9tJztcblxubGV0IGhvbWVDb25maWdQYXRoO1xuY29uc3QgZGVidWdDYWNoZSA9IG5ldyBNYXAoKTtcblxuY29uc3QgcmVhZEZpbGUgPSBhc3luYyBmaWxlUGF0aCA9PiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gIGZzUmVhZEZpbGUoZmlsZVBhdGgsICd1dGY4JywgKGVyciwgZGF0YSkgPT4ge1xuICAgIGlmIChlcnIpIHtcbiAgICAgIHJlamVjdChlcnIpO1xuICAgIH1cbiAgICByZXNvbHZlKGRhdGEpO1xuICB9KTtcbn0pO1xuXG5leHBvcnQgY29uc3QgaXNJZ25vcmVkID0gYXN5bmMgKGZpbGVQYXRoLCBpZ25vcmVQYXRoKSA9PiB7XG4gIGNvbnN0IGZpbGVEaXIgPSBwYXRoLmRpcm5hbWUoZmlsZVBhdGgpO1xuICBjb25zdCByYXdJZ25vcmVMaXN0ID0gKGF3YWl0IHJlYWRGaWxlKGlnbm9yZVBhdGgpKS5zcGxpdCgvW1xcclxcbl0vKTtcblxuICAvLyBcIkZpeFwiIHRoZSBwYXR0ZXJucyBpbiB0aGUgc2FtZSB3YXkgSlNIaW50IGRvZXNcbiAgY29uc3QgaWdub3JlTGlzdCA9IHJhd0lnbm9yZUxpc3QuZmlsdGVyKGxpbmUgPT4gISFsaW5lLnRyaW0oKSkubWFwKChwYXR0ZXJuKSA9PiB7XG4gICAgaWYgKHBhdHRlcm4uc3RhcnRzV2l0aCgnIScpKSB7XG4gICAgICByZXR1cm4gYCEke3BhdGgucmVzb2x2ZShmaWxlRGlyLCBwYXR0ZXJuLnN1YnN0cigxKS50cmltKCkpfWA7XG4gICAgfVxuICAgIHJldHVybiBwYXRoLmpvaW4oZmlsZURpciwgcGF0dGVybi50cmltKCkpO1xuICB9KTtcblxuICAvLyBDaGVjayB0aGUgbW9kaWZpZWQgcGF0dGVybnNcbiAgLy8gTk9URTogVGhpcyBpcyB3aGF0IEpTSGludCBhY3R1YWxseSBkb2VzLCBub3Qgd2hhdCB0aGUgZG9jdW1lbnRhdGlvbiBzYXlzXG4gIHJldHVybiBpZ25vcmVMaXN0LnNvbWUoKHBhdHRlcm4pID0+IHtcbiAgICAvLyBDaGVjayB0aGUgbW9kaWZpZWQgcGF0dGVybiBhZ2FpbnN0IHRoZSBwYXRoIHVzaW5nIG1pbmltYXRjaFxuICAgIGlmIChtaW5pbWF0Y2goZmlsZVBhdGgsIHBhdHRlcm4sIHsgbm9jYXNlOiB0cnVlIH0pKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICAvLyBDaGVjayBpZiBhIHBhdHRlcm4gbWF0Y2hlcyBmaWxlUGF0aCBleGFjdGx5XG4gICAgaWYgKHBhdGgucmVzb2x2ZShmaWxlUGF0aCkgPT09IHBhdHRlcm4pIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIC8vIENoZWNrIHVzaW5nIGB0ZXN0IC1kYCBmb3IgZGlyZWN0b3J5IGV4Y2x1c2lvbnNcbiAgICBpZiAoXG4gICAgICBzaGpzVGVzdCgnLWQnLCBmaWxlUGF0aClcbiAgICAgICYmIHBhdHRlcm4ubWF0Y2goL15bXi9cXFxcXSpbL1xcXFxdPyQvKVxuICAgICAgJiYgZmlsZVBhdGgubWF0Y2gobmV3IFJlZ0V4cChgXiR7cGF0dGVybn0uKmApKVxuICAgICkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgcmV0dXJuIGZhbHNlO1xuICB9KTtcbn07XG5cbmNvbnN0IGZpbGVFeGlzdHMgPSBhc3luYyBjaGVja1BhdGggPT4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgYWNjZXNzKGNoZWNrUGF0aCwgKGVycikgPT4ge1xuICAgIGlmIChlcnIpIHtcbiAgICAgIHJlc29sdmUoZmFsc2UpO1xuICAgIH1cbiAgICByZXNvbHZlKHRydWUpO1xuICB9KTtcbn0pO1xuXG5leHBvcnQgY29uc3QgaGFzSG9tZUNvbmZpZyA9IGFzeW5jICgpID0+IHtcbiAgaWYgKCFob21lQ29uZmlnUGF0aCkge1xuICAgIGhvbWVDb25maWdQYXRoID0gcGF0aC5qb2luKGhvbWVkaXIoKSwgJy5qc2hpbnRyYycpO1xuICB9XG4gIHJldHVybiBmaWxlRXhpc3RzKGhvbWVDb25maWdQYXRoKTtcbn07XG5cbmZ1bmN0aW9uIGdldFBhY2thZ2VNZXRhKCkge1xuICAvLyBOT1RFOiBUaGlzIGlzIHVzaW5nIGEgbm9uLXB1YmxpYyBwcm9wZXJ0eSBvZiB0aGUgUGFja2FnZSBvYmplY3RcbiAgLy8gVGhlIGFsdGVybmF0aXZlIHRvIHRoaXMgd291bGQgYmFzaWNhbGx5IG1lYW4gcmUtaW1wbGVtZW50aW5nIHRoZSBwYXJzaW5nXG4gIC8vIHRoYXQgQXRvbSBpcyBhbHJlYWR5IGRvaW5nIGFueXdheSwgYW5kIGFzIHRoaXMgaXMgdW5saWtlbHkgdG8gY2hhbmdlIHRoaXNcbiAgLy8gaXMgbGlrZWx5IHNhZmUgdG8gdXNlLlxuICByZXR1cm4gYXRvbS5wYWNrYWdlcy5nZXRMb2FkZWRQYWNrYWdlKCdsaW50ZXItanNoaW50JykubWV0YWRhdGE7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGdldEpTSGludFZlcnNpb24oY29uZmlnKSB7XG4gIGNvbnN0IGV4ZWNQYXRoID0gY29uZmlnLmV4ZWN1dGFibGVQYXRoICE9PSAnJyA/IGNvbmZpZy5leGVjdXRhYmxlUGF0aFxuICAgIDogcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uJywgJ25vZGVfbW9kdWxlcycsICdqc2hpbnQnLCAnYmluJywgJ2pzaGludCcpO1xuXG4gIGlmIChkZWJ1Z0NhY2hlLmhhcyhleGVjUGF0aCkpIHtcbiAgICByZXR1cm4gZGVidWdDYWNoZS5nZXQoZXhlY1BhdGgpO1xuICB9XG5cbiAgLy8gTk9URTogWWVzLCBganNoaW50IC0tdmVyc2lvbmAgZ2V0cyBvdXRwdXQgb24gU1RERVJSLi4uXG4gIGNvbnN0IGpzaGludFZlcnNpb24gPSBhd2FpdCBhdG9tbGludGVyLmV4ZWNOb2RlKFxuICAgIGV4ZWNQYXRoLFxuICAgIFsnLS12ZXJzaW9uJ10sXG4gICAgeyBzdHJlYW06ICdzdGRlcnInIH0sXG4gICk7XG4gIGRlYnVnQ2FjaGUuc2V0KGV4ZWNQYXRoLCBqc2hpbnRWZXJzaW9uKTtcbiAgcmV0dXJuIGpzaGludFZlcnNpb247XG59XG5cbmZ1bmN0aW9uIGdldEVkaXRvclNjb3BlcygpIHtcbiAgY29uc3QgdGV4dEVkaXRvciA9IGF0b20ud29ya3NwYWNlLmdldEFjdGl2ZVRleHRFZGl0b3IoKTtcbiAgbGV0IGVkaXRvclNjb3BlczogQXJyYXk8c3RyaW5nPjtcbiAgaWYgKGF0b20ud29ya3NwYWNlLmlzVGV4dEVkaXRvcih0ZXh0RWRpdG9yKSkge1xuICAgIGVkaXRvclNjb3BlcyA9IHRleHRFZGl0b3IuZ2V0TGFzdEN1cnNvcigpLmdldFNjb3BlRGVzY3JpcHRvcigpLmdldFNjb3Blc0FycmF5KCk7XG4gIH0gZWxzZSB7XG4gICAgLy8gU29tZWhvdyB0aGlzIGNhbiBiZSBjYWxsZWQgd2l0aCBubyBhY3RpdmUgVGV4dEVkaXRvciwgaW1wb3NzaWJsZSBJIGtub3cuLi5cbiAgICBlZGl0b3JTY29wZXMgPSBbJ3Vua25vd24nXTtcbiAgfVxuICByZXR1cm4gZWRpdG9yU2NvcGVzO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0RGVidWdJbmZvKCkge1xuICBjb25zdCBsaW50ZXJKU0hpbnRWZXJzaW9uID0gZ2V0UGFja2FnZU1ldGEoKS52ZXJzaW9uO1xuICBjb25zdCBjb25maWcgPSBhdG9tLmNvbmZpZy5nZXQoJ2xpbnRlci1qc2hpbnQnKTtcbiAgY29uc3QganNoaW50VmVyc2lvbiA9IGF3YWl0IGdldEpTSGludFZlcnNpb24oY29uZmlnKTtcbiAgY29uc3QgaG91cnNTaW5jZVJlc3RhcnQgPSBNYXRoLnJvdW5kKChwcm9jZXNzLnVwdGltZSgpIC8gMzYwMCkgKiAxMCkgLyAxMDtcbiAgY29uc3QgZWRpdG9yU2NvcGVzID0gZ2V0RWRpdG9yU2NvcGVzKCk7XG5cbiAgcmV0dXJuIHtcbiAgICBhdG9tVmVyc2lvbjogYXRvbS5nZXRWZXJzaW9uKCksXG4gICAgbGludGVySlNIaW50VmVyc2lvbixcbiAgICBsaW50ZXJKU0hpbnRDb25maWc6IGNvbmZpZyxcbiAgICBqc2hpbnRWZXJzaW9uLFxuICAgIGhvdXJzU2luY2VSZXN0YXJ0LFxuICAgIHBsYXRmb3JtOiBwcm9jZXNzLnBsYXRmb3JtLFxuICAgIGVkaXRvclNjb3BlcyxcbiAgfTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdlbmVyYXRlRGVidWdTdHJpbmcoKSB7XG4gIGNvbnN0IGRlYnVnID0gYXdhaXQgZ2V0RGVidWdJbmZvKCk7XG4gIGNvbnN0IGRldGFpbHMgPSBbXG4gICAgYEF0b20gdmVyc2lvbjogJHtkZWJ1Zy5hdG9tVmVyc2lvbn1gLFxuICAgIGBsaW50ZXItanNoaW50IHZlcnNpb246IHYke2RlYnVnLmxpbnRlckpTSGludFZlcnNpb259YCxcbiAgICBgSlNIaW50IHZlcnNpb246ICR7ZGVidWcuanNoaW50VmVyc2lvbn1gLFxuICAgIGBIb3VycyBzaW5jZSBsYXN0IEF0b20gcmVzdGFydDogJHtkZWJ1Zy5ob3Vyc1NpbmNlUmVzdGFydH1gLFxuICAgIGBQbGF0Zm9ybTogJHtkZWJ1Zy5wbGF0Zm9ybX1gLFxuICAgIGBDdXJyZW50IGZpbGUncyBzY29wZXM6ICR7SlNPTi5zdHJpbmdpZnkoZGVidWcuZWRpdG9yU2NvcGVzLCBudWxsLCAyKX1gLFxuICAgIGBsaW50ZXItanNoaW50IGNvbmZpZ3VyYXRpb246ICR7SlNPTi5zdHJpbmdpZnkoZGVidWcubGludGVySlNIaW50Q29uZmlnLCBudWxsLCAyKX1gLFxuICBdO1xuICByZXR1cm4gZGV0YWlscy5qb2luKCdcXG4nKTtcbn1cblxuLyoqXG4gKiBGaW5kcyB0aGUgb2xkZXN0IG9wZW4gaXNzdWUgb2YgdGhlIHNhbWUgdGl0bGUgaW4gdGhpcyBwcm9qZWN0J3MgcmVwb3NpdG9yeS5cbiAqIFJlc3VsdHMgYXJlIGNhY2hlZCBmb3IgMSBob3VyLlxuICogQHBhcmFtICB7c3RyaW5nfSBpc3N1ZVRpdGxlIFRoZSBpc3N1ZSB0aXRsZSB0byBzZWFyY2ggZm9yXG4gKiBAcmV0dXJuIHtzdHJpbmd8bnVsbH0gICAgICAgVGhlIFVSTCBvZiB0aGUgZm91bmQgaXNzdWUgb3IgbnVsbCBpZiBub25lIGlzIGZvdW5kLlxuICovXG5hc3luYyBmdW5jdGlvbiBmaW5kU2ltaWxhcklzc3VlKGlzc3VlVGl0bGUpIHtcbiAgaWYgKGRlYnVnQ2FjaGUuaGFzKGlzc3VlVGl0bGUpKSB7XG4gICAgY29uc3Qgb2xkUmVzdWx0ID0gZGVidWdDYWNoZS5nZXQoaXNzdWVUaXRsZSk7XG4gICAgaWYgKChuZXcgRGF0ZSgpLnZhbHVlT2YoKSkgPCBvbGRSZXN1bHQuZXhwaXJlcykge1xuICAgICAgcmV0dXJuIG9sZFJlc3VsdC51cmw7XG4gICAgfVxuICAgIGRlYnVnQ2FjaGUuZGVsZXRlKGlzc3VlVGl0bGUpO1xuICB9XG5cbiAgY29uc3Qgb25lSG91ciA9IDEwMDAgKiA2MCAqIDYwOyAvLyBtcyAqIHMgKiBtXG4gIGNvbnN0IHRlbk1pbnV0ZXMgPSAxMDAwICogNjAgKiAxMDsgLy8gbXMgKiBzICogbVxuICBjb25zdCByZXBvVXJsID0gZ2V0UGFja2FnZU1ldGEoKS5yZXBvc2l0b3J5LnVybDtcbiAgY29uc3QgcmVwbyA9IHJlcG9VcmwucmVwbGFjZSgvaHR0cHM/OlxcL1xcLyhcXGQrXFwuKT9naXRodWJcXC5jb21cXC8vZ2ksICcnKTtcbiAgY29uc3QgcXVlcnkgPSBlbmNvZGVVUklDb21wb25lbnQoYHJlcG86JHtyZXBvfSBpczpvcGVuIGluOnRpdGxlICR7aXNzdWVUaXRsZX1gKTtcbiAgY29uc3QgZ2l0aHViSGVhZGVycyA9IG5ldyBIZWFkZXJzKHtcbiAgICBhY2NlcHQ6ICdhcHBsaWNhdGlvbi92bmQuZ2l0aHViLnYzK2pzb24nLFxuICAgIGNvbnRlbnRUeXBlOiAnYXBwbGljYXRpb24vanNvbicsXG4gIH0pO1xuICBjb25zdCBxdWVyeVVybCA9IGBodHRwczovL2FwaS5naXRodWIuY29tL3NlYXJjaC9pc3N1ZXM/cT0ke3F1ZXJ5fSZzb3J0PWNyZWF0ZWQmb3JkZXI9YXNjYDtcblxuICBsZXQgdXJsID0gbnVsbDtcbiAgdHJ5IHtcbiAgICBjb25zdCByYXdSZXNwb25zZSA9IGF3YWl0IGZldGNoKHF1ZXJ5VXJsLCB7IGhlYWRlcnM6IGdpdGh1YkhlYWRlcnMgfSk7XG4gICAgaWYgKCFyYXdSZXNwb25zZS5vaykge1xuICAgICAgLy8gUXVlcnlpbmcgR2l0SHViIEFQSSBmYWlsZWQsIGRvbid0IHRyeSBhZ2FpbiBmb3IgMTAgbWludXRlcy5cbiAgICAgIGRlYnVnQ2FjaGUuc2V0KGlzc3VlVGl0bGUsIHtcbiAgICAgICAgZXhwaXJlczogKG5ldyBEYXRlKCkudmFsdWVPZigpKSArIHRlbk1pbnV0ZXMsXG4gICAgICAgIHVybCxcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGNvbnN0IGRhdGEgPSBhd2FpdCByYXdSZXNwb25zZS5qc29uKCk7XG4gICAgaWYgKChkYXRhICE9PSBudWxsID8gZGF0YS5pdGVtcyA6IG51bGwpICE9PSBudWxsKSB7XG4gICAgICBpZiAoQXJyYXkuaXNBcnJheShkYXRhLml0ZW1zKSAmJiBkYXRhLml0ZW1zLmxlbmd0aCA+IDApIHtcbiAgICAgICAgY29uc3QgaXNzdWUgPSBkYXRhLml0ZW1zWzBdO1xuICAgICAgICBpZiAoaXNzdWUudGl0bGUuaW5jbHVkZXMoaXNzdWVUaXRsZSkpIHtcbiAgICAgICAgICB1cmwgPSBgJHtyZXBvVXJsfS9pc3N1ZXMvJHtpc3N1ZS5udW1iZXJ9YDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfSBjYXRjaCAoZSkge1xuICAgIC8vIERvIG5vdGhpbmdcbiAgfVxuICBkZWJ1Z0NhY2hlLnNldChpc3N1ZVRpdGxlLCB7XG4gICAgZXhwaXJlczogKG5ldyBEYXRlKCkudmFsdWVPZigpKSArIG9uZUhvdXIsXG4gICAgdXJsLFxuICB9KTtcbiAgcmV0dXJuIHVybDtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdlbmVyYXRlSW52YWxpZFRyYWNlKFxuICBtc2dMaW5lOiBudW1iZXIsIG1zZ0NvbDogbnVtYmVyLCBmaWxlOiBzdHJpbmcsIHRleHRFZGl0b3I6IFRleHRFZGl0b3IsXG4gIGVycm9yOiBPYmplY3QsXG4pIHtcbiAgY29uc3QgZXJyTXNnUmFuZ2UgPSBgJHttc2dMaW5lICsgMX06JHttc2dDb2x9YDtcbiAgY29uc3QgcmFuZ2VUZXh0ID0gYFJlcXVlc3RlZCBwb2ludDogJHtlcnJNc2dSYW5nZX1gO1xuICBjb25zdCBwYWNrYWdlUmVwb1VybCA9IGdldFBhY2thZ2VNZXRhKCkucmVwb3NpdG9yeS51cmw7XG4gIGNvbnN0IGlzc3VlVVJMID0gYCR7cGFja2FnZVJlcG9Vcmx9L2lzc3Vlcy9uZXdgO1xuICBjb25zdCB0aXRsZVRleHQgPSBgSW52YWxpZCBwb3NpdGlvbiBnaXZlbiBieSAnJHtlcnJvci5jb2RlfSdgO1xuICBjb25zdCBpbnZhbGlkTWVzc2FnZSA9IHtcbiAgICBzZXZlcml0eTogJ2Vycm9yJyxcbiAgICBkZXNjcmlwdGlvbjogYE9yaWdpbmFsIG1lc3NhZ2U6ICR7ZXJyb3IuY29kZX0gLSAke2Vycm9yLnJlYXNvbn0gIFxcbiR7cmFuZ2VUZXh0fS5gLFxuICAgIGxvY2F0aW9uOiB7XG4gICAgICBmaWxlLFxuICAgICAgcG9zaXRpb246IGF0b21saW50ZXIuZ2VuZXJhdGVSYW5nZSh0ZXh0RWRpdG9yKSxcbiAgICB9LFxuICB9O1xuICBjb25zdCBzaW1pbGFySXNzdWVVcmwgPSBhd2FpdCBmaW5kU2ltaWxhcklzc3VlKHRpdGxlVGV4dCk7XG4gIGlmIChzaW1pbGFySXNzdWVVcmwgIT09IG51bGwpIHtcbiAgICBpbnZhbGlkTWVzc2FnZS5leGNlcnB0ID0gYCR7dGl0bGVUZXh0fS4gVGhpcyBoYXMgYWxyZWFkeSBiZWVuIHJlcG9ydGVkLCBzZWUgbWVzc2FnZSBsaW5rIWA7XG4gICAgaW52YWxpZE1lc3NhZ2UudXJsID0gc2ltaWxhcklzc3VlVXJsO1xuICAgIHJldHVybiBpbnZhbGlkTWVzc2FnZTtcbiAgfVxuXG4gIGNvbnN0IHRpdGxlID0gZW5jb2RlVVJJQ29tcG9uZW50KHRpdGxlVGV4dCk7XG4gIGNvbnN0IGJvZHkgPSBlbmNvZGVVUklDb21wb25lbnQoW1xuICAgICdKU0hpbnQgcmV0dXJuZWQgYSBwb2ludCB0aGF0IGRpZCBub3QgZXhpc3QgaW4gdGhlIGRvY3VtZW50IGJlaW5nIGVkaXRlZC4nLFxuICAgIGBSdWxlOiBcXGAke2Vycm9yLmNvZGV9XFxgYCxcbiAgICByYW5nZVRleHQsXG4gICAgJycsICcnLFxuICAgICc8IS0tIElmIGF0IGFsbCBwb3NzaWJsZSwgcGxlYXNlIGluY2x1ZGUgY29kZSB0byByZXByb2R1Y2UgdGhpcyBpc3N1ZSEgLS0+JyxcbiAgICAnJywgJycsXG4gICAgJ0RlYnVnIGluZm9ybWF0aW9uOicsXG4gICAgJ2BgYCcsXG4gICAgYXdhaXQgZ2VuZXJhdGVEZWJ1Z1N0cmluZygpLFxuICAgICdgYGAnLFxuICBdLmpvaW4oJ1xcbicpKTtcbiAgY29uc3QgbmV3SXNzdWVVUkwgPSBgJHtpc3N1ZVVSTH0/dGl0bGU9JHt0aXRsZX0mYm9keT0ke2JvZHl9YDtcbiAgaW52YWxpZE1lc3NhZ2UuZXhjZXJwdCA9IGAke3RpdGxlVGV4dH0uIFBsZWFzZSByZXBvcnQgdGhpcyB1c2luZyB0aGUgbWVzc2FnZSBsaW5rIWA7XG4gIGludmFsaWRNZXNzYWdlLnVybCA9IG5ld0lzc3VlVVJMO1xuICByZXR1cm4gaW52YWxpZE1lc3NhZ2U7XG59XG4iXX0=