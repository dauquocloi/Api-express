"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnterminatedForLoopError = exports.IncompleteConditionalStatementError = exports.TemplateParseError = exports.InternalError = exports.ImageError = exports.CommandExecutionError = exports.InvalidCommandError = exports.CommandSyntaxError = exports.ObjectCommandResultError = exports.NullishCommandResultError = exports.isError = void 0;
function isError(err) {
    return (err instanceof Error ||
        (typeof err === 'object' && !!err && 'name' in err && 'message' in err));
}
exports.isError = isError;
/**
 * Thrown when `rejectNullish` is set to `true` and a command returns `null` or `undefined`.
 */
var NullishCommandResultError = /** @class */ (function (_super) {
    __extends(NullishCommandResultError, _super);
    function NullishCommandResultError(command) {
        var _this = _super.call(this, "Result of command ".concat(command, " is null or undefined and rejectNullish is set")) || this;
        Object.setPrototypeOf(_this, NullishCommandResultError.prototype);
        _this.command = command;
        return _this;
    }
    return NullishCommandResultError;
}(Error));
exports.NullishCommandResultError = NullishCommandResultError;
/**
 * Thrown when the result of an `INS` command is an `Object`. This ensures you don't accidentally put `'[object Object]'` in your report.
 */
var ObjectCommandResultError = /** @class */ (function (_super) {
    __extends(ObjectCommandResultError, _super);
    function ObjectCommandResultError(command, result) {
        var _this = _super.call(this, "Result of command '".concat(command, "' is an object")) || this;
        Object.setPrototypeOf(_this, ObjectCommandResultError.prototype);
        _this.command = command;
        _this.result = result;
        return _this;
    }
    return ObjectCommandResultError;
}(Error));
exports.ObjectCommandResultError = ObjectCommandResultError;
var CommandSyntaxError = /** @class */ (function (_super) {
    __extends(CommandSyntaxError, _super);
    function CommandSyntaxError(command) {
        var _this = _super.call(this, "Invalid command syntax: ".concat(command)) || this;
        Object.setPrototypeOf(_this, CommandSyntaxError.prototype);
        _this.command = command;
        return _this;
    }
    return CommandSyntaxError;
}(Error));
exports.CommandSyntaxError = CommandSyntaxError;
var InvalidCommandError = /** @class */ (function (_super) {
    __extends(InvalidCommandError, _super);
    function InvalidCommandError(msg, command) {
        var _this = _super.call(this, "".concat(msg, ": ").concat(command)) || this;
        Object.setPrototypeOf(_this, InvalidCommandError.prototype);
        _this.command = command;
        return _this;
    }
    return InvalidCommandError;
}(Error));
exports.InvalidCommandError = InvalidCommandError;
var CommandExecutionError = /** @class */ (function (_super) {
    __extends(CommandExecutionError, _super);
    function CommandExecutionError(err, command) {
        var _this = _super.call(this, "Error executing command '".concat(command, "': ").concat(err.name, ": ").concat(err.message)) || this;
        Object.setPrototypeOf(_this, CommandExecutionError.prototype);
        _this.command = command;
        _this.err = err;
        return _this;
    }
    return CommandExecutionError;
}(Error));
exports.CommandExecutionError = CommandExecutionError;
var ImageError = /** @class */ (function (_super) {
    __extends(ImageError, _super);
    function ImageError() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return ImageError;
}(CommandExecutionError));
exports.ImageError = ImageError;
var InternalError = /** @class */ (function (_super) {
    __extends(InternalError, _super);
    function InternalError(msg) {
        return _super.call(this, "INTERNAL ERROR: ".concat(msg)) || this;
    }
    return InternalError;
}(Error));
exports.InternalError = InternalError;
var TemplateParseError = /** @class */ (function (_super) {
    __extends(TemplateParseError, _super);
    function TemplateParseError() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return TemplateParseError;
}(Error));
exports.TemplateParseError = TemplateParseError;
var IncompleteConditionalStatementError = /** @class */ (function (_super) {
    __extends(IncompleteConditionalStatementError, _super);
    function IncompleteConditionalStatementError() {
        return _super.call(this, 'Incomplete IF/END-IF statement. Make sure each IF-statement has a corresponding END-IF command.') || this;
    }
    return IncompleteConditionalStatementError;
}(Error));
exports.IncompleteConditionalStatementError = IncompleteConditionalStatementError;
var UnterminatedForLoopError = /** @class */ (function (_super) {
    __extends(UnterminatedForLoopError, _super);
    function UnterminatedForLoopError(loop) {
        return _super.call(this, "Unterminated FOR-loop ('FOR ".concat(loop.varName, "'). Make sure each FOR loop has a corresponding END-FOR command.")) || this;
    }
    return UnterminatedForLoopError;
}(Error));
exports.UnterminatedForLoopError = UnterminatedForLoopError;
