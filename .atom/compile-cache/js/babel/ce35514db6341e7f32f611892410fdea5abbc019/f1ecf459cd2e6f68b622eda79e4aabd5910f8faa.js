Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.shouldTriggerLinter = shouldTriggerLinter;
exports.getEditorCursorScopes = getEditorCursorScopes;
exports.isPathIgnored = isPathIgnored;
exports.subscriptiveObserve = subscriptiveObserve;
exports.messageKey = messageKey;
exports.normalizeMessages = normalizeMessages;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _lodashUniq = require('lodash/uniq');

var _lodashUniq2 = _interopRequireDefault(_lodashUniq);

var _atom = require('atom');

var $version = '__$sb_linter_version';
exports.$version = $version;
var $activated = '__$sb_linter_activated';
exports.$activated = $activated;
var $requestLatest = '__$sb_linter_request_latest';
exports.$requestLatest = $requestLatest;
var $requestLastReceived = '__$sb_linter_request_last_received';

exports.$requestLastReceived = $requestLastReceived;

function shouldTriggerLinter(linter, wasTriggeredOnChange, scopes) {
  if (wasTriggeredOnChange && !linter.lintsOnChange) {
    return false;
  }
  return scopes.some(function (scope) {
    return linter.grammarScopes.includes(scope);
  });
}

function getEditorCursorScopes(textEditor) {
  return (0, _lodashUniq2['default'])(textEditor.getCursors().reduce(function (scopes, cursor) {
    return scopes.concat(cursor.getScopeDescriptor().getScopesArray());
  }, ['*']));
}

var minimatch = undefined;

function isPathIgnored(filePath, ignoredGlob, ignoredVCS) {
  if (!filePath) {
    return true;
  }

  if (ignoredVCS) {
    var repository = null;
    var projectPaths = atom.project.getPaths();
    for (var i = 0, _length2 = projectPaths.length; i < _length2; ++i) {
      var projectPath = projectPaths[i];
      if (filePath.indexOf(projectPath) === 0) {
        repository = atom.project.getRepositories()[i];
        break;
      }
    }
    if (repository && repository.isPathIgnored(filePath)) {
      return true;
    }
  }
  var normalizedFilePath = process.platform === 'win32' ? filePath.replace(/\\/g, '/') : filePath;
  if (!minimatch) {
    minimatch = require('minimatch');
  }
  return minimatch(normalizedFilePath, ignoredGlob);
}

function subscriptiveObserve(object, eventName, callback) {
  var subscription = null;
  var eventSubscription = object.observe(eventName, function (props) {
    if (subscription) {
      subscription.dispose();
    }
    subscription = callback.call(this, props);
  });

  return new _atom.Disposable(function () {
    eventSubscription.dispose();
    if (subscription) {
      subscription.dispose();
    }
  });
}

function messageKey(message) {
  var reference = message.reference;

  return ['$LINTER:' + message.linterName, '$LOCATION:' + message.location.file + '$' + message.location.position.start.row + '$' + message.location.position.start.column + '$' + message.location.position.end.row + '$' + message.location.position.end.column, reference ? '$REFERENCE:' + reference.file + '$' + (reference.position ? reference.position.row + '$' + reference.position.column : '') : '$REFERENCE:null', '$EXCERPT:' + message.excerpt, '$SEVERITY:' + message.severity, message.icon ? '$ICON:' + message.icon : '$ICON:null', message.url ? '$URL:' + message.url : '$URL:null', typeof message.description === 'string' ? '$DESCRIPTION:' + message.description : '$DESCRIPTION:null'].join('');
}

