const SimpleCommand = require('./simple_command');

module.exports = class SubCommand extends SimpleCommand {
	constructor(name, description, args, usage) {
		super(name, description, args, usage);
	}

	execute(message, args) {
		if (
			this.args.includes(args.length) ||
			args.length > Math.max.apply(Math, this.args)
		) {
			this.execute_internal(message, args);
		}
	}

	execute_internal(message, args) {}
};
