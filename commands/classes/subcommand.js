const SimpleCommand = require('./simple_command');

module.exports = class SubCommand extends SimpleCommand {
	constructor(name, description, args, usage) {
		super(name, description, args, usage);
	}

	execute(message, args) {
		if (this.matchArguments(args)) {
			this.execute_internal(message, args);
		} else {
			message.reply(this.getInvalidArgumentsReply());
		}
	}

	execute_internal(message, args) {}
};