function normalizeMessages(linterName, messages) {
  for (var i = 0, _length3 = messages.length; i < _length3; ++i) {
    var message = messages[i];
    var reference = message.reference;

    if (Array.isArray(message.location.position)) {
      message.location.position = _atom.Range.fromObject(message.location.position);
    }
    if (reference && Array.isArray(reference.position)) {
      reference.position = _atom.Point.fromObject(reference.position);
    }
    if (message.solutions && message.solutions.length) {
      for (var j = 0, _length = message.solutions.length, solution = undefined; j < _length; j++) {
        solution = message.solutions[j];
        if (Array.isArray(solution.position)) {
          solution.position = _atom.Range.fromObject(solution.position);
        }
      }
    }
    message.version = 2;
    if (!message.linterName) {
      message.linterName = linterName;
    }
    message.key = messageKey(message);
  }
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9heWFhbmtoYW4vLmF0b20vcGFja2FnZXMvbGludGVyL2xpYi9oZWxwZXJzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OzswQkFFd0IsYUFBYTs7OztvQkFDSSxNQUFNOztBQUl4QyxJQUFNLFFBQVEsR0FBRyxzQkFBc0IsQ0FBQTs7QUFDdkMsSUFBTSxVQUFVLEdBQUcsd0JBQXdCLENBQUE7O0FBQzNDLElBQU0sY0FBYyxHQUFHLDZCQUE2QixDQUFBOztBQUNwRCxJQUFNLG9CQUFvQixHQUFHLG9DQUFvQyxDQUFBOzs7O0FBRWpFLFNBQVMsbUJBQW1CLENBQUMsTUFBYyxFQUFFLG9CQUE2QixFQUFFLE1BQXFCLEVBQVc7QUFDakgsTUFBSSxvQkFBb0IsSUFBSSxDQUFDLE1BQU0sQ0FBQyxhQUFhLEVBQUU7QUFDakQsV0FBTyxLQUFLLENBQUE7R0FDYjtBQUNELFNBQU8sTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFTLEtBQUssRUFBRTtBQUNqQyxXQUFPLE1BQU0sQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFBO0dBQzVDLENBQUMsQ0FBQTtDQUNIOztBQUVNLFNBQVMscUJBQXFCLENBQUMsVUFBc0IsRUFBaUI7QUFDM0UsU0FBTyw2QkFDTCxVQUFVLENBQUMsVUFBVSxFQUFFLENBQUMsTUFBTSxDQUFDLFVBQUMsTUFBTSxFQUFFLE1BQU07V0FBSyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLGNBQWMsRUFBRSxDQUFDO0dBQUEsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQ3ZILENBQUE7Q0FDRjs7QUFFRCxJQUFJLFNBQVMsWUFBQSxDQUFBOztBQUNOLFNBQVMsYUFBYSxDQUFDLFFBQWlCLEVBQUUsV0FBbUIsRUFBRSxVQUFtQixFQUFXO0FBQ2xHLE1BQUksQ0FBQyxRQUFRLEVBQUU7QUFDYixXQUFPLElBQUksQ0FBQTtHQUNaOztBQUVELE1BQUksVUFB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UUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1NBQ3hEO09BQ0Y7S0FDRjtBQUNELFdBQU8sQ0FBQyxPQUFPLEdBQUcsQ0FBQyxDQUFBO0FBQ25CLFFBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFO0FBQ3ZCLGFBQU8sQ0FBQyxVQUFVLEdBQUcsVUFBVSxDQUFBO0tBQ2hDO0FBQ0QsV0FBTyxDQUFDLEdBQUcsR0FBRyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUE7R0FDbEM7Q0FDRiIsImZpbGUiOiIvVXNlcnMvYXlhYW5raGFuLy5hdG9tL3BhY2thZ2VzL2xpbnRlci9saWIvaGVscGVycy5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qIEBmbG93ICovXG5cbmltcG9ydCBhcnJheVVuaXF1ZSBmcm9tICdsb2Rhc2gvdW5pcSdcbmltcG9ydCB7IERpc3Bvc2FibGUsIFJhbmdlLCBQb2ludCB9IGZyb20gJ2F0b20nXG5pbXBvcnQgdHlwZSB7IFRleHRFZGl0b3IgfSBmcm9tICdhdG9tJ1xuaW1wb3J0IHR5cGUgeyBMaW50ZXIsIE1lc3NhZ2UgfSBmcm9tICcuL3R5cGVzJ1xuXG5leHBvcnQgY29uc3QgJHZlcnNpb24gPSAnX18kc2JfbGludGVyX3ZlcnNpb24nXG5leHBvcnQgY29uc3QgJGFjdGl2YXRlZCA9ICdfXyRzYl9saW50ZXJfYWN0aXZhdGVkJ1xuZXhwb3J0IGNvbnN0ICRyZXF1ZXN0TGF0ZXN0ID0gJ19fJHNiX2xpbnRlcl9yZXF1ZXN0X2xhdGVzdCdcbmV4cG9ydCBjb25zdCAkcmVxdWVzdExhc3RSZWNlaXZlZCA9ICdfXyRzYl9saW50ZXJfcmVxdWVzdF9sYXN0X3JlY2VpdmVkJ1xuXG5leHBvcnQgZnVuY3Rpb24gc2hvdWxkVHJpZ2dlckxpbnRlcihsaW50ZXI6IExpbnRlciwgd2FzVHJpZ2dlcmVkT25DaGFuZ2U6IGJvb2xlYW4sIHNjb3BlczogQXJyYXk8c3RyaW5nPik6IGJvb2xlYW4ge1xuICBpZiAod2FzVHJpZ2dlcmVkT25DaGFuZ2UgJiYgIWxpbnRlci5saW50c09uQ2hhbmdlKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cbiAgcmV0dXJuIHNjb3Blcy5zb21lKGZ1bmN0aW9uKHNjb3BlKSB7XG4gICAgcmV0dXJuIGxpbnRlci5ncmFtbWFyU2NvcGVzLmluY2x1ZGVzKHNjb3BlKVxuICB9KVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0RWRpdG9yQ3Vyc29yU2NvcGVzKHRleHRFZGl0b3I6IFRleHRFZGl0b3IpOiBBcnJheTxzdHJpbmc+IHtcbiAgcmV0dXJuIGFycmF5VW5pcXVlKFxuICAgIHRleHRFZGl0b3IuZ2V0Q3Vyc29ycygpLnJlZHVjZSgoc2NvcGVzLCBjdXJzb3IpID0+IHNjb3Blcy5jb25jYXQoY3Vyc29yLmdldFNjb3BlRGVzY3JpcHRvcigpLmdldFNjb3Blc0FycmF5KCkpLCBbJyonXSksXG4gIClcbn1cblxubGV0IG1pbmltYXRjaFxuZXhwb3J0IGZ1bmN0aW9uIGlzUGF0aElnbm9yZWQoZmlsZVBhdGg6ID9zdHJpbmcsIGlnbm9yZWRHbG9iOiBzdHJpbmcsIGlnbm9yZWRWQ1M6IGJvb2xlYW4pOiBib29sZWFuIHtcbiAgaWYgKCFmaWxlUGF0aCkge1xuICAgIHJldHVybiB0cnVlXG4gIH1cblxuICBpZiAoaWdub3JlZFZDUykge1xuICAgIGxldCByZXBvc2l0b3J5ID0gbnVsbFxuICAgIGNvbnN0IHByb2plY3RQYXRocyA9IGF0b20ucHJvamVjdC5nZXRQYXRocygpXG4gICAgZm9yIChsZXQgaSA9IDAsIHsgbGVuZ3RoIH0gPSBwcm9qZWN0UGF0aHM7IGkgPCBsZW5ndGg7ICsraSkge1xuICAgICAgY29uc3QgcHJvamVjdFBhdGggPSBwcm9qZWN0UGF0aHNbaV1cbiAgICAgIGlmIChmaWxlUGF0aC5pbmRleE9mKHByb2plY3RQYXRoKSA9PT0gMCkge1xuICAgICAgICByZXBvc2l0b3J5ID0gYXRvbS5wcm9qZWN0LmdldFJlcG9zaXRvcmllcygpW2ldXG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgfVxuICAgIGlmIChyZXBvc2l0b3J5ICYmIHJlcG9zaXRvcnkuaXNQYXRoSWdub3JlZChmaWxlUGF0aCkpIHtcbiAgICAgIHJldHVybiB0cnVlXG4gICAgfVxuICB9XG4gIGNvbnN0IG5vcm1hbGl6ZWRGaWxlUGF0aCA9IHByb2Nlc3MucGxhdGZvcm0gPT09ICd3aW4zMicgPyBmaWxlUGF0aC5yZXBsYWNlKC9cXFxcL2csICcvJykgOiBmaWxlUGF0aFxuICBpZiAoIW1pbmltYXRjaCkge1xuICAgIG1pbmltYXRjaCA9IHJlcXVpcmUoJ21pbmltYXRjaCcpXG4gIH1cbiAgcmV0dXJuIG1pbmltYXRjaChub3JtYWxpemVkRmlsZVBhdGgsIGlnbm9yZWRHbG9iKVxufVxuXG5leHBvcnQgZnVuY3Rpb24gc3Vic2NyaXB0aXZlT2JzZXJ2ZShvYmplY3Q6IE9iamVjdCwgZXZlbnROYW1lOiBzdHJpbmcsIGNhbGxiYWNrOiBGdW5jdGlvbik6IERpc3Bvc2FibGUge1xuICBsZXQgc3Vic2NyaXB0aW9uID0gbnVsbFxuICBjb25zdCBldmVudFN1YnNjcmlwdGlvbiA9IG9iamVjdC5vYnNlcnZlKGV2ZW50TmFtZSwgZnVuY3Rpb24ocHJvcHMpIHtcbiAgICBpZiAoc3Vic2NyaXB0aW9uKSB7XG4gICAgICBzdWJzY3JpcHRpb24uZGlzcG9zZSgpXG4gICAgfVxuICAgIHN1YnNjcmlwdGlvbiA9IGNhbGxiYWNrLmNhbGwodGhpcywgcHJvcHMpXG4gIH0pXG5cbiAgcmV0dXJuIG5ldyBEaXNwb3NhYmxlKGZ1bmN0aW9uKCkge1xuICAgIGV2ZW50U3Vic2NyaXB0aW9uLmRpc3Bvc2UoKVxuICAgIGlmIChzdWJzY3JpcHRpb24pIHtcbiAgICAgIHN1YnNjcmlwdGlvbi5kaXNwb3NlKClcbiAgICB9XG4gIH0pXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBtZXNzYWdlS2V5KG1lc3NhZ2U6IE1lc3NhZ2UpIHtcbiAgY29uc3QgeyByZWZlcmVuY2UgfSA9IG1lc3NhZ2VcbiAgcmV0dXJuIFtcbiAgICBgJExJTlRFUjoke21lc3NhZ2UubGludGVyTmFtZX1gLFxuICAgIGAkTE9DQVRJT046JHttZXNzYWdlLmxvY2F0aW9uLmZpbGV9JCR7bWVzc2FnZS5sb2NhdGlvbi5wb3NpdGlvbi5zdGFydC5yb3d9JCR7bWVzc2FnZS5sb2NhdGlvbi5wb3NpdGlvbi5zdGFydC5jb2x1bW59JCR7XG4gICAgICBtZXNzYWdlLmxvY2F0aW9uLnBvc2l0aW9uLmVuZC5yb3dcbiAgICB9JCR7bWVzc2FnZS5sb2NhdGlvbi5wb3NpdGlvbi5lbmQuY29sdW1ufWAsXG4gICAgcmVmZXJlbmNlXG4gICAgICA/IGAkUkVGRVJFTkNFOiR7cmVmZXJlbmNlLmZpbGV9JCR7cmVmZXJlbmNlLnBvc2l0aW9uID8gYCR7cmVmZXJlbmNlLnBvc2l0aW9uLnJvd30kJHtyZWZlcmVuY2UucG9zaXRpb24uY29sdW1ufWAgOiAnJ31gXG4gICAgICA6ICckUkVGRVJFTkNFOm51bGwnLFxuICAgIGAkRVhDRVJQVDoke21lc3NhZ2UuZXhjZXJwdH1gLFxuICAgIGAkU0VWRVJJVFk6JHttZXNzYWdlLnNldmVyaXR5fWAsXG4gICAgbWVzc2FnZS5pY29uID8gYCRJQ09OOiR7bWVzc2FnZS5pY29ufWAgOiAnJElDT046bnVsbCcsXG4gICAgbWVzc2FnZS51cmwgPyBgJFVSTDoke21lc3NhZ2UudXJsfWAgOiAnJFVSTDpudWxsJyxcbiAgICB0eXBlb2YgbWVzc2FnZS5kZXNjcmlwdGlvbiA9PT0gJ3N0cmluZycgPyBgJERFU0NSSVBUSU9OOiR7bWVzc2FnZS5kZXNjcmlwdGlvbn1gIDogJyRERVNDUklQVElPTjpudWxsJyxcbiAgXS5qb2luKCcnKVxufVxuXG5leHBvcnQgZnVuY3Rpb24gbm9ybWFsaXplTWVzc2FnZXMobGludGVyTmFtZTogc3RyaW5nLCBtZXNzYWdlczogQXJyYXk8TWVzc2FnZT4pIHtcbiAgZm9yIChsZXQgaSA9IDAsIHsgbGVuZ3RoIH0gPSBtZXNzYWdlczsgaSA8IGxlbmd0aDsgKytpKSB7XG4gICAgY29uc3QgbWVzc2FnZSA9IG1lc3NhZ2VzW2ldXG4gICAgY29uc3QgeyByZWZlcmVuY2UgfSA9IG1lc3NhZ2VcbiAgICBpZiAoQXJyYXkuaXNBcnJheShtZXNzYWdlLmxvY2F0aW9uLnBvc2l0aW9uKSkge1xuICAgICAgbWVzc2FnZS5sb2NhdGlvbi5wb3NpdGlvbiA9IFJhbmdlLmZyb21PYmplY3QobWVzc2FnZS5sb2NhdGlvbi5wb3NpdGlvbilcbiAgICB9XG4gICAgaWYgKHJlZmVyZW5jZSAmJiBBcnJheS5pc0FycmF5KHJlZmVyZW5jZS5wb3NpdGlvbikpIHtcbiAgICAgIHJlZmVyZW5jZS5wb3NpdGlvbiA9IFBvaW50LmZyb21PYmplY3QocmVmZXJlbmNlLnBvc2l0aW9uKVxuICAgIH1cbiAgICBpZiAobWVzc2FnZS5zb2x1dGlvbnMgJiYgbWVzc2FnZS5zb2x1dGlvbnMubGVuZ3RoKSB7XG4gICAgICBmb3IgKGxldCBqID0gMCwgX2xlbmd0aCA9IG1lc3NhZ2Uuc29sdXRpb25zLmxlbmd0aCwgc29sdXRpb247IGogPCBfbGVuZ3RoOyBqKyspIHtcbiAgICAgICAgc29sdXRpb24gPSBtZXNzYWdlLnNvbHV0aW9uc1tqXVxuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShzb2x1dGlvbi5wb3NpdGlvbikpIHtcbiAgICAgICAgICBzb2x1dGlvbi5wb3NpdGlvbiA9IFJhbmdlLmZyb21PYmplY3Qoc29sdXRpb24ucG9zaXRpb24pXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgbWVzc2FnZS52ZXJzaW9uID0gMlxuICAgIGlmICghbWVzc2FnZS5saW50ZXJOYW1lKSB7XG4gICAgICBtZXNzYWdlLmxpbnRlck5hbWUgPSBsaW50ZXJOYW1lXG4gICAgfVxuICAgIG1lc3NhZ2Uua2V5ID0gbWVzc2FnZUtleShtZXNzYWdlKVxuICB9XG59XG4iXX0=