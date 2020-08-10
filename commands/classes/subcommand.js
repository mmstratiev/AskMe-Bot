const SimpleCommand = require('./simple_command');

module.exports = class SubCommand extends SimpleCommand {
	constructor(name, description, args = [], usage = [], permissions = []) {
		super(name, description, args, usage, permissions);
	}

	execute(message, args) {
		SimpleCommand.prototype.execute(message, args);
		if (this.matchPermissions(message.member.permissions)) {
			if (this.matchArguments(args)) {
				this.execute_internal(message, args);
			} else {
				message.reply(this.getInvalidArgumentsReply());
			}
		} else {
			message.reply(this.getInvalidPermissionsReply());
		}
	}

	execute_internal(message, args) {}
};
