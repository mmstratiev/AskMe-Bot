const SimpleCommand = require('./simple_command');

module.exports = class SubCommand extends SimpleCommand {
	constructor(name, description, args, usage) {
		super(name, description, args, usage);
	}
};
