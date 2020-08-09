const {
	response_invalid_argument_count,
	response_proper_command,
} = require('../../localization.json');

const { prefix } = require('../../config.json');

module.exports = class SimpleCommand {
	constructor(name, description, args, usage) {
		this.name = name;
		this.description = description;
		this.args = args;
		this.usage = usage;
	}

	execute(message, args) {}

	matchArguments(args) {
		return (
			this.args.includes(args.length) ||
			args.length > Math.max.apply(Math, this.args)
		);
	}

	getInvalidArgumentsReply() {
		return `${response_invalid_argument_count}\n${response_proper_command} \`${prefix}${command.name} ${command.usage}\``;
	}
};
